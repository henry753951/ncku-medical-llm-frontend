// useAudioAnalyser.ts
import { useEffect, useMemo, useRef, useState } from "react";

const BAR_COUNT = 24;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const useAudioAnalyser = (
	stream: MediaStream | null,
	active: boolean,
) => {
	const [level, setLevel] = useState(0);
	const [bars, setBars] = useState<number[]>(() =>
		Array.from({ length: BAR_COUNT }, () => 0.06),
	);

	const animationRef = useRef<number>(0);
	const smoothLevelRef = useRef(0);
	const smoothBarsRef = useRef<number[]>(
		Array.from({ length: BAR_COUNT }, () => 0.08),
	);

	const defaultBars = useMemo(
		() =>
			Array.from({ length: BAR_COUNT }, (_, index) => {
				const wave = Math.sin((index / BAR_COUNT) * Math.PI * 2);
				return 0.08 + Math.abs(wave) * 0.06;
			}),
		[],
	);

	useEffect(() => {
		if (!active || !stream) {
			setLevel(0);
			setBars(defaultBars);
			smoothLevelRef.current = 0;
			smoothBarsRef.current = defaultBars.slice();
			return;
		}

		const audioContext = new AudioContext();
		const source = audioContext.createMediaStreamSource(stream);
		const analyser = audioContext.createAnalyser();
		analyser.fftSize = 1024;
		analyser.smoothingTimeConstant = 0.82;
		source.connect(analyser);

		const waveform = new Uint8Array(analyser.fftSize);
		const frequency = new Uint8Array(analyser.frequencyBinCount);

		const render = () => {
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
				const rangeSize = Math.floor(frequency.length / BAR_COUNT);
				const start = index * rangeSize;
				const end = start + rangeSize;
				let sum = 0;
				for (let i = start; i < end; i += 1) sum += frequency[i] ?? 0;
				const avg = sum / rangeSize / 255;
				return Math.max(0.08, Math.min(1, avg * 1.8));
			});

			// 能量：靜音 gate + 合成
			const gatedRms = Math.max(0, rms - 0.003);
			const rmsBoost = clamp01(gatedRms * 20) ** 0.7;
			const peakBoost = clamp01(peak * 1.25) ** 1.05;
			const merged = clamp01(rmsBoost * 0.72 + peakBoost * 0.28);

			// level 平滑
			smoothLevelRef.current = smoothLevelRef.current * 0.76 + merged * 0.24;
			setLevel(smoothLevelRef.current);

			// bars 再平滑一次（每個頻帶）
			const prev = smoothBarsRef.current;
			const smoothed = nextBarsRaw.map((v, i) => prev[i] * 0.78 + v * 0.22);
			smoothBarsRef.current = smoothed;
			setBars(smoothed);

			animationRef.current = requestAnimationFrame(render);
		};

		animationRef.current = requestAnimationFrame(render);

		return () => {
			cancelAnimationFrame(animationRef.current);
			source.disconnect();
			analyser.disconnect();
			void audioContext.close();
		};
	}, [active, defaultBars, stream]);

	const displayEnergy = Math.max(0.03, Math.min(1, level));

	return { level, displayEnergy, bars };
};
