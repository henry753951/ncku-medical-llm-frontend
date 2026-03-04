import { z } from "zod";
import { QUESTION_CODES } from "../questions";

export const questionCodeSchema = z.enum(QUESTION_CODES);

export const evaluateRequestSchema = z.object({
	question: questionCodeSchema,
	text: z
		.string()
		.trim()
		.min(1, "text cannot be empty")
		.max(8000, "text is too long"),
});

export const evaluateResponseSchema = z.object({
	result: z.boolean(),
});
