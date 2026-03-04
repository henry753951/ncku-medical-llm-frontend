import { Spinner } from "@heroui/react";
import { AnimatePresence, motion } from "motion/react";
import type { useStrokeVoiceAppController } from "../../composables/useStrokeVoiceAppController";
import CenterFeedback from "./CenterFeedback";
import HistoryDropdown from "./HistoryDropdown";
import InputModeDock from "./InputModeDock";
import IntelligenceWaveBackground from "./IntelligenceWaveBackground";
import QuestionDescription from "./QuestionDescription";
import SettingsModal from "./SettingsModal";
import TopControlBar from "./TopControlBar";

type StrokeVoiceController = ReturnType<typeof useStrokeVoiceAppController>;

type StrokeVoiceSceneProps = {
	controller: StrokeVoiceController;
};

export default function StrokeVoiceScene({
	controller,
}: StrokeVoiceSceneProps) {
	return (
		<div
			className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_10%_20%,rgba(221,235,255,0.8),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(220,246,244,0.84),transparent_28%),linear-gradient(160deg,#e9f0fb,#dae9f8_45%,#d5e5f2)] px-4 py-6 text-slate-900"
			style={controller.shellStyle}
		>
			<div
				className="pointer-events-none absolute inset-[-30vmax] z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.42),transparent_62%)] blur-[42px] transition"
				style={{
					filter: `blur(${48 - controller.analyser.level * 20}px)`,
				}}
			/>
			<IntelligenceWaveBackground
				energy={controller.analyser.displayEnergy}
				bars={controller.analyser.bars}
			/>

			<div
				className={`relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-[1000px] flex-col items-center gap-5 ${
					controller.stackDescription ? "justify-start pt-24" : "justify-center"
				}`}
			>
				<TopControlBar
					selectedQuestion={controller.selectedQuestion}
					disabled={controller.busy || controller.recorder.isRecording}
					onQuestionChange={controller.setSelectedQuestion}
					historyControl={
						<HistoryDropdown
							records={controller.historyRecords}
							disabled={controller.recorder.isRecording}
							onDeleteRecord={(id) =>
								controller.setHistoryRecords((prev) =>
									prev.filter((record) => record.id !== id),
								)
							}
							onClearAll={() => controller.setHistoryRecords([])}
						/>
					}
					settingsControl={
						<SettingsModal
							isRecording={controller.recorder.isRecording}
							selectedDeviceId={controller.recorder.selectedDeviceId}
							micGain={controller.recorder.micGain}
							requestTimeoutMs={controller.requestTimeoutMs}
							devices={controller.devices}
							onReloadDevices={() => void controller.refreshDevices()}
							onDeviceChange={controller.recorder.setSelectedDeviceId}
							onMicGainChange={controller.recorder.setMicGain}
							onRequestTimeoutChange={controller.setRequestTimeoutMs}
						/>
					}
				/>

				<AnimatePresence mode="wait">
					{!controller.isIntroDone ? (
						<motion.div
							key="intro"
							initial={{ opacity: 0, filter: "blur(14px)", scale: 0.98 }}
							animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
							exit={{ opacity: 0, filter: "blur(14px)", scale: 1.02 }}
							transition={{ duration: 0.52, ease: "easeOut" }}
							className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
						>
							<motion.p
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.08, duration: 0.42 }}
								className="text-[clamp(2rem,4.2vw,3.4rem)] font-semibold tracking-[0.12em] text-slate-700/90"
							>
								NIHSS 評估
							</motion.p>
						</motion.div>
					) : (
						<motion.div
							key="app"
							initial={{ opacity: 0, filter: "blur(10px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							exit={{ opacity: 0, filter: "blur(10px)" }}
							transition={{ duration: 0.36, ease: "easeOut" }}
							className="contents"
						>
							<QuestionDescription
								description={controller.selectedOption.description}
								className={
									controller.stackDescription
										? "relative"
										: "pointer-events-auto absolute left-1/2 top-[7rem] z-10 -translate-x-1/2"
								}
							/>

							<CenterFeedback
								suggestions={controller.selectedOption.examples}
								showSuggestionCarousel={controller.showSuggestionCarousel}
								statusText={
									controller.inputMode === "voice"
										? controller.statusText
										: controller.evaluateFlow.isSubmitting
											? "判斷中..."
											: ""
								}
								transcript={
									controller.transcriptionFlow.transcript ||
									controller.textTranscript
								}
								resultText={controller.resultText}
								isMatch={Boolean(controller.evaluateFlow.lastResult)}
								error={controller.effectiveError}
							/>

							<div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
								{controller.busy ? <Spinner size="sm" color="current" /> : null}
								<InputModeDock
									inputMode={controller.inputMode}
									onInputModeChange={controller.handleInputModeChange}
									busy={controller.busy}
									textBusy={
										controller.evaluateFlow.isSubmitting &&
										controller.inputMode === "text"
									}
									showVoiceAbort={
										controller.inputMode === "voice" &&
										(controller.transcriptionFlow.isSubmitting ||
											controller.evaluateFlow.isSubmitting)
									}
									textInput={controller.textInput}
									onTextInputChange={controller.setTextInput}
									onSubmitText={() => void controller.submitTextMode()}
									onAbort={controller.abortActiveSubmit}
									isRecording={controller.recorder.isRecording}
									wave={{
										bars: controller.analyser.bars,
										level: controller.analyser.level,
										active: controller.recorder.isRecording,
									}}
									onStartVoice={controller.onStartVoice}
									onStopVoice={controller.onStopVoice}
								/>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
