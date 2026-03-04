import { useCallback, useState } from "react";
import type { QuestionCode } from "../lib/questions";
import type { EvaluateState, TranscribeState } from "../lib/types";

type SubmitInput = {
	blob: Blob;
	mimeType: string;
	question: QuestionCode;
	durationMs: number;
	maxRms: number;
	maxPeak: number;
};

type ApiError = {
	error?: string;
	code?: string;
};

const extractErrorMessage = async (response: Response, fallback: string) => {
	try {
		const payload = (await response.json()) as ApiError;
		return payload.error ?? fallback;
	} catch {
		return fallback;
	}
};

const analyzeAudioBlob = async (blob: Blob) => {
	const context = new AudioContext();
	try {
		const arrayBuffer = await blob.arrayBuffer();
		const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
		const channel = buffer.getChannelData(0);
		let rms = 0;
		let peak = 0;
		const step = 256;
		for (let i = 0; i < channel.length; i += step) {
			const sample = channel[i] ?? 0;
			rms += sample * sample;
			peak = Math.max(peak, Math.abs(sample));
		}
		rms = Math.sqrt(rms / Math.max(1, Math.floor(channel.length / step)));
		return {
			durationSec: buffer.duration,
			rms,
			peak,
		};
	} finally {
		void context.close();
	}
};

export const useTranscriptionFlow = () => {
	const [transcribeState, setTranscribeState] =
		useState<TranscribeState>("idle");
	const [evaluateState, setEvaluateState] = useState<EvaluateState>("idle");
	const [transcript, setTranscript] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [lastResult, setLastResult] = useState<boolean | null>(null);

	const submit = useCallback(
		async ({
			blob,
			mimeType,
			question,
			durationMs,
			maxRms,
			maxPeak,
		}: SubmitInput) => {
			setError(null);
			setLastResult(null);
			setEvaluateState("idle");

			if (durationMs < 450) {
				setTranscribeState("error");
				setEvaluateState("error");
				const message = "錄音太短，請至少說 0.5 秒以上。";
				setError(message);
				throw new Error(message);
			}

			const frontendTooQuiet = maxRms < 0.012 && maxPeak < 0.08;
			if (frontendTooQuiet) {
				setTranscribeState("error");
				setEvaluateState("error");
				const message = "音量太小，未達辨識門檻，請靠近麥克風再試一次。";
				setError(message);
				throw new Error(message);
			}

			try {
				const analyzed = await analyzeAudioBlob(blob);
				const likelySilent =
					analyzed.durationSec < 0.45 ||
					(analyzed.rms < 0.006 && analyzed.peak < 0.03);
				if (likelySilent) {
					setTranscribeState("error");
					setEvaluateState("error");
					const message = "未偵測到清晰語音，請再說一次。";
					setError(message);
					throw new Error(message);
				}
			} catch (analysisError) {
				if (
					analysisError instanceof Error &&
					analysisError.message.includes("未偵測")
				) {
					throw analysisError;
				}
				// Ignore decode failures for unsupported mime on some browsers and fallback to server-side checks.
			}

			setTranscribeState("transcribing");

			const formData = new FormData();
			formData.append("audio", blob, "speech.webm");
			formData.append("mimeType", mimeType);
			formData.append("language", "zh");

			const transcribeResponse = await fetch("/api/transcribe", {
				method: "POST",
				body: formData,
			});

			if (!transcribeResponse.ok) {
				setTranscribeState("error");
				setEvaluateState("error");
				const message = await extractErrorMessage(
					transcribeResponse,
					"語音辨識失敗，請再試一次。",
				);
				setError(message);
				throw new Error(message);
			}

			const transcribeJson = (await transcribeResponse.json()) as {
				text?: string;
			};
			const text = transcribeJson.text?.trim() ?? "";
			if (!text) {
				setTranscribeState("error");
				setEvaluateState("error");
				const message = "辨識結果為空白，請重新錄音。";
				setError(message);
				throw new Error(message);
			}

			setTranscript(text);
			setTranscribeState("done");
			setEvaluateState("checking");

			const evaluateResponse = await fetch("/api/evaluate", {
				method: "POST",
				headers: {
					"content-type": "application/json; charset=utf-8",
				},
				body: JSON.stringify({
					question,
					text,
				}),
			});

			if (!evaluateResponse.ok) {
				setEvaluateState("error");
				const message = await extractErrorMessage(
					evaluateResponse,
					"題目判斷服務暫時無法使用。",
				);
				setError(message);
				throw new Error(message);
			}

			const evaluateJson = (await evaluateResponse.json()) as {
				result?: boolean;
			};
			const result = Boolean(evaluateJson.result);
			setLastResult(result);
			setEvaluateState(result ? "match" : "mismatch");
			return {
				text,
				result,
			};
		},
		[],
	);

	const markRecording = useCallback(() => {
		setError(null);
		setTranscript("");
		setLastResult(null);
		setTranscribeState("recording");
		setEvaluateState("idle");
	}, []);

	const reset = useCallback(() => {
		setError(null);
		setLastResult(null);
		setTranscript("");
		setTranscribeState("idle");
		setEvaluateState("idle");
	}, []);

	return {
		transcribeState,
		evaluateState,
		transcript,
		error,
		lastResult,
		submit,
		markRecording,
		reset,
	};
};
