import type { APIRoute } from "astro";
import { loadQuestionOptions } from "../../lib/server/questions";

export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		const questions = await loadQuestionOptions();
		return new Response(JSON.stringify({ questions }), {
			status: 200,
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				code: "INVALID_QUESTIONS_CONFIG",
				error:
					error instanceof Error
						? error.message
						: "Failed to load questions.json.",
			}),
			{
				status: 500,
				headers: {
					"content-type": "application/json; charset=utf-8",
				},
			},
		);
	}
};
