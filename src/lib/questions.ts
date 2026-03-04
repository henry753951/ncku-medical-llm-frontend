type QuestionOptionLiteral = {
	code: string;
	name: string;
	description: string;
	examples: readonly string[];
};

export const QUESTION_OPTIONS = [
	{
		code: "1A",
		name: "Level of consciousness",
		description:
			"此項目是辨別病患意識狀態，多半是詢問病患是否有什麼不舒服，或是呼喚病患姓名，進行簡單寒暄後，即可判別。\n醫師範例：先生，你覺得怎麼樣？有哪裡不舒服嗎？",
		examples: [
			"先生，你覺得怎麼樣？有哪裡不舒服嗎？",
			"你現在聽得到我說話嗎？",
			"請跟我打個招呼。",
		],
	},
	{
		code: "1B",
		name: "LOC (questions)",
		description:
			"此項目有兩個問題，一個是詢問病患今年幾歲，詢問完後由病人自行回答，第二個是詢問現在是幾月份，詢問完後由病人自行回答。\n醫師範例：請問您今年幾歲？（病人實際年齡：______）\n請問現在是幾月？（當時實際月份）",
		examples: [
			"請問您今年幾歲？",
			"請問現在是幾月？",
			"這兩題請直接回答即可。",
		],
	},
	{
		code: "1C",
		name: "LOC (commands)",
		description:
			"此項目有兩個指令，一個是要求病患閉眼後再睜眼，病患執行完畢後，再進行第二個指令，手握拳後再鬆開拳頭，病患執行完畢後評分。\n醫師範例：請閉上您的雙眼。請睜開您的雙眼。\n請握緊您的拳頭。請鬆開您的拳頭。",
		examples: [
			"請閉上您的雙眼，再睜開。",
			"請握緊您的拳頭，再鬆開。",
			"兩個指令依序完成。",
		],
	},
	{
		code: "2",
		name: "Best gaze",
		description:
			"此項目有一個指令，要求病患眼睛追蹤醫師在眼前的手指，跟著手指來回移動眼球。\n醫師範例：先生，頭不要轉，請跟著我的手指看。",
		examples: [
			"先生，頭不要轉，請跟著我的手指看。",
			"只動眼睛，跟著手指左右移動。",
			"眼球跟著手指來回看。",
		],
	},
	{
		code: "3",
		name: "Visual fields",
		description:
			"此項目有一個指令，要求病患用眼角餘光看醫師在眼前視野的手指揮動，依據手指的動作與否，回答是否有看到。\n醫師範例：先生，請您告訴我，哪一側的手指在動？哪一側有動？現在呢？",
		examples: [
			"請用餘光看，哪一側手指在動？",
			"哪一側有動？現在呢？",
			"請直視前方，只用眼角回答。",
		],
	},
	{
		code: "4",
		name: "Facial palsy",
		description:
			"此項目有兩個指令，要求病患用力閉眼，以及露出牙齒微笑，再接著評估臉部癱瘓狀況。\n醫師範例：請用力閉上您的眼睛。\n請露出牙齒微笑。",
		examples: [
			"請用力閉上您的眼睛。",
			"請露出牙齒微笑。",
			"我會觀察左右臉是否對稱。",
		],
	},
	{
		code: "5aL",
		name: "Left arm motor drift",
		description:
			"此項目要求病患抬起單手臂呈現九十度（水平），接著醫師會開始倒數十秒，觀察病患手臂撐力狀況。此題為左手。\n醫師範例：請將左手抬起90度，並維持10秒。",
		examples: [
			"請將左手抬起90度，並維持10秒。",
			"左手保持水平，不要放下。",
			"我要倒數十秒。",
		],
	},
	{
		code: "5bR",
		name: "Right arm motor drift",
		description:
			"此項目要求病患抬起單手臂呈現九十度（水平），接著醫師會開始倒數十秒，觀察病患手臂撐力狀況。此題為右手。\n醫師範例：請將右手抬起90度，並維持10秒。",
		examples: [
			"請將右手抬起90度，並維持10秒。",
			"右手保持水平，不要放下。",
			"我要倒數十秒。",
		],
	},
	{
		code: "6aL",
		name: "Left leg motor drift",
		description:
			"此項目要求病患抬起單腳呈現三十度，接著醫師會開始倒數五秒，觀察病患單腳撐力狀況。此題為左腳。\n醫師範例：請將左腳抬高30度，並維持5秒。",
		examples: [
			"請將左腳抬高30度，並維持5秒。",
			"左腳先不要放下。",
			"我要倒數五秒。",
		],
	},
	{
		code: "6bR",
		name: "Right leg motor drift",
		description:
			"此項目要求病患抬起單腳呈現三十度，接著醫師會開始倒數五秒，觀察病患單腳撐力狀況。此題為右腳。\n醫師範例：請將右腳抬高30度，並維持5秒。",
		examples: [
			"請將右腳抬高30度，並維持5秒。",
			"右腳先不要放下。",
			"我要倒數五秒。",
		],
	},
	{
		code: "7",
		name: "Limb Ataxia",
		description:
			"此項目有四個指令，先要求病患用左手食指點鼻子再點醫師的手指，來回循環做，再換右手做。再來要求病患用左腳腳跟碰右腳膝蓋，再往下碰到右腳腳踝，來回循環做，接下來換右腳做。左右邊或手腳，沒有一定先後順序，四個都有評估完即可。\n醫師範例：左手食指點鼻子，再點我的手，來回循環做。\n右手食指點鼻子，再點我的手，來回循環做。\n用左腳腳跟碰右腳膝蓋，再往下碰到右腳腳踝。\n用右腳腳跟碰左腳膝蓋，再往下碰到左腳腳踝。",
		examples: [
			"左手指鼻再點我手，來回做。",
			"右手做同樣動作。",
			"左右腳做腳跟碰膝再滑到腳踝。",
		],
	},
	{
		code: "8",
		name: "Sensation",
		description:
			"此項目會詢問病患在針刺皮膚後，左右兩側的感受如何。\n醫師範例：先生，請告訴我，兩側的感受是否一致？",
		examples: [
			"先生，請告訴我，兩側的感受是否一致？",
			"左邊跟右邊感覺一樣嗎？",
			"哪一邊比較有感覺？",
		],
	},
] as const satisfies readonly QuestionOptionLiteral[];

export type QuestionCode = (typeof QUESTION_OPTIONS)[number]["code"];
export type QuestionOption = (typeof QUESTION_OPTIONS)[number];
export const QUESTION_CODES = QUESTION_OPTIONS.map((option) => option.code);
