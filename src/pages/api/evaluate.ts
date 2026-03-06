import type { APIRoute } from "astro";
import { serverEnv } from "../../lib/server/env";
import { loadQuestionOptions } from "../../lib/server/questions";
import {
	evaluateRequestSchema,
	evaluateResponseSchema,
} from "../../lib/server/schemas";

export const prerender = false;

const toError = (status: number, code: string, error: string) =>
	new Response(JSON.stringify({ code, error }), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});

export const POST: APIRoute = async ({ request }) => {
	let jsonBody: unknown;
	try {
		jsonBody = await request.json();
	} catch {
		return toError(400, "INVALID_JSON", "Request body must be valid JSON.");
	}

	const parsedRequest = evaluateRequestSchema.safeParse(jsonBody);
	if (!parsedRequest.success) {
		return toError(
			400,
			"INVALID_REQUEST",
			parsedRequest.error.issues[0]?.message ??
				"Invalid evaluate request format.",
		);
	}

	let questionCodes: string[];
	try {
		const questions = await loadQuestionOptions();
		questionCodes = questions.map((question) => question.code);
	} catch (error) {
		return toError(
			500,
			"INVALID_QUESTIONS_CONFIG",
			error instanceof Error ? error.message : "Failed to load questions.json.",
		);
	}

	if (!questionCodes.includes(parsedRequest.data.question)) {
		return toError(400, "INVALID_QUESTION", "無效題號");
	}

	let upstreamResponse: Response;
	try {
		upstreamResponse = await fetch(serverEnv.EVALUATE_API_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
			body: JSON.stringify(parsedRequest.data),
		});
	} catch {
		return toError(
			502,
			"EVALUATE_UNREACHABLE",
			"Cannot reach evaluate backend.",
		);
	}

	if (!upstreamResponse.ok) {
		const payload = await upstreamResponse.text();
		return toError(
			502,
			"EVALUATE_UPSTREAM_FAILURE",
			`Evaluate backend failed (${upstreamResponse.status}): ${payload.slice(0, 200)}`,
		);
	}

	let upstreamJson: unknown;
	try {
		upstreamJson = await upstreamResponse.json();
	} catch {
		return toError(
			502,
			"EVALUATE_INVALID_JSON",
			"Evaluate backend returned invalid JSON.",
		);
	}

	const parsedResponse = evaluateResponseSchema.safeParse(upstreamJson);
	if (!parsedResponse.success) {
		return toError(
			502,
			"EVALUATE_SCHEMA_MISMATCH",
			"Evaluate backend response must include { result: string, reason: string, latency?: number }.",
		);
	}

	return new Response(JSON.stringify(parsedResponse.data), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});
};
