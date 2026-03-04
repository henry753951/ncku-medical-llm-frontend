import { QUESTION_OPTIONS, type QuestionCode } from "./questions";

export type HistoryRecord = {
	id: string;
	questionCode: QuestionCode;
	questionName: string;
	text?: string;
	result: boolean | null;
	errorReason?: string;
	time: string;
};

const formatTime = () =>
	new Date().toLocaleTimeString("zh-TW", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

export const createHistoryRecord = (input: {
	questionCode: QuestionCode;
	text?: string;
	result: boolean | null;
	errorReason?: string;
}): HistoryRecord => {
	const questionName =
		QUESTION_OPTIONS.find((option) => option.code === input.questionCode)
			?.name ?? input.questionCode;

	return {
		id: crypto.randomUUID(),
		questionCode: input.questionCode,
		questionName,
		text: input.text,
		result: input.result,
		errorReason: input.errorReason,
		time: formatTime(),
	};
};
