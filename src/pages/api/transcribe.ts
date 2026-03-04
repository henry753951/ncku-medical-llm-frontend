import type { APIRoute } from "astro";
import { Converter } from "opencc-js";
import { z } from "zod";
import { serverEnv } from "../../lib/server/env";

export const prerender = false;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const SAFE_MIME_TYPES = new Set([
	"audio/webm",
	"audio/webm;codecs=opus",
	"audio/mp4",
	"audio/mpeg",
	"audio/wav",
	"audio/x-wav",
	"audio/ogg",
	"audio/ogg;codecs=opus",
]);

const metadataSchema = z.object({
	mimeType: z.string().trim().min(3).max(64).optional(),
	language: z.string().trim().min(2).max(12).default("zh"),
});

const groqTranscriptionSchema = z.object({
	text: z.string().optional().default(""),
	duration: z.number().optional(),
	segments: z
		.array(
			z
				.object({
					no_speech_prob: z.number().optional(),
				})
				.loose(),
		)
		.optional(),
});

const toError = (status: number, code: string, error: string) =>
	new Response(JSON.stringify({ code, error }), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});

const toTraditionalChinese = Converter({ from: "cn", to: "tw" });

export const POST: APIRoute = async ({ request }) => {
	if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
		return toError(
			415,
			"UNSUPPORTED_MEDIA_TYPE",
			"Expected multipart/form-data request.",
		);
	}

	const formData = await request.formData();
	const audio = formData.get("audio");
	if (!(audio instanceof File)) {
		return toError(400, "AUDIO_REQUIRED", "audio file is required.");
	}

	if (audio.size === 0) {
		return toError(400, "AUDIO_EMPTY", "audio file is empty.");
	}

	if (audio.size > MAX_AUDIO_BYTES) {
		return toError(400, "AUDIO_TOO_LARGE", "audio exceeds 10MB limit.");
	}

	const metadataResult = metadataSchema.safeParse({
		mimeType: formData.get("mimeType") ?? undefined,
		language: formData.get("language") ?? undefined,
	});

	if (!metadataResult.success) {
		return toError(
			400,
			"INVALID_METADATA",
			metadataResult.error.issues[0]?.message ?? "Invalid metadata.",
		);
	}

	const { language, mimeType } = metadataResult.data;
	const audioMimeType = mimeType || audio.type;
	if (audioMimeType && !SAFE_MIME_TYPES.has(audioMimeType)) {
		return toError(
			400,
			"UNSUPPORTED_AUDIO_TYPE",
			`Unsupported audio type: ${audioMimeType}`,
		);
	}

	const upstreamPayload = new FormData();
	upstreamPayload.append("file", audio, audio.name || "recording.webm");
	upstreamPayload.append("model", serverEnv.GROQ_TRANSCRIBE_MODEL);
	upstreamPayload.append("language", language);
	upstreamPayload.append("response_format", "verbose_json");

	const startedAt = Date.now();
	let upstreamResponse: Response;
	try {
		upstreamResponse = await fetch(
			"https://api.groq.com/openai/v1/audio/transcriptions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`,
				},
				body: upstreamPayload,
			},
		);
	} catch {
		return toError(
			502,
			"UPSTREAM_UNREACHABLE",
			"Cannot reach Groq transcription service.",
		);
	}

	if (!upstreamResponse.ok) {
		const upstreamText = await upstreamResponse.text();
		if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
			return toError(
				502,
				"UPSTREAM_AUTH_FAILED",
				"Groq authentication failed.",
			);
		}
		if (upstreamResponse.status === 429) {
			return toError(
				503,
				"UPSTREAM_RATE_LIMIT",
				"Groq transcription rate-limited the request.",
			);
		}
		return toError(
			502,
			"UPSTREAM_FAILURE",
			`Groq transcription failed (${upstreamResponse.status}): ${upstreamText.slice(0, 200)}`,
		);
	}

	let upstreamJson: unknown;
	try {
		upstreamJson = await upstreamResponse.json();
	} catch {
		return toError(
			502,
			"UPSTREAM_INVALID_JSON",
			"Groq returned an invalid JSON payload.",
		);
	}

	const parsed = groqTranscriptionSchema.safeParse(upstreamJson);
	if (!parsed.success) {
		return toError(
			502,
			"UPSTREAM_SCHEMA_MISMATCH",
			"Groq response does not include a valid text field.",
		);
	}

	const normalizedText = toTraditionalChinese(parsed.data.text).trim();
	const speechSegments =
		parsed.data.segments?.filter(
			(segment) => typeof segment.no_speech_prob === "number",
		) ?? [];
	const averageNoSpeechProb =
		speechSegments.length > 0
			? speechSegments.reduce(
					(sum, segment) => sum + (segment.no_speech_prob ?? 0),
					0,
				) / speechSegments.length
			: null;
	const likelySilent =
		normalizedText.length === 0 ||
		(typeof parsed.data.duration === "number" && parsed.data.duration < 0.45) ||
		(averageNoSpeechProb !== null &&
			averageNoSpeechProb > 0.62 &&
			normalizedText.length < 10);

	if (likelySilent) {
		return toError(422, "NO_SPEECH_DETECTED", "未偵測到清晰語音，請再試一次。");
	}

	return new Response(
		JSON.stringify({
			text: normalizedText,
			durationMs: Date.now() - startedAt,
		}),
		{
			status: 200,
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
		},
	);
};
