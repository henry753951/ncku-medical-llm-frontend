import { useCallback, useState } from "react";
import type { TranscribeState } from "../lib/types";

type SubmitInput = {
	blob: Blob;
	mimeType: string;
	durationMs: number;
	maxRms: number;
	maxPeak: number;
	timeoutMs: number;
};

type ApiError = {
	error?: string;
	code?: string;
};

type TimeoutFetchOptions = RequestInit & {
	timeoutMs: number;
	signal?: AbortSignal;
};

const extractErrorMessage = async (response: Response, fallback: string) => {
	try {
		const payload = (await response.json()) as ApiError;
		return payload.error ?? fallback;
	} catch {
		return fallback;
	}
};

const fetchWithTimeout = async (url: string, options: TimeoutFetchOptions) => {
	const { timeoutMs, signal, ...requestInit } = options;
	const timeoutController = new AbortController();
	const relayAbort = () => timeoutController.abort();
	if (signal) {
		if (signal.aborted) {
			timeoutController.abort();
		} else {
			signal.addEventListener("abort", relayAbort, { once: true });
		}
	}
	const timer = window.setTimeout(() => timeoutController.abort(), timeoutMs);
	try {
		return await fetch(url, {
			...requestInit,
			signal: timeoutController.signal,
		});
	} finally {
		window.clearTimeout(timer);
		if (signal) {
			signal.removeEventListener("abort", relayAbort);
		}
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
	const [transcript, setTranscript] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [activeController, setActiveController] =
		useState<AbortController | null>(null);

	const submit = useCallback(
		async ({
			blob,
			mimeType,
			durationMs,
			maxRms,
			maxPeak,
			timeoutMs,
		}: SubmitInput) => {
			if (isSubmitting) {
				throw new Error("目前已有請求進行中。");
			}
			setError(null);
			setIsSubmitting(true);

			const controller = new AbortController();
			setActiveController(controller);
			try {
				if (durationMs < 450) {
					setTranscribeState("error");
					const message = "錄音太短，請至少說 0.5 秒以上。";
					setError(message);
					throw new Error(message);
				}

				const frontendTooQuiet = maxRms < 0.012 && maxPeak < 0.08;
				if (frontendTooQuiet) {
					setTranscribeState("error");
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

				const transcribeResponse = await fetchWithTimeout("/api/transcribe", {
					method: "POST",
					body: formData,
					timeoutMs,
					signal: controller.signal,
				});

				if (!transcribeResponse.ok) {
					setTranscribeState("error");
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
					const message = "辨識結果為空白，請重新錄音。";
					setError(message);
					throw new Error(message);
				}

				setTranscript(text);
				setTranscribeState("done");
				return {
					text,
				};
			} catch (submitError) {
				if (submitError instanceof Error && submitError.name === "AbortError") {
					setTranscribeState("error");
					const message = "已中止送出或等待逾時，請再試一次。";
					setError(message);
					throw new Error(message);
				}
				throw submitError;
			} finally {
				setIsSubmitting(false);
				setActiveController(null);
			}
		},
		[isSubmitting],
	);

	const abort = useCallback(() => {
		activeController?.abort();
	}, [activeController]);

	const markRecording = useCallback(() => {
		setError(null);
		setTranscript("");
		setTranscribeState("recording");
	}, []);

	const reset = useCallback(() => {
		activeController?.abort();
		setError(null);
		setTranscript("");
		setTranscribeState("idle");
	}, [activeController]);

	return {
		transcribeState,
		transcript,
		error,
		isSubmitting,
		submit,
		abort,
		markRecording,
		reset,
	};
};
