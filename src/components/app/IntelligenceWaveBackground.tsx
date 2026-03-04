import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type IntelligenceWaveBackgroundProps = {
	energy: number;
	bars?: number[];
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function buildWave(
	width: number,
	height: number,
	baseY: number,
	amp: number,
	phase: number,
) {
	const points = 120;
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

function buildHighlight(
	width: number,
	baseY: number,
	amp: number,
	phase: number,
) {
	const points = 120;
	const bleed = 140;
	const startX = -bleed;
	const endX = width + bleed;
	const span = endX - startX;
	const pts: { x: number; y: number }[] = [];

	for (let i = 0; i <= points; i++) {
		const t = i / points;
		const x = startX + t * span;
		const wave =
			Math.sin((t * 1.25 + phase) * Math.PI * 2) * 0.6 +
			Math.sin((t * 0.52 + phase * 1.24) * Math.PI * 2) * 0.4;
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
	return d;
}

export default function IntelligenceWaveBackground({
	energy,
}: IntelligenceWaveBackgroundProps) {
	const width = 1600;
	const height = 900;
	const base = height - 80;

	const [phase, setPhase] = useState(0);
	const [liveEnergy, setLiveEnergy] = useState(0.07);
	const inputEnergyRef = useRef(0);
	const liveEnergyRef = useRef(0.07);
	const lastTimeRef = useRef<number | null>(null);

	useEffect(() => {
		inputEnergyRef.current = clamp01(energy);
	}, [energy]);

	useEffect(() => {
		liveEnergyRef.current = liveEnergy;
	}, [liveEnergy]);

	useEffect(() => {
		let raf = 0;
		const tick = (t: number) => {
			if (lastTimeRef.current == null) {
				lastTimeRef.current = t;
			}
			const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000);
			lastTimeRef.current = t;

			setLiveEnergy((prev) => {
				const input = inputEnergyRef.current;
				const attack = 0.26;
				const release = 0.09;
				const next =
					input > prev
						? prev + (input - prev) * attack
						: prev + (input - prev) * release;
				return Math.max(0.05, next);
			});

			setPhase((prev) => {
				const speed = 0.12 + liveEnergyRef.current * 0.95;
				// Use a larger wrap period so all phase multipliers (e.g. 1.24/1.1/0.92)
				// land on equivalent wave states at wrap boundaries.
				return (prev + dt * speed) % 100;
			});

			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
			lastTimeRef.current = null;
		};
	}, []);

	const amp = 56 + liveEnergy * height * 0.42;
	const phaseAngle = (phase / 100) * Math.PI * 2;
	const hueShiftA = Math.sin(phaseAngle) * 9;
	const hueShiftB = Math.cos(phaseAngle) * 10;
	const gradientShift = Math.sin(phaseAngle) * 90;
	const gradientShift2 = Math.cos(phaseAngle) * 70;
	const pathA = buildWave(width, height, base, amp, phase);
	const pathB = buildWave(
		width,
		height,
		base + 20,
		amp * 0.72,
		phase * 1.1 + 0.13,
	);
	const pathC = buildWave(
		width,
		height,
		base + 42,
		amp * 0.48,
		phase * 0.92 + 0.27,
	);
	const highlight = buildHighlight(width, base - 6, amp * 0.24, phase + 0.08);

	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return <div className="absolute inset-0 bg-transparent" />;
	}

	return (
		<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
			<motion.svg
				viewBox="0 0 1600 900"
				preserveAspectRatio="none"
				className="absolute inset-0 h-full w-full"
				style={{ overflow: "visible" }}
			>
				<defs>
					<linearGradient
						id="g1"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="0%"
						gradientUnits="userSpaceOnUse"
						gradientTransform={`translate(${gradientShift} 0)`}
					>
						<stop offset="0%" stopColor={`hsl(${218 + hueShiftA} 92% 70%)`} />
						<stop
							offset="50%"
							stopColor={`hsl(${184 + hueShiftB * 0.5} 72% 66%)`}
						/>
						<stop
							offset="100%"
							stopColor={`hsl(${248 - hueShiftA * 0.7} 82% 72%)`}
						/>
					</linearGradient>
					<linearGradient
						id="g2"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="0%"
						gradientUnits="userSpaceOnUse"
						gradientTransform={`translate(${gradientShift2} 0)`}
					>
						<stop
							offset="0%"
							stopColor={`hsl(${208 + hueShiftB * 0.6} 90% 68%)`}
						/>
						<stop
							offset="50%"
							stopColor={`hsl(${178 + hueShiftA * 0.55} 70% 64%)`}
						/>
						<stop
							offset="100%"
							stopColor={`hsl(${154 - hueShiftB * 0.5} 65% 58%)`}
						/>
					</linearGradient>
					<linearGradient id="highlight">
						<stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
						<stop offset="50%" stopColor="rgba(255,255,255,0.68)" />
						<stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
					</linearGradient>
				</defs>

				<path d={pathA} fill="url(#g1)" style={{ filter: "blur(18px)" }} />
				<path d={pathB} fill="url(#g2)" style={{ filter: "blur(26px)" }} />
				<path d={pathC} fill="url(#g1)" style={{ filter: "blur(34px)" }} />
			</motion.svg>
		</div>
	);
}
