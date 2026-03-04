import { AnimatePresence, motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CenterFeedbackProps = {
	suggestions: readonly string[];
	showSuggestionCarousel: boolean;
	statusText: string;
	transcript: string;
	resultText: string;
	isMatch: boolean;
	error: string | null;
};

export default function CenterFeedback({
	suggestions,
	showSuggestionCarousel,
	statusText,
	transcript,
	resultText,
	isMatch,
	error,
}: CenterFeedbackProps) {
	const hasTranscript = transcript.trim().length > 0;
	const [suggestionIndex, setSuggestionIndex] = useState(0);

	useEffect(() => {
		if (!showSuggestionCarousel || suggestions.length <= 1) {
			return;
		}
		const timer = window.setInterval(() => {
			setSuggestionIndex((current) => (current + 1) % suggestions.length);
		}, 3200);
		return () => window.clearInterval(timer);
	}, [showSuggestionCarousel, suggestions]);

	useEffect(() => {
		setSuggestionIndex(0);
	}, []);

	const view = useMemo(() => {
		if (hasTranscript) {
			return {
				key: `transcript:${transcript}`,
				text: transcript,
				className:
					"text-[clamp(1.2rem,2.35vw,1.95rem)] font-medium text-slate-900 whitespace-pre-wrap [text-wrap:pretty]",
			};
		}
		if (showSuggestionCarousel && suggestions.length > 0) {
			const suggestion = suggestions[suggestionIndex] ?? suggestions[0];
			return {
				key: `suggestion:${suggestionIndex}:${suggestion}`,
				text: `你可以說說：${suggestion}`,
				className:
					"text-[clamp(1rem,1.9vw,1.25rem)] font-normal tracking-[0.01em] text-slate-600",
			};
		}
		return {
			key: `status:${statusText}`,
			text: statusText,
			className: "text-[0.98rem] tracking-[0.03em] text-slate-600",
		};
	}, [
		hasTranscript,
		showSuggestionCarousel,
		statusText,
		suggestions,
		suggestionIndex,
		transcript,
	]);

	return (
		<div className="flex max-w-[min(88vw,820px)] flex-col items-center gap-4">
			<div className="flex min-h-[112px] w-full items-center justify-center px-4">
				<AnimatePresence mode="wait">
					{view.text ? (
						<motion.p
							key={view.key}
							initial={{ opacity: 0, filter: "blur(10px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							exit={{ opacity: 0, filter: "blur(10px)" }}
							transition={{ duration: 0.32, ease: "easeOut" }}
							className={`w-full text-center ${view.className}`}
						>
							{view.text}
						</motion.p>
					) : (
						<motion.div
							key="primary-empty"
							className="h-[1.8rem] w-full opacity-0"
						/>
					)}
				</AnimatePresence>
			</div>

			<div className="min-h-[44px]">
				<AnimatePresence mode="wait">
					{error ? (
						<motion.div
							key={`error:${error}`}
							initial={{ opacity: 0, filter: "blur(8px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							exit={{ opacity: 0, filter: "blur(8px)" }}
							transition={{ duration: 0.24, ease: "easeOut" }}
							className="inline-flex max-w-[min(88vw,760px)] items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/75 px-4 py-1.5 text-amber-900 shadow-[0_8px_22px_rgba(180,83,9,0.12)]"
						>
							<AlertCircle size={15} className="shrink-0 opacity-80" />
							<span className="text-sm">{error}</span>
						</motion.div>
					) : resultText ? (
						<motion.p
							key={`result:${resultText}`}
							initial={{ opacity: 0, filter: "blur(8px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							exit={{ opacity: 0, filter: "blur(8px)" }}
							transition={{ duration: 0.24, ease: "easeOut" }}
							className={`text-center text-base font-semibold ${
								isMatch ? "text-emerald-700" : "text-rose-600"
							}`}
						>
							{resultText}
						</motion.p>
					) : (
						<motion.div
							key="secondary-empty"
							className="h-[30px] w-full opacity-0"
						/>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
