import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/server/questions", () => ({
	loadQuestionOptions: vi.fn(),
}));

import { loadQuestionOptions } from "../../lib/server/questions";
import { GET } from "./questions";

describe("GET /api/questions", () => {
	const mockedLoadQuestionOptions = vi.mocked(loadQuestionOptions);

	beforeEach(() => {
		mockedLoadQuestionOptions.mockReset();
	});

	it("returns 200 with questions payload", async () => {
		mockedLoadQuestionOptions.mockResolvedValueOnce([
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
		mockedLoadQuestionOptions.mockRejectedValueOnce(new Error("broken file"));

		const response = await GET({} as never);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.code).toBe("INVALID_QUESTIONS_CONFIG");
		expect(body.error).toContain("broken file");
	});
});
