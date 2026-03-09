import { useEffect, useRef, useState } from "react";

type IntelligenceWaveBackgroundProps = {
	energy: number;
	bars?: number[];
	iosUpdateIntervalMs?: number;
};

type WaveVisual = {
	pathA: string;
	pathB: string;
	pathC: string;
};

const WIDTH = 1600;
const HEIGHT = 900;
const BASE_Y = HEIGHT - 80;
const COMPUTE_INTERVAL_MS_DEFAULT = 52;
const COMPUTE_INTERVAL_MS_IOS = 140;
const MIN_IOS_INTERVAL_MS = 80;
const MAX_IOS_INTERVAL_MS = 260;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const isIOS = () =>
	typeof navigator !== "undefined" &&
	/iP(ad|hone|pod|one|touch)|iPad|iPhone|iPod/i.test(
		navigator.userAgent || navigator.platform || "",
	);

function buildWave(
	width: number,
	height: number,
	baseY: number,
	amp: number,
	phase: number,
) {
	const points = 72;
	const bleed = 140;
	const startX = -bleed;
	const endX = width + bleed;
	const span = endX - startX;
	const pts: { x: number; y: number }[] = [];

	for (let i = 0; i <= points; i++) {
		const t = i / points;
		const x = startX + t * span;
		let wave =
			Math.sin((t * 1.25 + phase) * Math.PI * 2) * 0.68 +
			Math.sin((t * 0.52 + phase * 1.24) * Math.PI * 2) * 0.32;
		wave = Math.tanh(wave * 1.08);
		const y = baseY - wave * amp;
		pts.push({ x, y });
	}

	let d = `M ${pts[0].x} ${pts[0].y}`;
	for (let i = 1; i < pts.length; i++) {
		const p0 = pts[i - 1];
		const p1 = pts[i];
		const cx = (p0.x + p1.x) / 2;
		d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
	}
	d += ` L ${endX} ${height} L ${startX} ${height} Z`;
	return d;
}

const computeVisualOnMain = (phase: number, liveEnergy: number): WaveVisual => {
	const amp = 52 + liveEnergy * HEIGHT * 0.35;
	return {
		pathA: buildWave(WIDTH, HEIGHT, BASE_Y, amp, phase),
		pathB: buildWave(WIDTH, HEIGHT, BASE_Y + 20, amp * 0.7, phase * 1.1 + 0.13),
		pathC: buildWave(
			WIDTH,
			HEIGHT,
			BASE_Y + 42,
			amp * 0.44,
			phase * 0.92 + 0.27,
		),
	};
};

const initialVisual = computeVisualOnMain(0, 0.07);

export default function IntelligenceWaveBackground({
	energy,
	iosUpdateIntervalMs,
}: IntelligenceWaveBackgroundProps) {
	const [visual, setVisual] = useState<WaveVisual>(initialVisual);
	const workerRef = useRef<Worker | null>(null);
	const inputEnergyRef = useRef(0);
	const phaseRef = useRef(0);
	const liveEnergyRef = useRef(0.07);
	const lastTimeRef = useRef<number | null>(null);
	const lastComputeAtRef = useRef(0);
	const ios = isIOS();

	useEffect(() => {
		inputEnergyRef.current = clamp01(energy);
	}, [energy]);

	useEffect(() => {
		if (typeof Worker === "undefined") {
			workerRef.current = null;
			return;
		}

		try {
			const worker = new Worker("/workers/intelligence-wave.worker.js");
			worker.onmessage = (event: MessageEvent<WaveVisual>) => {
				const data = event.data;
				if (!data || typeof data.pathA !== "string") return;
				setVisual(data);
			};
			workerRef.current = worker;
		} catch {
			workerRef.current = null;
		}

		return () => {
			workerRef.current?.terminate();
			workerRef.current = null;
		};
	}, []);

	useEffect(() => {
		let raf = 0;
		const iosInterval = Math.max(
			MIN_IOS_INTERVAL_MS,
			Math.min(
				MAX_IOS_INTERVAL_MS,
				Math.round(iosUpdateIntervalMs ?? COMPUTE_INTERVAL_MS_IOS),
			),
		);
		const baseInterval = ios ? iosInterval : COMPUTE_INTERVAL_MS_DEFAULT;

		const tick = (t: number) => {
			if (lastTimeRef.current == null) {
				lastTimeRef.current = t;
			}
			const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000);
			lastTimeRef.current = t;

			const input = inputEnergyRef.current;
			const prev = liveEnergyRef.current;
			const attack = 0.26;
			const release = 0.09;
			liveEnergyRef.current =
				input > prev
					? prev + (input - prev) * attack
					: prev + (input - prev) * release;
			liveEnergyRef.current = Math.max(0.05, liveEnergyRef.current);

			const speed = 0.12 + liveEnergyRef.current * 0.95;
			phaseRef.current = (phaseRef.current + dt * speed) % 100;

			const energyFactor =
				liveEnergyRef.current < 0.1 ? baseInterval * 1.45 : baseInterval;
			if (t - lastComputeAtRef.current >= energyFactor) {
				lastComputeAtRef.current = t;
				const phase = phaseRef.current;
				const liveEnergy = liveEnergyRef.current;
				const worker = workerRef.current;
				if (worker) {
					worker.postMessage({ phase, liveEnergy });
				} else {
					setVisual(computeVisualOnMain(phase, liveEnergy));
				}
			}

			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
			lastTimeRef.current = null;
			lastComputeAtRef.current = 0;
		};
	}, [ios, iosUpdateIntervalMs]);

	return (
		<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
			<svg
				viewBox="0 0 1600 900"
				preserveAspectRatio="none"
				className="absolute inset-0 h-full w-full"
				style={{ overflow: "visible" }}
			>
				<title>Animated wave background</title>
				<defs>
					<linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="hsl(219 92% 70%)" />
						<stop offset="50%" stopColor="hsl(184 72% 66%)" />
						<stop offset="100%" stopColor="hsl(246 82% 72%)" />
					</linearGradient>
					<linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="hsl(208 90% 68%)" />
						<stop offset="50%" stopColor="hsl(178 70% 64%)" />
						<stop offset="100%" stopColor="hsl(154 65% 58%)" />
					</linearGradient>
					<filter id="waveBlur1" x="-45%" y="-45%" width="190%" height="190%">
						<feGaussianBlur stdDeviation="14" />
					</filter>
					<filter id="waveBlur2" x="-45%" y="-45%" width="190%" height="190%">
						<feGaussianBlur stdDeviation="20" />
					</filter>
					<filter id="waveBlur3" x="-45%" y="-45%" width="190%" height="190%">
						<feGaussianBlur stdDeviation="26" />
					</filter>
				</defs>

				<path
					d={visual.pathA}
					fill="url(#g1)"
					filter={ios ? "url(#waveBlur1)" : undefined}
					style={ios ? undefined : { filter: "blur(14px)" }}
				/>
				<path
					d={visual.pathB}
					fill="url(#g2)"
					filter={ios ? "url(#waveBlur2)" : undefined}
					style={ios ? undefined : { filter: "blur(20px)" }}
				/>
				{!ios ? (
					<path
						d={visual.pathC}
						fill="url(#g1)"
						style={{ filter: "blur(26px)" }}
					/>
				) : null}
			</svg>
		</div>
	);
}
