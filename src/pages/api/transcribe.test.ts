import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/server/env", () => ({
	serverEnv: {
		GROQ_API_KEY: "test-key",
		GROQ_TRANSCRIBE_MODEL: "whisper-large-v3-turbo",
		EVALUATE_API_URL: "https://example.com/evaluate",
	},
}));

vi.mock("opencc-js", () => ({
	Converter: () => (text: string) => text,
}));

import { POST } from "./transcribe";

const createMultipartRequest = (formData: FormData) =>
	new Request("http://localhost/api/transcribe", {
		method: "POST",
		body: formData,
	});

describe("POST /api/transcribe", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 415 for non-multipart request", async () => {
		const request = new Request("http://localhost/api/transcribe", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({}),
		});

		const response = await POST({ request } as never);
		expect(response.status).toBe(415);
	});

	it("returns 400 when audio is missing", async () => {
		const formData = new FormData();
		const response = await POST({ request: createMultipartRequest(formData) } as never);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.code).toBe("AUDIO_REQUIRED");
	});

	it("returns 400 when audio type is unsupported", async () => {
		const formData = new FormData();
		formData.append(
			"audio",
			new File(["abc"], "recording.txt", { type: "text/plain" }),
		);

		const response = await POST({ request: createMultipartRequest(formData) } as never);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.code).toBe("UNSUPPORTED_AUDIO_TYPE");
	});

	it("returns 502 when upstream is unreachable", async () => {
		const formData = new FormData();
		formData.append(
			"audio",
			new File(["abc"], "recording.webm", { type: "audio/webm" }),
		);
		vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));

		const response = await POST({ request: createMultipartRequest(formData) } as never);
		const body = await response.json();

		expect(response.status).toBe(502);
		expect(body.code).toBe("UPSTREAM_UNREACHABLE");
	});

	it("returns 502 when upstream auth fails", async () => {
		const formData = new FormData();
		formData.append(
			"audio",
			new File(["abc"], "recording.webm", { type: "audio/webm" }),
		);
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response("forbidden", { status: 401 }),
		);

		const response = await POST({ request: createMultipartRequest(formData) } as never);
		const body = await response.json();

		expect(response.status).toBe(502);
		expect(body.code).toBe("UPSTREAM_AUTH_FAILED");
	});

	it("returns 422 when no speech detected", async () => {
		const formData = new FormData();
		formData.append(
			"audio",
			new File(["abc"], "recording.webm", { type: "audio/webm" }),
		);
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ text: "" }), { status: 200 }),
		);

		const response = await POST({ request: createMultipartRequest(formData) } as never);
		const body = await response.json();

		expect(response.status).toBe(422);
		expect(body.code).toBe("NO_SPEECH_DETECTED");
	});

	it("returns 200 for valid transcription response", async () => {
		const formData = new FormData();
		formData.append(
			"audio",
			new File(["abc"], "recording.webm", { type: "audio/webm" }),
		);
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					text: "醫師詢問病人是否不舒服",
					duration: 2.1,
					segments: [{ no_speech_prob: 0.1 }],
				}),
				{ status: 200 },
			),
		);

		const response = await POST({ request: createMultipartRequest(formData) } as never);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.text).toBe("醫師詢問病人是否不舒服");
		expect(typeof body.durationMs).toBe("number");
	});
});
