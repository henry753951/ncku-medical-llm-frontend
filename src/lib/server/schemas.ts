import { z } from "zod";

export const questionCodeSchema = z.string().trim().min(1);

export const evaluateRequestSchema = z.object({
	question: questionCodeSchema,
	text: z
		.string()
		.trim()
		.min(1, "text cannot be empty")
		.max(8000, "text is too long"),
});

export const evaluateResponseSchema = z.object({
	result: z.string().min(1, "result cannot be empty"),
	reason: z.string().min(1, "reason cannot be empty"),
	latency: z.number().nonnegative().optional(),
});

export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;
export type EvaluateResponse = z.infer<typeof evaluateResponseSchema>;
