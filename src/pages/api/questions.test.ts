import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoadQuestionOptions } = vi.hoisted(() => ({
	mockLoadQuestionOptions: vi.fn(),
}));

vi.mock("../../lib/server/questions", () => ({
	loadQuestionOptions: mockLoadQuestionOptions,
}));

import { GET } from "./questions";

describe("GET /api/questions", () => {
	beforeEach(() => {
		mockLoadQuestionOptions.mockReset();
	});

	it("returns 200 with questions payload", async () => {
		mockLoadQuestionOptions.mockResolvedValueOnce([
			{
				code: "1A",
				name: "Level of consciousness",
				description: "desc",
				examples: ["example"],
			},
		]);

		const response = await GET({} as never);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.questions).toHaveLength(1);
		expect(body.questions[0].code).toBe("1A");
	});

	it("returns 500 when loading questions fails", async () => {
		mockLoadQuestionOptions.mockRejectedValueOnce(new Error("broken file"));

		const response = await GET({} as never);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.code).toBe("INVALID_QUESTIONS_CONFIG");
		expect(body.error).toContain("broken file");
	});
});
