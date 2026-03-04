import { Spinner, Tabs } from "@heroui/react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useAudioAnalyser } from "../../composables/useAudioAnalyser";
import { useAudioInputDevices } from "../../composables/useAudioInputDevices";
import { useAudioRecorder } from "../../composables/useAudioRecorder";
import { useTranscriptionFlow } from "../../composables/useTranscriptionFlow";
import { QUESTION_OPTIONS, type QuestionCode } from "../../lib/questions";
import PushToTalkButton from "../audio/PushToTalkButton";
import CenterFeedback from "./CenterFeedback";
import HistoryDropdown from "./HistoryDropdown";
import IntelligenceWaveBackground from "./IntelligenceWaveBackground";
import MicSettingsModal from "./MicSettingsModal";
import QuestionDescription from "./QuestionDescription";
import TopControlBar from "./TopControlBar";

type HistoryRecord = {
	id: string;
	questionCode: QuestionCode;
	questionName: string;
	text?: string;
	result: boolean | null;
	errorReason?: string;
	time: string;
};

export default function StrokeVoiceApp() {
	const [selectedQuestion, setSelectedQuestion] = useState<QuestionCode>(
		QUESTION_OPTIONS[0].code,
	);
	const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
	const [now, setNow] = useState(() => Date.now());
	const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
	const [stackDescription, setStackDescription] = useState(false);
	const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
	const [textInput, setTextInput] = useState("");
	const [textTranscript, setTextTranscript] = useState("");
	const [textResult, setTextResult] = useState<boolean | null>(null);
	const [textError, setTextError] = useState<string | null>(null);
	const [textBusy, setTextBusy] = useState(false);
	const [isIntroDone, setIsIntroDone] = useState(false);

	const recorder = useAudioRecorder();
	const analyser = useAudioAnalyser(recorder.stream, recorder.isRecording);
	const flow = useTranscriptionFlow();
	const { devices, refreshDevices } = useAudioInputDevices();

	const shellStyle = useMemo(
		() =>
			({
				"--input-energy": analyser.level.toString(),
			}) as CSSProperties,
		[analyser.level],
	);

	const selectedOption = useMemo(
		() =>
			QUESTION_OPTIONS.find((option) => option.code === selectedQuestion) ??
			QUESTION_OPTIONS[0],
		[selectedQuestion],
	);
	const busy =
		flow.transcribeState === "transcribing" ||
		flow.evaluateState === "checking" ||
		textBusy;
	const effectiveError = recorder.error ?? flow.error ?? textError;
	const statusText = recorder.isRecording
		? "正在聆聽..."
		: flow.transcribeState === "transcribing"
			? "辨識中..."
			: flow.evaluateState === "checking"
				? "判斷中..."
				: "";
	const resultText =
		(textResult ?? flow.lastResult) === null
			? ""
			: (textResult ?? flow.lastResult)
				? "符合此題要求"
				: "不符合此題要求";
	const idleMs = now - lastActivityAt;
	const showSuggestionCarousel =
		isIntroDone &&
		!recorder.isRecording &&
		!busy &&
		!effectiveError &&
		idleMs >= 6500 &&
		!(textTranscript.trim().length > 0);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 400);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		const timer = window.setTimeout(() => setIsIntroDone(true), 1450);
		return () => window.clearTimeout(timer);
	}, []);

	useEffect(() => {
		const estimateAndSetLayout = () => {
			const viewportH = window.innerHeight;
			// TopControlBar + spacing + expected description card max height.
			const descBottomEstimate = 12 + 52 + 14 + 170;
			// Keep center feedback safely around vertical center.
			const centerAreaTopEstimate = viewportH * 0.5 - 120;
			setStackDescription(descBottomEstimate + 20 > centerAreaTopEstimate);
		};

		estimateAndSetLayout();
		window.addEventListener("resize", estimateAndSetLayout);
		return () => window.removeEventListener("resize", estimateAndSetLayout);
	}, []);

	useEffect(() => {
		if (flow.transcript.trim().length > 0) {
			setLastActivityAt(Date.now());
		}
	}, [flow.transcript]);

	const onStart = async () => {
		setLastActivityAt(Date.now());
		flow.markRecording();
		const started = await recorder.startRecording();
		if (!started) {
			flow.reset();
			return false;
		}
		await refreshDevices();
		return true;
	};

	const submitTextMode = async () => {
		const text = textInput.trim();
		setTextError(null);
		setTextResult(null);
		if (!text) {
			setTextError("請先輸入文字再送出。");
			return;
		}

		setTextBusy(true);
		setTextTranscript(text);
		setLastActivityAt(Date.now());
		try {
			const evaluateResponse = await fetch("/api/evaluate", {
				method: "POST",
				headers: { "content-type": "application/json; charset=utf-8" },
				body: JSON.stringify({
					question: selectedQuestion,
					text,
				}),
			});
			if (!evaluateResponse.ok) {
				let message = "題目判斷服務暫時無法使用。";
				try {
					const payload = (await evaluateResponse.json()) as { error?: string };
					message = payload.error ?? message;
				} catch {
					// ignore parse failure
				}
				throw new Error(message);
			}
			const evaluateJson = (await evaluateResponse.json()) as {
				result?: boolean;
			};
			const result = Boolean(evaluateJson.result);
			setTextResult(result);

			const questionName =
				QUESTION_OPTIONS.find((option) => option.code === selectedQuestion)
					?.name ?? selectedQuestion;
			const record: HistoryRecord = {
				id: crypto.randomUUID(),
				questionCode: selectedQuestion,
				questionName,
				text,
				result,
				time: new Date().toLocaleTimeString("zh-TW", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					hour12: false,
				}),
			};
			setHistoryRecords((prev) => [record, ...prev].slice(0, 20));
		} catch (error) {
			const message = error instanceof Error ? error.message : "未知錯誤";
			setTextError(message);
			const questionName =
				QUESTION_OPTIONS.find((option) => option.code === selectedQuestion)
					?.name ?? selectedQuestion;
			const failedRecord: HistoryRecord = {
				id: crypto.randomUUID(),
				questionCode: selectedQuestion,
				questionName,
				text,
				result: null,
				errorReason: message,
				time: new Date().toLocaleTimeString("zh-TW", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					hour12: false,
				}),
			};
			setHistoryRecords((prev) => [failedRecord, ...prev].slice(0, 20));
		} finally {
			setTextBusy(false);
		}
	};

	const onStop = async () => {
		const clip = await recorder.stopRecording();
		setLastActivityAt(Date.now());
		if (!clip) {
			return;
		}
		try {
			const submitted = await flow.submit({
				blob: clip.blob,
				mimeType: clip.mimeType,
				question: selectedQuestion,
				durationMs: clip.durationMs,
				maxRms: clip.maxRms,
				maxPeak: clip.maxPeak,
			});
			const questionName =
				QUESTION_OPTIONS.find((option) => option.code === selectedQuestion)
					?.name ?? selectedQuestion;
			const record: HistoryRecord = {
				id: crypto.randomUUID(),
				questionCode: selectedQuestion,
				questionName,
				text: submitted.text,
				result: submitted.result,
				time: new Date().toLocaleTimeString("zh-TW", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					hour12: false,
				}),
			};
			setHistoryRecords((prev) => [record, ...prev].slice(0, 20));
		} catch (error) {
			const message =
				error instanceof Error && error.message.trim().length > 0
					? error.message
					: (effectiveError ?? "未知錯誤");
			const questionName =
				QUESTION_OPTIONS.find((option) => option.code === selectedQuestion)
					?.name ?? selectedQuestion;
			const fallbackTranscript = flow.transcript.trim();
			const failedRecord: HistoryRecord = {
				id: crypto.randomUUID(),
				questionCode: selectedQuestion,
				questionName,
				text: fallbackTranscript || undefined,
				result: null,
				errorReason: message,
				time: new Date().toLocaleTimeString("zh-TW", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					hour12: false,
				}),
			};
			setHistoryRecords((prev) => [failedRecord, ...prev].slice(0, 20));
		}
	};

	const deleteHistoryRecord = (id: string) => {
		setHistoryRecords((prev) => prev.filter((record) => record.id !== id));
	};

	const clearHistoryRecords = () => {
		setHistoryRecords([]);
	};

	return (
		<div
			className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_10%_20%,rgba(221,235,255,0.8),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(220,246,244,0.84),transparent_28%),linear-gradient(160deg,#e9f0fb,#dae9f8_45%,#d5e5f2)] px-4 py-6 text-slate-900"
			style={shellStyle}
		>
			<div
				className="pointer-events-none absolute inset-[-30vmax] z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.42),transparent_62%)] blur-[42px] transition"
				style={{
					filter: `blur(${48 - analyser.level * 20}px)`,
				}}
			/>
			<IntelligenceWaveBackground
				energy={analyser.displayEnergy}
				bars={analyser.bars}
			/>

			<div
				className={`relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-[1000px] flex-col items-center gap-5 ${
					stackDescription ? "justify-start pt-24" : "justify-center"
				}`}
			>
				<TopControlBar
					selectedQuestion={selectedQuestion}
					disabled={busy || recorder.isRecording}
					onQuestionChange={setSelectedQuestion}
					historyControl={
						<HistoryDropdown
							records={historyRecords}
							disabled={recorder.isRecording}
							onDeleteRecord={deleteHistoryRecord}
							onClearAll={clearHistoryRecords}
						/>
					}
					settingsControl={
						<MicSettingsModal
							isRecording={recorder.isRecording}
							selectedDeviceId={recorder.selectedDeviceId}
							micGain={recorder.micGain}
							devices={devices}
							onReloadDevices={() => void refreshDevices()}
							onDeviceChange={recorder.setSelectedDeviceId}
							onMicGainChange={recorder.setMicGain}
						/>
					}
				/>

				<AnimatePresence mode="wait">
					{!isIntroDone ? (
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
								description={selectedOption.description}
								className={
									stackDescription
										? "relative"
										: "pointer-events-auto absolute left-1/2 top-[5rem] z-10 -translate-x-1/2"
								}
							/>

							<CenterFeedback
								suggestions={selectedOption.examples}
								showSuggestionCarousel={showSuggestionCarousel}
								statusText={
									inputMode === "voice"
										? statusText
										: textBusy
											? "判斷中..."
											: ""
								}
								transcript={flow.transcript || textTranscript}
								resultText={resultText}
								isMatch={Boolean(textResult ?? flow.lastResult)}
								error={effectiveError}
							/>

							<div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
								{busy ? <Spinner size="sm" color="current" /> : null}
								<Tabs
									className="w-[min(92vw,760px)]"
									selectedKey={inputMode}
									onSelectionChange={(value) => {
										if (value === "voice") {
											setInputMode("voice");
											setTextError(null);
											return;
										}
										setInputMode("text");
										flow.reset();
									}}
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
													<PushToTalkButton
														disabled={busy}
														wave={{
															bars: analyser.bars,
															level: analyser.level,
															active: recorder.isRecording,
														}}
														isRecording={recorder.isRecording}
														onStart={onStart}
														onStop={onStop}
													/>
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
															onChange={(event) =>
																setTextInput(event.target.value)
															}
															onKeyDown={(event) => {
																if (event.key === "Enter" && !event.shiftKey) {
																	event.preventDefault();
																	void submitTextMode();
																}
															}}
															placeholder="輸入要判斷的內容..."
															className="h-11 w-full rounded-full border border-white/85 bg-white/82 px-4 text-[15px] text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
														/>
														<button
															type="button"
															disabled={textBusy}
															onClick={() => void submitTextMode()}
															className="inline-flex h-11 min-w-[88px] items-center justify-center rounded-full border border-sky-300/70 bg-[linear-gradient(135deg,#3b82f6,#2563eb)] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
														>
															送出
														</button>
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</Tabs>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
