import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createHistoryRecord, type HistoryRecord } from "../lib/history";
import { QUESTION_OPTIONS, type QuestionCode } from "../lib/questions";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { useAudioInputDevices } from "./useAudioInputDevices";
import { useAudioRecorder } from "./useAudioRecorder";
import { useEvaluateFlow } from "./useEvaluateFlow";
import { useTranscriptionFlow } from "./useTranscriptionFlow";

const REQUEST_TIMEOUT_STORAGE_KEY = "ncku.voice.requestTimeoutMs";

export const useStrokeVoiceAppController = () => {
	const [requestTimeoutMs, setRequestTimeoutMs] = useState(20000);
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
			QUESTION_OPTIONS.find((option) => option.code === selectedQuestion) ??
			QUESTION_OPTIONS[0],
		[selectedQuestion],
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
		evaluateFlow.lastResult === null
			? ""
			: evaluateFlow.lastResult
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
					text: transcribed.text,
					result: evaluated.result,
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
					text,
					result: evaluated.result,
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
		showSuggestionCarousel,
		onStartVoice,
		onStopVoice,
		submitTextMode,
		handleInputModeChange,
		abortActiveSubmit,
	};
};
