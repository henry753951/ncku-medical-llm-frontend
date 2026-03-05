import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/server/questions", () => ({
	loadQuestionOptions: vi.fn(),
}));

vi.mock("../../lib/server/env", () => ({
	serverEnv: {
		EVALUATE_API_URL: "https://example.com/evaluate",
	},
}));

import { POST } from "./evaluate";
import { loadQuestionOptions } from "../../lib/server/questions";

const createJsonRequest = (payload: unknown) =>
	new Request("http://localhost/api/evaluate", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(payload),
	});

describe("POST /api/evaluate", () => {
	const mockedLoadQuestionOptions = vi.mocked(loadQuestionOptions);

	beforeEach(() => {
		mockedLoadQuestionOptions.mockReset();
		vi.restoreAllMocks();
	});

	it("returns 400 for invalid JSON body", async () => {
		const request = new Request("http://localhost/api/evaluate", {
			method: "POST",
			body: "not-json",
		});

		const response = await POST({ request } as never);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.code).toBe("INVALID_JSON");
	});

	it("returns 400 for invalid request payload", async () => {
		const response = await POST({
			request: createJsonRequest({ question: "1A", text: "   " }),
		} as never);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.code).toBe("INVALID_REQUEST");
	});

	it("returns 500 when questions config fails", async () => {
		mockedLoadQuestionOptions.mockRejectedValueOnce(new Error("bad config"));

		const response = await POST({
			request: createJsonRequest({ question: "1A", text: "hello" }),
		} as never);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.code).toBe("INVALID_QUESTIONS_CONFIG");
	});

	it("returns 400 for unknown question code", async () => {
		mockedLoadQuestionOptions.mockResolvedValueOnce([
			{ code: "1B", name: "q", description: "d", examples: ["x"] },
		]);

		const response = await POST({
			request: createJsonRequest({ question: "1A", text: "hello" }),
		} as never);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.code).toBe("INVALID_QUESTION");
	});

	it("returns 502 when upstream is unreachable", async () => {
		mockedLoadQuestionOptions.mockResolvedValueOnce([
			{ code: "1A", name: "q", description: "d", examples: ["x"] },
		]);
		vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));

		const response = await POST({
			request: createJsonRequest({ question: "1A", text: "hello" }),
		} as never);
		const body = await response.json();

		expect(response.status).toBe(502);
		expect(body.code).toBe("EVALUATE_UNREACHABLE");
	});

	it("returns 502 when upstream response schema is invalid", async () => {
		mockedLoadQuestionOptions.mockResolvedValueOnce([
			{ code: "1A", name: "q", description: "d", examples: ["x"] },
		]);
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ result: "成功" }), { status: 200 }),
		);

		const response = await POST({
			request: createJsonRequest({ question: "1A", text: "hello" }),
		} as never);
		const body = await response.json();

		expect(response.status).toBe(502);
		expect(body.code).toBe("EVALUATE_SCHEMA_MISMATCH");
	});

	it("returns 200 for valid upstream response", async () => {
		mockedLoadQuestionOptions.mockResolvedValueOnce([
			{ code: "1A", name: "q", description: "d", examples: ["x"] },
		]);
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					result: "成功",
					reason: "符合要求",
					latency: 1.23,
				}),
				{ status: 200 },
			),
		);

		const response = await POST({
			request: createJsonRequest({ question: "1A", text: "hello" }),
		} as never);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			result: "成功",
			reason: "符合要求",
			latency: 1.23,
		});
	});
});
