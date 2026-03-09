import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BAR_COUNT = 24;
const WORKLET_REPORT_EVERY = 3;
const COMMIT_INTERVAL_MS_IOS = 88;
const COMMIT_INTERVAL_MS_DEFAULT = 42;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const isIOS = () =>
	typeof navigator !== "undefined" &&
	/iP(ad|hone|pod|one|touch)|iPad|iPhone|iPod/i.test(
		navigator.userAgent || navigator.platform || "",
	);

type WorkletState = {
	level: number;
	bars: number[];
};

type RawWorkletMessage = {
	level?: unknown;
	bars?: unknown;
};

export const useAudioAnalyser = (
	stream: MediaStream | null,
	active: boolean,
) => {
	const [level, setLevel] = useState(0);
	const [bars, setBars] = useState<number[]>(() =>
		Array.from({ length: BAR_COUNT }, () => 0.06),
	);

	const smoothLevelRef = useRef(0);
	const smoothBarsRef = useRef<number[]>(
		Array.from({ length: BAR_COUNT }, () => 0.08),
	);
	const rafScheduledRef = useRef(false);
	const pendingStateRef = useRef<WorkletState | null>(null);
	const lastCommitAtRef = useRef(0);

	const defaultBars = useMemo(
		() =>
			Array.from({ length: BAR_COUNT }, (_, index) => {
				const wave = Math.sin((index / BAR_COUNT) * Math.PI * 2);
				return 0.08 + Math.abs(wave) * 0.06;
			}),
		[],
	);

	const applyStateFromWorker = useCallback((next: WorkletState) => {
		pendingStateRef.current = next;
		if (rafScheduledRef.current) return;

		rafScheduledRef.current = true;
		window.requestAnimationFrame(() => {
			rafScheduledRef.current = false;
			const current = pendingStateRef.current;
			if (!current) return;
			const now = performance.now();
			const commitInterval = isIOS()
				? COMMIT_INTERVAL_MS_IOS
				: COMMIT_INTERVAL_MS_DEFAULT;
			if (now - lastCommitAtRef.current < commitInterval) {
				return;
			}
			lastCommitAtRef.current = now;

			const merged = clamp01(current.level);
			smoothLevelRef.current = smoothLevelRef.current * 0.76 + merged * 0.24;
			setLevel(smoothLevelRef.current);

			const prev = smoothBarsRef.current;
			const smoothed = current.bars
				.slice(0, BAR_COUNT)
				.map((v, index) => prev[index] * 0.78 + clamp01(v) * 0.22);
			smoothBarsRef.current = smoothed;
			setBars(smoothed);
		});
	}, []);

	useEffect(() => {
		if (!active || !stream) {
			setLevel(0);
			setBars(defaultBars);
			smoothLevelRef.current = 0;
			smoothBarsRef.current = defaultBars.slice();
			lastCommitAtRef.current = 0;
			return;
		}

		const audioContext = new AudioContext();
		let closed = false;
		let source: MediaStreamAudioSourceNode | null = null;
		let gain: GainNode | null = null;
		let analyser: AnalyserNode | null = null;
		let workletNode: AudioWorkletNode | null = null;
		let fallbackRaf = 0;

		source = audioContext.createMediaStreamSource(stream);
		if (!source) {
			return;
		}

		const setupFallbackAnalyser = () => {
			analyser = audioContext.createAnalyser();
			analyser.fftSize = isIOS() ? 512 : 1024;
			analyser.smoothingTimeConstant = 0.82;
			source?.connect(analyser);

			const waveform = new Uint8Array(analyser.fftSize);
			const frequency = new Uint8Array(analyser.frequencyBinCount);
			const lowFps = isIOS() ? 42 : 22;
			let lastRenderAt = 0;

			const render = (now: number) => {
				if (!analyser || closed) return;
				if (now - lastRenderAt < lowFps) {
					fallbackRaf = window.requestAnimationFrame(render);
					return;
				}
				lastRenderAt = now;

				analyser.getByteTimeDomainData(waveform);
				analyser.getByteFrequencyData(frequency);

				let rms = 0;
				let peak = 0;
				for (const sample of waveform) {
					const normalized = (sample - 128) / 128;
					rms += normalized * normalized;
					peak = Math.max(peak, Math.abs(normalized));
				}
				rms = Math.sqrt(rms / waveform.length);

				const nextBarsRaw = new Array(BAR_COUNT).fill(0).map((_, index) => {
					const rangeSize = Math.max(
						1,
						Math.floor(frequency.length / BAR_COUNT),
					);
					const start = index * rangeSize;
					const end = Math.min(frequency.length, start + rangeSize);
					let sum = 0;
					for (let i = start; i < end; i += 1) {
						sum += frequency[i] ?? 0;
					}
					const avg = sum / (end - start) / 255;
					return Math.max(0.08, Math.min(1, avg * 1.8));
				});

				const gatedRms = Math.max(0, rms - 0.003);
				const rmsBoost = clamp01(gatedRms * 20) ** 0.7;
				const peakBoost = clamp01(peak * 1.25) ** 1.05;
				const merged = clamp01(rmsBoost * 0.72 + peakBoost * 0.28);

				applyStateFromWorker({ level: merged, bars: nextBarsRaw });
				fallbackRaf = window.requestAnimationFrame(render);
			};

			fallbackRaf = window.requestAnimationFrame(render);
		};

		const setupAudioWorklet = async () => {
			if (
				!("audioWorklet" in audioContext) ||
				typeof AudioWorkletNode === "undefined"
			) {
				setupFallbackAnalyser();
				return;
			}

			try {
				const workletUrl = new URL(
					"/worklets/audio-analyser-processor.js",
					window.location.origin,
				);
				await audioContext.audioWorklet.addModule(workletUrl.href);
				if (closed) return;

				workletNode = new AudioWorkletNode(
					audioContext,
					"audio-analyser-processor",
					{
						processorOptions: {
							barCount: BAR_COUNT,
							reportEvery: isIOS()
								? WORKLET_REPORT_EVERY + 1
								: WORKLET_REPORT_EVERY,
						},
					},
				);
				gain = audioContext.createGain();
				gain.gain.value = 0;

				source.connect(workletNode);
				workletNode.connect(gain);
				gain.connect(audioContext.destination);

				workletNode.port.onmessage = (
					event: MessageEvent<RawWorkletMessage>,
				) => {
					const data = event.data as RawWorkletMessage;
					if (
						!data ||
						typeof data.level !== "number" ||
						!Array.isArray(data.bars)
					) {
						return;
					}
					const nextBars = data.bars
						.map((value) => (typeof value === "number" ? clamp01(value) : 0.08))
						.filter((value) => typeof value === "number");
					while (nextBars.length < BAR_COUNT) {
						nextBars.push(0.08);
					}
					applyStateFromWorker({ level: data.level, bars: nextBars });
				};
			} catch {
				if (!closed) {
					setupFallbackAnalyser();
				}
			}
		};

		void setupAudioWorklet();

		return () => {
			closed = true;
			if (fallbackRaf) {
				window.cancelAnimationFrame(fallbackRaf);
			}
			workletNode?.disconnect();
			workletNode?.port.close();
			analyser?.disconnect();
			gain?.disconnect();
			source?.disconnect();
			rafScheduledRef.current = false;
			pendingStateRef.current = null;
			lastCommitAtRef.current = 0;
			void audioContext.close();
		};
	}, [active, defaultBars, stream, applyStateFromWorker]);

	const displayEnergy = Math.max(0.03, Math.min(1, level));

	return { level, displayEnergy, bars };
};
