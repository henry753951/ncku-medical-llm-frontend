import { motion } from "motion/react";
import { useMemo } from "react";

type WaveVisualizerProps = {
	bars: number[];
	level: number;
	active: boolean;
};

const VIS_BARS = 6;
const VIS_BAR_KEYS = Array.from(
	{ length: VIS_BARS },
	(_, slot) => `bar-${slot}`,
);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function WaveVisualizer({
	bars,
	level,
	active,
}: WaveVisualizerProps) {
	const energy = clamp01(Math.max(0.06, level));

	const vis = useMemo(() => {
		const src = (bars?.length ? bars : Array(24).fill(0.08)).slice(0);

		const pick = (start: number, end: number) => {
			const s = Math.max(0, start);
			const e = Math.min(src.length, end);
			const len = Math.max(1, e - s);
			let sum = 0;
			let peak = 0;
			for (let i = s; i < e; i += 1) {
				const v = src[i] ?? 0;
				sum += v;
				peak = Math.max(peak, v);
			}
			const avg = sum / len;
			return avg * 0.55 + peak * 0.45;
		};

		const groups = [
			pick(0, 3),
			pick(3, 6),
			pick(6, 10),
			pick(10, 14),
			pick(14, 19),
			pick(19, 24),
		];

		const shaped = groups.map((v, i) => {
			const hf = 0.85 + i * 0.06;
			const eased = clamp01(v) ** 0.72;
			return clamp01(eased * hf);
		});

		const breathe = Math.sin(performance.now() / 220) * 0.03;
		const base = 0.1 + energy * 0.22 + breathe;

		const profile = [0.72, 0.92, 1.05, 1.05, 0.92, 0.75];

		const out = shaped.map((v, i) => {
			const lift = base * profile[i];
			return clamp01(Math.max(0.12, v * 0.72 + lift));
		});

		return out;
	}, [bars, energy]);

	return (
		<motion.div
			className={[
				"h-8 w-8 inline-flex items-center justify-center",
				"rounded-full ring-1 ring-white/20",
				"bg-white/18 backdrop-blur-xl",
			].join(" ")}
			animate={{
				opacity: active ? 1 : 0.9,
				scale: active ? 1 : 0.98,
			}}
			transition={{ duration: 0.16, ease: "easeOut" }}
		>
			<span className="absolute inset-0 rounded-[12px] bg-gradient-to-b from-gray/12 to-transparent" />
			<div className="relative flex h-full w-full items-center justify-center gap-[2px] px-[6px]">
				{VIS_BAR_KEYS.map((barKey, slot) => {
					const bar = vis[slot] ?? 0;
					return (
						<motion.span
							key={barKey}
							className="w-[2px] rounded-full bg-black/90"
							animate={{
								height: `${Math.max(22, bar * 100)}%`,
								opacity: 0.4 + Math.min(0.55, energy * 0.85),
							}}
							transition={{
								type: "spring",
								stiffness: 260,
								damping: 18,
								mass: 0.14,
							}}
						/>
					);
				})}
			</div>
		</motion.div>
	);
}
