import { Tabs } from "@heroui/react";
import { CircleStop } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import PushToTalkButton from "../audio/PushToTalkButton";

type InputModeDockProps = {
	inputMode: "voice" | "text";
	onInputModeChange: (mode: "voice" | "text") => void;
	busy: boolean;
	textBusy: boolean;
	showVoiceAbort: boolean;
	textInput: string;
	onTextInputChange: (value: string) => void;
	onSubmitText: () => void;
	onAbort: () => void;
	isRecording: boolean;
	wave: {
		bars: number[];
		level: number;
		active: boolean;
	};
	onStartVoice: () => Promise<boolean | undefined> | boolean | undefined;
	onStopVoice: () => Promise<void> | void;
};

export default function InputModeDock({
	inputMode,
	onInputModeChange,
	busy,
	textBusy,
	showVoiceAbort,
	textInput,
	onTextInputChange,
	onSubmitText,
	onAbort,
	isRecording,
	wave,
	onStartVoice,
	onStopVoice,
}: InputModeDockProps) {
	return (
		<Tabs
			className="w-[min(92vw,760px)]"
			selectedKey={inputMode}
			onSelectionChange={(value) =>
				onInputModeChange(value === "voice" ? "voice" : "text")
			}
		>
			<Tabs.ListContainer className="mx-auto rounded-full border border-white/70 bg-white/60 p-1 backdrop-blur-xl">
				<Tabs.List aria-label="輸入模式" className="gap-1">
					<Tabs.Tab
						id="voice"
						className="min-w-[76px] px-4 text-sm whitespace-nowrap"
					>
						語音
						<Tabs.Indicator />
					</Tabs.Tab>
					<Tabs.Tab
						id="text"
						className="min-w-[96px] px-4 text-sm whitespace-nowrap"
					>
						文字輸入
						<Tabs.Indicator />
					</Tabs.Tab>
				</Tabs.List>
			</Tabs.ListContainer>

			<div className="mt-2 min-h-[84px]">
				<AnimatePresence mode="wait">
					{inputMode === "voice" ? (
						<motion.div
							key="voice-mode"
							initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
							animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
							exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
							transition={{ duration: 0.26, ease: "easeOut" }}
							className="flex w-full items-center justify-center"
						>
							{showVoiceAbort ? (
								<button
									type="button"
									onClick={onAbort}
									className={[
										"group relative",
										"inline-flex w-[min(460px,86vw)] items-center justify-center gap-3",
										"rounded-full px-6 py-3",
										"backdrop-blur-2xl bg-white/60",
										"text-[0.95rem] font-medium text-slate-800",
										"shadow-[0_10px_45px_rgba(0,0,0,0.10)]",
										"transition-all duration-200",
										"hover:bg-white/42",
										"bg-rose-200/18",
									].join(" ")}
								>
									<span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/45 via-white/10 to-transparent opacity-70" />
									<span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/25" />
									<span className="pointer-events-none absolute -inset-2 rounded-[999px] bg-rose-300/30 blur-2xl opacity-40 transition" />

									<span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/18 backdrop-blur-xl ring-1 ring-white/20">
										<CircleStop
											size={16}
											strokeWidth={2.2}
											className="text-rose-600/90"
										/>
									</span>
									<span className="relative tracking-[0.04em] text-rose-700 select-none pr-4">
										中止送出
									</span>
								</button>
							) : (
								<PushToTalkButton
									disabled={busy}
									wave={wave}
									isRecording={isRecording}
									onStart={onStartVoice}
									onStop={onStopVoice}
								/>
							)}
						</motion.div>
					) : (
						<motion.div
							key="text-mode"
							initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
							animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
							exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
							transition={{ duration: 0.26, ease: "easeOut" }}
							className="flex w-full items-center justify-center"
						>
							<div className="flex w-[min(92vw,760px)] items-center gap-2 rounded-full border border-white/75 bg-white/62 p-2 shadow-[0_18px_50px_rgba(11,38,70,0.12)] backdrop-blur-xl">
								<input
									value={textInput}
									onChange={(event) => onTextInputChange(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter" && !event.shiftKey) {
											event.preventDefault();
											onSubmitText();
										}
									}}
									placeholder="輸入要判斷的內容..."
									className="h-11 w-full rounded-full border border-white/85 bg-white/82 px-4 text-[15px] text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
								/>
								<button
									type="button"
									onClick={() => {
										if (textBusy) {
											onAbort();
											return;
										}
										onSubmitText();
									}}
									className={`inline-flex h-11 min-w-[88px] items-center justify-center rounded-full border px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.35)] transition ${
										textBusy
											? "border-rose-300/80 bg-[linear-gradient(135deg,#f43f5e,#e11d48)]"
											: "border-sky-300/70 bg-[linear-gradient(135deg,#3b82f6,#2563eb)] hover:brightness-105"
									}`}
								>
									{textBusy ? "中止" : "送出"}
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</Tabs>
	);
}
