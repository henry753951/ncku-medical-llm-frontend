import { Lock, Mic } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveVisualizer from "./WaveVisualizer";

type PushToTalkButtonProps = {
	disabled?: boolean;
	isRecording: boolean;
	wave: {
		bars: number[];
		level: number;
		active: boolean;
	};
	onStart: () => Promise<boolean | undefined> | boolean | undefined;
	onStop: () => Promise<void> | void;
};

const TAP_MAX_MS = 220;
const MOVE_TOLERANCE_PX = 10;

export default function PushToTalkButton({
	disabled = false,
	isRecording,
	wave,
	onStart,
	onStop,
}: PushToTalkButtonProps) {
	const [locked, setLocked] = useState(false);
	const [pressed, setPressed] = useState(false);

	const pointerIdRef = useRef<number | null>(null);
	const pressingRef = useRef(false);

	const startTimeRef = useRef(0);
	const startPosRef = useRef<{ x: number; y: number } | null>(null);

	const actionIdRef = useRef(0);
	const startRequestedRef = useRef(false);
	const movedTooMuchRef = useRef(false);

	const safeStart = useCallback(
		async (actionId: number) => {
			if (actionId !== actionIdRef.current) return;
			const started = await onStart();
			if (actionId !== actionIdRef.current) return;
			if (started === false) {
				pressingRef.current = false;
				startRequestedRef.current = false;
				setPressed(false);
				setLocked(false);
			}
		},
		[onStart],
	);

	const safeStop = useCallback(
		async (actionId: number) => {
			if (actionId !== actionIdRef.current) return;
			await onStop();
		},
		[onStop],
	);

	const cancelGesture = useCallback(
		(actionId: number) => {
			pressingRef.current = false;
			pointerIdRef.current = null;
			startRequestedRef.current = false;
			movedTooMuchRef.current = false;
			setPressed(false);
			if (!locked && isRecording) void safeStop(actionId);
		},
		[isRecording, locked, safeStop],
	);

	useEffect(() => {
		const onWindowPointerUp = (e: PointerEvent) => {
			if (!pressingRef.current) return;
			if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current)
				return;

			const actionId = actionIdRef.current;
			const elapsed = performance.now() - startTimeRef.current;

			pressingRef.current = false;
			pointerIdRef.current = null;
			setPressed(false);

			const isTap = elapsed <= TAP_MAX_MS && !movedTooMuchRef.current;

			if (isTap) {
				if (locked) {
					setLocked(false);
					if (isRecording) {
						actionIdRef.current += 1;
						void safeStop(actionIdRef.current);
					}
				} else {
					setLocked(true);
				}
				return;
			}

			if (!locked) void safeStop(actionId);

			startRequestedRef.current = false;
			movedTooMuchRef.current = false;
		};

		const onWindowPointerCancel = (e: PointerEvent) => {
			if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current)
				return;
			cancelGesture(actionIdRef.current);
		};

		const onWindowBlur = () => cancelGesture(actionIdRef.current);

		const onWindowPointerMove = (e: PointerEvent) => {
			if (!pressingRef.current) return;
			if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current)
				return;
			if (!startPosRef.current) return;

			const dx = e.clientX - startPosRef.current.x;
			const dy = e.clientY - startPosRef.current.y;
			if (dx * dx + dy * dy > MOVE_TOLERANCE_PX * MOVE_TOLERANCE_PX) {
				movedTooMuchRef.current = true;
			}
		};

		window.addEventListener("pointerup", onWindowPointerUp);
		window.addEventListener("pointercancel", onWindowPointerCancel);
		window.addEventListener("blur", onWindowBlur);
		window.addEventListener("pointermove", onWindowPointerMove);
		return () => {
			window.removeEventListener("pointerup", onWindowPointerUp);
			window.removeEventListener("pointercancel", onWindowPointerCancel);
			window.removeEventListener("blur", onWindowBlur);
			window.removeEventListener("pointermove", onWindowPointerMove);
		};
	}, [cancelGesture, isRecording, locked, safeStop]);

	const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
		if (disabled) return;
		if (pressingRef.current) return;

		actionIdRef.current += 1;
		const actionId = actionIdRef.current;

		pressingRef.current = true;
		pointerIdRef.current = e.pointerId;

		startTimeRef.current = performance.now();
		startPosRef.current = { x: e.clientX, y: e.clientY };
		movedTooMuchRef.current = false;

		setPressed(true);

		if (!isRecording) {
			startRequestedRef.current = true;
			void safeStart(actionId);
		} else {
			startRequestedRef.current = false;
		}
	};

	const label = useMemo(() => {
		if (locked) return isRecording ? "點一下停止" : "點一下開始";
		return isRecording ? "放開結束" : "按住說話";
	}, [locked, isRecording]);

	const showWave = (locked && isRecording) || isRecording;
	const visualActive = wave.active && (showWave || pressed || locked);

	return (
		<button
			type="button"
			onPointerDown={handlePointerDown}
			disabled={disabled}
			className={[
				"group relative",
				"inline-flex w-[min(460px,86vw)] items-center justify-center gap-3",
				"rounded-full px-6 py-3",
				"backdrop-blur-2xl bg-white/60",
				"text-[0.95rem] font-medium text-slate-800",
				"shadow-[0_10px_45px_rgba(0,0,0,0.10)]",
				"transition-all duration-200",
				"disabled:cursor-not-allowed disabled:opacity-45",
				pressed
					? "scale-[0.985] shadow-[0_6px_25px_rgba(0,0,0,0.10)]"
					: "hover:bg-white/42",
				isRecording ? "bg-rose-200/18" : "bg-sky-200/14",
			].join(" ")}
		>
			<span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/45 via-white/10 to-transparent opacity-70" />
			<span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/25" />
			<span
				className={[
					"pointer-events-none absolute -inset-2 rounded-[999px] blur-2xl opacity-40 transition",
					isRecording ? "bg-rose-300/30" : "bg-sky-300/28",
					pressed ? "opacity-55" : "opacity-35",
				].join(" ")}
			/>

			<span className="relative -ml-1 inline-flex items-center">
				{locked || isRecording ? (
					<WaveVisualizer
						bars={wave.bars}
						level={wave.level}
						active={visualActive}
					/>
				) : (
					<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/18 backdrop-blur-xl ring-1 ring-white/20">
						<Mic size={16} strokeWidth={2.2} className="opacity-85" />
					</span>
				)}
			</span>

			<span className="relative tracking-[0.04em] select-none">{label}</span>

			<span className="relative inline-flex items-center gap-2">
				{locked && (
					<span className="inline-flex items-center gap-1 rounded-full bg-white/18 px-2 py-1 text-[0.76rem] ring-1 ring-white/18">
						<Lock size={13} strokeWidth={2} />
						鎖定
					</span>
				)}
			</span>
		</button>
	);
}
