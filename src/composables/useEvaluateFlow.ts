import { useCallback, useState } from "react";
import type { QuestionCode } from "../lib/questions";
import type { EvaluateState } from "../lib/types";

type SubmitInput = {
	question: QuestionCode;
	text: string;
	timeoutMs: number;
};

type ApiError = {
	error?: string;
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

export const useEvaluateFlow = () => {
	const [state, setState] = useState<EvaluateState>("idle");
	const [error, setError] = useState<string | null>(null);
	const [lastResult, setLastResult] = useState<boolean | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [activeController, setActiveController] =
		useState<AbortController | null>(null);

	const submit = useCallback(
		async ({ question, text, timeoutMs }: SubmitInput) => {
			if (isSubmitting) {
				throw new Error("目前已有判斷請求進行中。");
			}
			setIsSubmitting(true);
			setError(null);
			setLastResult(null);
			setState("checking");

			const controller = new AbortController();
			setActiveController(controller);

			try {
				const evaluateResponse = await fetchWithTimeout("/api/evaluate", {
					method: "POST",
					headers: {
						"content-type": "application/json; charset=utf-8",
					},
					body: JSON.stringify({
						question,
						text,
					}),
					timeoutMs,
					signal: controller.signal,
				});

				if (!evaluateResponse.ok) {
					const message = await extractErrorMessage(
						evaluateResponse,
						"題目判斷服務暫時無法使用。",
					);
					setState("error");
					setError(message);
					throw new Error(message);
				}

				const evaluateJson = (await evaluateResponse.json()) as {
					result?: boolean;
				};
				const result = Boolean(evaluateJson.result);
				setLastResult(result);
				setState(result ? "match" : "mismatch");
				return { result };
			} catch (submitError) {
				if (submitError instanceof Error && submitError.name === "AbortError") {
					const message = "已中止送出或等待逾時，請再試一次。";
					setState("error");
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

	const reset = useCallback(() => {
		activeController?.abort();
		setState("idle");
		setError(null);
		setLastResult(null);
	}, [activeController]);

	return {
		state,
		error,
		lastResult,
		isSubmitting,
		submit,
		abort,
		reset,
	};
};

