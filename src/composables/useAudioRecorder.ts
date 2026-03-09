import { useCallback, useEffect, useRef, useState } from "react";

const MIME_CANDIDATES = [
	"audio/webm;codecs=opus",
	"audio/webm",
	"audio/ogg;codecs=opus",
	"audio/mp4",
];
const STORAGE_KEY_DEVICE = "ncku.voice.micDeviceId";
const STORAGE_KEY_GAIN = "ncku.voice.micGain";
const isIOSDevice = () =>
	typeof navigator !== "undefined" &&
	/iP(ad|hone|pod|one|touch)|iPad|iPhone|iPod/i.test(
		navigator.userAgent || navigator.platform || "",
	);

export type RecorderState = "idle" | "recording" | "error";

export type RecordedClip = {
	blob: Blob;
	mimeType: string;
	durationMs: number;
	maxRms: number;
	maxPeak: number;
};

type StopResolver = (clip: RecordedClip | null) => void;

const pickMimeType = () => {
	if (typeof MediaRecorder === "undefined") {
		return "";
	}
	return (
		MIME_CANDIDATES.find((candidate) =>
			MediaRecorder.isTypeSupported(candidate),
		) ?? ""
	);
};

export const useAudioRecorder = () => {
	const keepMicAlive = isIOSDevice();
	const recorderRef = useRef<MediaRecorder | null>(null);
	const sourceStreamRef = useRef<MediaStream | null>(null);
	const outputStreamRef = useRef<MediaStream | null>(null);
	const persistentInputStreamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);
	const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
	const chunksRef = useRef<BlobPart[]>([]);
	const stopResolverRef = useRef<StopResolver | null>(null);
	const startedAtRef = useRef<number>(0);
	const levelLoopRef = useRef<number>(0);
	const maxRmsRef = useRef(0);
	const maxPeakRef = useRef(0);

	const [state, setState] = useState<RecorderState>("idle");
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [mimeType, setMimeType] = useState("audio/webm");
	const [selectedDeviceId, setSelectedDeviceId] = useState("");
	const [micGain, setMicGain] = useState(1);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const storedDevice = window.localStorage.getItem(STORAGE_KEY_DEVICE);
		const storedGain = window.localStorage.getItem(STORAGE_KEY_GAIN);
		if (storedDevice) {
			setSelectedDeviceId(storedDevice);
		}
		if (storedGain) {
			const parsed = Number(storedGain);
			if (!Number.isNaN(parsed) && parsed >= 0.5 && parsed <= 3) {
				setMicGain(parsed);
			}
		}
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		if (selectedDeviceId) {
			window.localStorage.setItem(STORAGE_KEY_DEVICE, selectedDeviceId);
		} else {
			window.localStorage.removeItem(STORAGE_KEY_DEVICE);
		}
	}, [selectedDeviceId]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		window.localStorage.setItem(STORAGE_KEY_GAIN, micGain.toFixed(2));
	}, [micGain]);

	const stopTracks = useCallback((preservePersistentInput = false) => {
		if (sourceStreamRef.current) {
			const shouldStopSource =
				!preservePersistentInput ||
				sourceStreamRef.current !== persistentInputStreamRef.current;
			if (shouldStopSource) {
				for (const track of sourceStreamRef.current.getTracks()) {
					track.stop();
				}
			}
		}
		if (outputStreamRef.current) {
			for (const track of outputStreamRef.current.getTracks()) {
				track.stop();
			}
		}

		sourceStreamRef.current = null;
		outputStreamRef.current = null;
		gainNodeRef.current = null;
		destinationRef.current = null;

		void audioContextRef.current?.close();
		audioContextRef.current = null;
		setStream(null);
	}, []);

	const getInputStream = useCallback(async () => {
		const constraints: MediaStreamConstraints = selectedDeviceId
			? { audio: { deviceId: { exact: selectedDeviceId } } }
			: { audio: true };

		if (!keepMicAlive) {
			return await navigator.mediaDevices.getUserMedia(constraints);
		}

		const persistent = persistentInputStreamRef.current;
		if (persistent) {
			const activeTrack = persistent.getAudioTracks()[0];
			const isLive = activeTrack?.readyState === "live";
			const currentDeviceId = activeTrack?.getSettings().deviceId ?? "";
			const sameDevice =
				!selectedDeviceId ||
				!currentDeviceId ||
				currentDeviceId === selectedDeviceId;
			if (isLive && sameDevice) {
				return persistent;
			}
			for (const track of persistent.getTracks()) {
				track.stop();
			}
			persistentInputStreamRef.current = null;
		}

		const stream = await navigator.mediaDevices.getUserMedia(constraints);
		persistentInputStreamRef.current = stream;
		return stream;
	}, [keepMicAlive, selectedDeviceId]);

	const startRecording = useCallback(async () => {
		if (state === "recording") {
			return false;
		}

		setError(null);
		try {
			const userStream = await getInputStream();
			const selectedMimeType = pickMimeType();

			const audioContext = new AudioContext();
			const source = audioContext.createMediaStreamSource(userStream);
			const gainNode = audioContext.createGain();
			const destination = audioContext.createMediaStreamDestination();
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 1024;
			analyser.smoothingTimeConstant = 0.82;

			gainNode.gain.value = micGain;
			source.connect(gainNode);
			gainNode.connect(analyser);
			gainNode.connect(destination);
			maxRmsRef.current = 0;
			maxPeakRef.current = 0;

			const waveform = new Uint8Array(analyser.fftSize);
			const measureLevel = () => {
				analyser.getByteTimeDomainData(waveform);
				let rms = 0;
				let peak = 0;
				for (const sample of waveform) {
					const normalized = (sample - 128) / 128;
					rms += normalized * normalized;
					peak = Math.max(peak, Math.abs(normalized));
				}
				rms = Math.sqrt(rms / waveform.length);
				maxRmsRef.current = Math.max(maxRmsRef.current, rms);
				maxPeakRef.current = Math.max(maxPeakRef.current, peak);
				levelLoopRef.current = requestAnimationFrame(measureLevel);
			};
			levelLoopRef.current = requestAnimationFrame(measureLevel);

			const recorder = selectedMimeType
				? new MediaRecorder(destination.stream, { mimeType: selectedMimeType })
				: new MediaRecorder(destination.stream);

			chunksRef.current = [];
			recorderRef.current = recorder;
			sourceStreamRef.current = userStream;
			outputStreamRef.current = destination.stream;
			audioContextRef.current = audioContext;
			gainNodeRef.current = gainNode;
			destinationRef.current = destination;
			setStream(destination.stream);
			setMimeType(selectedMimeType || recorder.mimeType || "audio/webm");

			recorder.ondataavailable = (event: BlobEvent) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};

			recorder.onstop = () => {
				const blob = new Blob(chunksRef.current, {
					type: recorder.mimeType || "audio/webm",
				});
				const durationMs =
					startedAtRef.current > 0
						? Math.max(0, Date.now() - startedAtRef.current)
						: 0;
				cancelAnimationFrame(levelLoopRef.current);
				levelLoopRef.current = 0;
				chunksRef.current = [];
				stopTracks(keepMicAlive);
				setState("idle");
				stopResolverRef.current?.({
					blob,
					mimeType: recorder.mimeType || "audio/webm",
					durationMs,
					maxRms: maxRmsRef.current,
					maxPeak: maxPeakRef.current,
				});
				stopResolverRef.current = null;
				recorderRef.current = null;
				startedAtRef.current = 0;
				maxRmsRef.current = 0;
				maxPeakRef.current = 0;
			};

			recorder.onerror = () => {
				cancelAnimationFrame(levelLoopRef.current);
				levelLoopRef.current = 0;
				setState("error");
				setError("錄音過程發生錯誤，請再試一次。");
				stopTracks(keepMicAlive);
				stopResolverRef.current?.(null);
				stopResolverRef.current = null;
				recorderRef.current = null;
			};

			recorder.start();
			startedAtRef.current = Date.now();
			setState("recording");
			return true;
		} catch {
			setState("error");
			setError("無法存取指定麥克風，請確認權限與裝置設定。");
			return false;
		}
	}, [getInputStream, keepMicAlive, micGain, state, stopTracks]);

	const stopRecording = useCallback(async () => {
		const recorder = recorderRef.current;
		if (!recorder || recorder.state !== "recording") {
			return null;
		}

		return await new Promise<RecordedClip | null>((resolve) => {
			stopResolverRef.current = resolve;
			recorder.stop();
		});
	}, []);

	useEffect(() => {
		if (gainNodeRef.current) {
			gainNodeRef.current.gain.value = micGain;
		}
	}, [micGain]);

	useEffect(() => {
		if (!keepMicAlive) {
			return;
		}
		let cancelled = false;
		const prewarm = async () => {
			try {
				const stream = await getInputStream();
				if (!cancelled || stream !== persistentInputStreamRef.current) {
					return;
				}
				for (const track of stream.getTracks()) {
					track.stop();
				}
				persistentInputStreamRef.current = null;
			} catch {
				// Ignore prewarm failures; regular record flow still handles permission errors.
			}
		};
		void prewarm();
		return () => {
			cancelled = true;
		};
	}, [getInputStream, keepMicAlive]);

	useEffect(() => {
		return () => {
			cancelAnimationFrame(levelLoopRef.current);
			stopTracks();
			recorderRef.current?.stop();
			if (persistentInputStreamRef.current) {
				for (const track of persistentInputStreamRef.current.getTracks()) {
					track.stop();
				}
				persistentInputStreamRef.current = null;
			}
		};
	}, [stopTracks]);

	return {
		state,
		isRecording: state === "recording",
		stream,
		mimeType,
		error,
		selectedDeviceId,
		micGain,
		setSelectedDeviceId,
		setMicGain,
		startRecording,
		stopRecording,
	};
};
