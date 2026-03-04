import { z } from "zod";

const envSchema = z.object({
	GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
	GROQ_TRANSCRIBE_MODEL: z.string().min(1).default("whisper-large-v3-turbo"),
	EVALUATE_API_URL: z.string().url("EVALUATE_API_URL must be a valid URL"),
});

const parsedEnv = envSchema.safeParse({
	GROQ_API_KEY: import.meta.env.GROQ_API_KEY,
	GROQ_TRANSCRIBE_MODEL: import.meta.env.GROQ_TRANSCRIBE_MODEL,
	EVALUATE_API_URL: import.meta.env.EVALUATE_API_URL,
});

if (!parsedEnv.success) {
	const issues = parsedEnv.error.issues.map(
		(issue) => `${issue.path.join(".")}: ${issue.message}`,
	);
	throw new Error(
		`Invalid server environment variables:\n${issues.join("\n")}`,
	);
}

export const serverEnv = parsedEnv.data;
