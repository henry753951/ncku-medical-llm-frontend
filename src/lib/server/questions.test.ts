import { describe, expect, it } from "vitest";
import { questionsSchema } from "./questions";

describe("questionsSchema", () => {
	it("accepts valid questions config", () => {
		const input = [
			{
				code: "1A",
				name: "Level of consciousness",
				description: "desc",
				examples: ["example 1"],
			},
			{
				code: "1B",
				name: "LOC questions",
				description: "desc",
				examples: ["example 2"],
			},
		];

		const parsed = questionsSchema.safeParse(input);
		expect(parsed.success).toBe(true);
	});

	it("rejects duplicated code", () => {
		const input = [
			{
				code: "1A",
				name: "A",
				description: "desc",
				examples: ["example 1"],
			},
			{
				code: "1A",
				name: "B",
				description: "desc",
				examples: ["example 2"],
			},
		];

		const parsed = questionsSchema.safeParse(input);
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0]?.message).toContain(
				"duplicate question code",
			);
		}
	});

	it("rejects empty examples", () => {
		const input = [
			{
				code: "1A",
				name: "A",
				description: "desc",
				examples: [],
			},
		];

		const parsed = questionsSchema.safeParse(input);
		expect(parsed.success).toBe(false);
	});
});
