import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createHistoryRecord, type HistoryRecord } from "../lib/history";
import type {
	QuestionCode,
	QuestionOption,
	QuestionsApiResponse,
} from "../lib/questions";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { useAudioInputDevices } from "./useAudioInputDevices";
import { useAudioRecorder } from "./useAudioRecorder";
import { useEvaluateFlow } from "./useEvaluateFlow";
import { useTranscriptionFlow } from "./useTranscriptionFlow";

const REQUEST_TIMEOUT_STORAGE_KEY = "ncku.voice.requestTimeoutMs";

export const useStrokeVoiceAppController = () => {
	const [requestTimeoutMs, setRequestTimeoutMs] = useState(20000);
	const [questionOptions, setQuestionOptions] = useState<QuestionOption[]>([]);
	const [questionsLoading, setQuestionsLoading] = useState(true);
	const [selectedQuestion, setSelectedQuestion] = useState<QuestionCode>("");
	const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
	const [now, setNow] = useState(() => Date.now());
	const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
	const [stackDescription, setStackDescription] = useState(false);
	const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
	const [textInput, setTextInput] = useState("");
	const [textTranscript, setTextTranscript] = useState("");
	const [localError, setLocalError] = useState<string | null>(null);
	const [isIntroDone, setIsIntroDone] = useState(false);

	const recorder = useAudioRecorder();
	const analyser = useAudioAnalyser(recorder.stream, recorder.isRecording);
	const transcriptionFlow = useTranscriptionFlow();
	const evaluateFlow = useEvaluateFlow();
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
			questionOptions.find((option) => option.code === selectedQuestion) ??
			questionOptions[0] ?? {
				code: "",
				name: "尚未載入題目",
				description: "請稍候，正在從後端載入題目設定。",
				examples: [] as string[],
			},
		[questionOptions, selectedQuestion],
	);

	const busy = transcriptionFlow.isSubmitting || evaluateFlow.isSubmitting;
	const effectiveError =
		recorder.error ??
		transcriptionFlow.error ??
		evaluateFlow.error ??
		localError;

	const statusText = recorder.isRecording
		? "正在聆聽..."
		: transcriptionFlow.transcribeState === "transcribing"
			? "辨識中..."
			: evaluateFlow.state === "checking"
				? "判斷中..."
				: "";

	const resultText =
		evaluateFlow.state === "match"
			? "符合此題要求"
			: evaluateFlow.state === "mismatch"
				? "不符合此題要求"
				: "";

	const idleMs = now - lastActivityAt;
	const showSuggestionCarousel =
		isIntroDone &&
		!busy &&
		!effectiveError &&
		(recorder.isRecording ||
			(idleMs >= 6500 && !(textTranscript.trim().length > 0)));

	const pushHistory = useCallback((record: HistoryRecord) => {
		setHistoryRecords((prev) => [record, ...prev].slice(0, 20));
	}, []);

	const abortActiveSubmit = useCallback(() => {
		transcriptionFlow.abort();
		evaluateFlow.abort();
	}, [transcriptionFlow.abort, evaluateFlow.abort]);

	const abortRef = useRef(abortActiveSubmit);
	abortRef.current = abortActiveSubmit;

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const savedTimeoutMs = Number(
			window.localStorage.getItem(REQUEST_TIMEOUT_STORAGE_KEY),
		);
		if (
			Number.isFinite(savedTimeoutMs) &&
			savedTimeoutMs >= 5000 &&
			savedTimeoutMs <= 60000
		) {
			setRequestTimeoutMs(savedTimeoutMs);
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		let isActive = true;
		const loadQuestions = async () => {
			setQuestionsLoading(true);
			try {
				const response = await fetch("/api/questions", {
					signal: controller.signal,
				});
				if (!response.ok) {
					throw new Error("無法載入題目設定。");
				}
				const payload = (await response.json()) as QuestionsApiResponse;
				if (!isActive) {
					return;
				}
				setQuestionOptions(payload.questions);
				setLocalError(null);
				setSelectedQuestion((current) => {
					if (payload.questions.some((question) => question.code === current)) {
						return current;
					}
					return payload.questions[0]?.code ?? "";
				});
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return;
				}
				if (!isActive) {
					return;
				}
				setLocalError(
					error instanceof Error
						? error.message
						: "題目設定載入失敗，請稍後再試。",
				);
			} finally {
				if (isActive) {
					setQuestionsLoading(false);
				}
			}
		};

		void loadQuestions();
		return () => {
			isActive = false;
			controller.abort();
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		window.localStorage.setItem(
			REQUEST_TIMEOUT_STORAGE_KEY,
			String(requestTimeoutMs),
		);
	}, [requestTimeoutMs]);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 400);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		const timer = window.setTimeout(() => setIsIntroDone(true), 1450);
		return () => window.clearTimeout(timer);
	}, []);

	useEffect(() => {
		return () => {
			abortRef.current();
		};
	}, []);

	useEffect(() => {
		const estimateAndSetLayout = () => {
			const viewportH = window.innerHeight;
			const descBottomEstimate = 12 + 52 + 14 + 170;
			const centerAreaTopEstimate = viewportH * 0.5 - 120;
			setStackDescription(descBottomEstimate + 20 > centerAreaTopEstimate);
		};

		estimateAndSetLayout();
		window.addEventListener("resize", estimateAndSetLayout);
		return () => window.removeEventListener("resize", estimateAndSetLayout);
	}, []);

	useEffect(() => {
		if (transcriptionFlow.transcript.trim().length > 0) {
			setLastActivityAt(Date.now());
		}
	}, [transcriptionFlow.transcript]);

	const onStartVoice = async () => {
		setLastActivityAt(Date.now());
		setLocalError(null);
		if (!selectedQuestion) {
			setLocalError("題目尚未載入完成，請稍後再試。");
			return false;
		}
		evaluateFlow.reset();
		transcriptionFlow.markRecording();
		const started = await recorder.startRecording();
		if (!started) {
			transcriptionFlow.reset();
			return false;
		}
		await refreshDevices();
		return true;
	};

	const onStopVoice = async () => {
		const clip = await recorder.stopRecording();
		setLastActivityAt(Date.now());
		if (!clip) {
			return;
		}
		if (!selectedQuestion) {
			setLocalError("題目尚未載入完成，請稍後再試。");
			return;
		}

		try {
			const transcribed = await transcriptionFlow.submit({
				blob: clip.blob,
				mimeType: clip.mimeType,
				durationMs: clip.durationMs,
				maxRms: clip.maxRms,
				maxPeak: clip.maxPeak,
				timeoutMs: requestTimeoutMs,
			});
			const evaluated = await evaluateFlow.submit({
				question: selectedQuestion,
				text: transcribed.text,
				timeoutMs: requestTimeoutMs,
			});

			pushHistory(
				createHistoryRecord({
					questionCode: selectedQuestion,
					questionName: selectedOption.name,
					text: transcribed.text,
					result: evaluated.isMatch,
				}),
			);
		} catch (error) {
			const message =
				error instanceof Error && error.message.trim().length > 0
					? error.message
					: "未知錯誤";
			const fallbackTranscript =
				transcriptionFlow.transcript.trim() || undefined;
			pushHistory(
				createHistoryRecord({
					questionCode: selectedQuestion,
					text: fallbackTranscript,
					result: null,
					errorReason: message,
				}),
			);
		}
	};

	const submitTextMode = async () => {
		const text = textInput.trim();
		setLocalError(null);
		if (!text) {
			setLocalError("請先輸入文字再送出。");
			return;
		}
		if (!selectedQuestion) {
			setLocalError("題目尚未載入完成，請稍後再試。");
			return;
		}

		setTextTranscript(text);
		setLastActivityAt(Date.now());
		try {
			const evaluated = await evaluateFlow.submit({
				question: selectedQuestion,
				text,
				timeoutMs: requestTimeoutMs,
			});
			pushHistory(
				createHistoryRecord({
					questionCode: selectedQuestion,
					questionName: selectedOption.name,
					text,
					result: evaluated.isMatch,
				}),
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : "未知錯誤";
			pushHistory(
				createHistoryRecord({
					questionCode: selectedQuestion,
					text,
					result: null,
					errorReason: message,
				}),
			);
		}
	};

	const handleInputModeChange = (mode: "voice" | "text") => {
		abortActiveSubmit();
		setLocalError(null);
		setInputMode(mode);
		if (mode === "text") {
			transcriptionFlow.reset();
			return;
		}
		setTextTranscript("");
	};

	return {
		requestTimeoutMs,
		setRequestTimeoutMs,
		questionOptions,
		questionsLoading,
		selectedQuestion,
		setSelectedQuestion,
		historyRecords,
		setHistoryRecords,
		stackDescription,
		inputMode,
		textInput,
		setTextInput,
		textTranscript,
		isIntroDone,
		recorder,
		analyser,
		transcriptionFlow,
		evaluateFlow,
		devices,
		refreshDevices,
		shellStyle,
		selectedOption,
		busy,
		effectiveError,
		statusText,
		resultText,
		resultReason: evaluateFlow.lastReason,
		resultLatency: evaluateFlow.lastLatency,
		showSuggestionCarousel,
		onStartVoice,
		onStopVoice,
		submitTextMode,
		handleInputModeChange,
		abortActiveSubmit,
	};
};
