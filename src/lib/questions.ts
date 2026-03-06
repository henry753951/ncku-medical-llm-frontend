export type QuestionCode = string;

export type QuestionOption = {
	code: QuestionCode;
	name: string;
	description: string;
	examples: string[];
};

export type QuestionsApiResponse = {
	questions: QuestionOption[];
};
