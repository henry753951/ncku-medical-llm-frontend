import { ScrollShadow } from "@heroui/react";
import { AnimatePresence, motion } from "motion/react";

type QuestionDescriptionProps = {
	description: string;
	className?: string;
};

export default function QuestionDescription({
	description,
	className = "",
}: QuestionDescriptionProps) {
	return (
		<div className={`w-full px-4 ${className}`}>
			<AnimatePresence mode="wait">
				<motion.div
					key={description}
					initial={{ opacity: 0, y: 6, filter: "blur(12px)" }}
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					exit={{ opacity: 0, y: -6, filter: "blur(12px)" }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="mx-auto w-full max-w-[76ch] rounded-3xl border border-white/70 bg-white/35 p-1.5 shadow-[0_20px_60px_rgba(11,38,70,0.14)] backdrop-blur-2xl"
				>
					<ScrollShadow className="overlay-scrollbar max-h-[170px] rounded-[20px] bg-white/30 px-5 py-4 text-center text-[clamp(1rem,1.45vw,1.24rem)] leading-relaxed text-slate-700 whitespace-pre-line">
						{description}
					</ScrollShadow>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
