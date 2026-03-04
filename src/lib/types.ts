export type TranscribeState =
	| "idle"
	| "recording"
	| "transcribing"
	| "done"
	| "error";

export type EvaluateState =
	| "idle"
	| "checking"
	| "match"
	| "mismatch"
	| "error";
