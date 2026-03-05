import { describe, expect, it } from "vitest";
import { evaluateRequestSchema, evaluateResponseSchema } from "./schemas";

describe("evaluateRequestSchema", () => {
	it("accepts valid request payload", () => {
		const parsed = evaluateRequestSchema.safeParse({
			question: "1A",
			text: "先生您好",
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects empty text", () => {
		const parsed = evaluateRequestSchema.safeParse({
			question: "1A",
			text: "   ",
		});
		expect(parsed.success).toBe(false);
	});
});

describe("evaluateResponseSchema", () => {
	it("accepts success response with latency", () => {
		const parsed = evaluateResponseSchema.safeParse({
			result: "成功",
			reason: "符合要求",
			latency: 3.2,
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts response without latency", () => {
		const parsed = evaluateResponseSchema.safeParse({
			result: "Error",
			reason: "無效題號",
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects empty reason", () => {
		const parsed = evaluateResponseSchema.safeParse({
			result: "失敗",
			reason: "",
		});
		expect(parsed.success).toBe(false);
	});
});
