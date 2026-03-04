import { useEffect, useState } from "react";

type UseMicPreviewArgs = {
	enabled: boolean;
	isRecording: boolean;
	selectedDeviceId: string;
	micGain: number;
};

export const useMicPreview = ({
	enabled,
	isRecording,
	selectedDeviceId,
	micGain,
}: UseMicPreviewArgs) => {
	const [previewLevel, setPreviewLevel] = useState(0);
	const [previewPeak, setPreviewPeak] = useState(0);
	const [isClipping, setIsClipping] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled || isRecording) {
			setPreviewLevel(0);
			setPreviewPeak(0);
			setIsClipping(false);
			setPreviewError(null);
			return;
		}

		let closed = false;
		let rafId = 0;
		let stream: MediaStream | null = null;
		let context: AudioContext | null = null;
		let source: MediaStreamAudioSourceNode | null = null;
		let analyser: AnalyserNode | null = null;
		let gainNode: GainNode | null = null;
		let smoothLevel = 0;
		let smoothPeak = 0;
		let clipHoldFrames = 0;

		const startPreview = async () => {
			try {
				const constraints: MediaStreamConstraints = selectedDeviceId
					? { audio: { deviceId: { exact: selectedDeviceId } } }
					: { audio: true };
				stream = await navigator.mediaDevices.getUserMedia(constraints);
				if (closed) {
					return;
				}
				context = new AudioContext();
				source = context.createMediaStreamSource(stream);
				gainNode = context.createGain();
				gainNode.gain.value = micGain;
				analyser = context.createAnalyser();
				analyser.fftSize = 1024;
				analyser.smoothingTimeConstant = 0.35;
				source.connect(gainNode);
				gainNode.connect(analyser);

				const waveform = new Uint8Array(analyser.fftSize);
				const loop = () => {
					if (!analyser) {
						return;
					}
					analyser.getByteTimeDomainData(waveform);
					let rms = 0;
					let peak = 0;
					for (const sample of waveform) {
						const normalized = ((sample - 128) / 128) * micGain;
						rms += normalized * normalized;
						peak = Math.max(peak, Math.abs(normalized));
					}
					rms = Math.sqrt(rms / waveform.length);

					const db = 20 * Math.log10(rms + 1e-6);
					const dbNormalized = Math.min(1, Math.max(0, (db + 54) / 54));
					const level = Math.min(
						1,
						dbNormalized * 0.78 + Math.min(1, peak) * 0.22,
					);
					const limitedPeak = Math.min(1, peak);
					// Fast attack, slow release feels responsive without jitter.
					const levelAttack = 0.62;
					const levelRelease = 0.22;
					const peakAttack = 0.72;
					const peakRelease = 0.18;
					smoothLevel =
						level > smoothLevel
							? smoothLevel + (level - smoothLevel) * levelAttack
							: smoothLevel + (level - smoothLevel) * levelRelease;
					smoothPeak =
						limitedPeak > smoothPeak
							? smoothPeak + (limitedPeak - smoothPeak) * peakAttack
							: smoothPeak + (limitedPeak - smoothPeak) * peakRelease;

					if (peak >= 0.985) {
						clipHoldFrames = 12;
					} else {
						clipHoldFrames = Math.max(0, clipHoldFrames - 1);
					}

					setPreviewLevel(smoothLevel);
					setPreviewPeak(smoothPeak);
					setIsClipping(clipHoldFrames > 0);
					rafId = requestAnimationFrame(loop);
				};
				rafId = requestAnimationFrame(loop);
			} catch {
				setPreviewError("無法讀取麥克風預覽訊號");
			}
		};

		void startPreview();

		return () => {
			closed = true;
			cancelAnimationFrame(rafId);
			source?.disconnect();
			gainNode?.disconnect();
			analyser?.disconnect();
			void context?.close();
			if (stream) {
				for (const track of stream.getTracks()) {
					track.stop();
				}
			}
		};
	}, [enabled, isRecording, micGain, selectedDeviceId]);

	return {
		previewLevel,
		previewPeak,
		isClipping,
		previewError,
	};
};
