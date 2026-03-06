import { Chip, Dropdown, Label } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import type { QuestionCode, QuestionOption } from "../../lib/questions";
type TopControlBarProps = {
	questionOptions: QuestionOption[];
	selectedQuestion: QuestionCode;
	disabled: boolean;
	onQuestionChange: (question: QuestionCode) => void;
	historyControl?: ReactNode;
	settingsControl: ReactNode;
};

export default function TopControlBar({
	questionOptions,
	selectedQuestion,
	disabled,
	onQuestionChange,
	historyControl,
	settingsControl,
}: TopControlBarProps) {
	const selectedOption =
		questionOptions.find((option) => option.code === selectedQuestion) ??
		questionOptions[0];

	return (
		<div
			className="
				absolute left-1/2 top-1 z-20
				flex w-[min(96vw,760px)] -translate-x-1/2
				items-center gap-3
				rounded-full border border-white/70
				bg-white/55 p-3
				shadow-[0_18px_70px_rgba(11,38,70,0.12)]
				backdrop-blur-xl
			"
		>
			{historyControl}
			<div className="relative flex min-w-0 flex-1 items-center">
				<Dropdown>
					<Dropdown.Trigger isDisabled={disabled} className="w-full">
						<div
							className={`inline-flex w-full min-w-0 items-center gap-2 rounded-full border border-white/95 bg-[linear-gradient(120deg,rgba(255,255,255,0.88),rgba(255,255,255,0.62)),radial-gradient(circle_at_16%_50%,rgba(129,180,255,0.45),transparent_48%)] px-4 py-2 pr-10 text-sm text-slate-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] outline-none ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
						>
							<Chip
								variant="soft"
								color="accent"
								className="min-w-11 justify-center text-xs font-semibold text-slate-700"
							>
								{selectedOption?.code ?? "--"}
							</Chip>
							<span className="truncate">
								{selectedOption?.name ?? "尚未載入題目"}
							</span>
							<ChevronDown
								size={16}
								strokeWidth={2.6}
								className="pointer-events-none absolute right-3 text-slate-700/80"
							/>
						</div>
					</Dropdown.Trigger>
					<Dropdown.Popover
						placement="bottom"
						className="no-scrollbar !max-w-[min(96vw,760px)] rounded-xl"
					>
						<Dropdown.Menu
							selectionMode="single"
							selectedKeys={new Set([selectedQuestion])}
							onSelectionChange={(keys) => {
								if (keys === "all") return;
								const first = Array.from(keys)[0];
								if (typeof first === "string") {
									onQuestionChange(first as QuestionCode);
								}
							}}
						>
							{questionOptions.map((option) => (
								<Dropdown.Item
									id={option.code}
									key={option.code}
									textValue={`${option.code} - ${option.name}`}
									className="rounded-xl px-3 py-2 text-sm data-[hover=true]:bg-sky-100/70"
								>
									<div className="inline-flex w-full items-center justify-between gap-2">
										<div className="inline-flex items-center gap-2 pl-4 pr-3">
											<Chip
												variant="soft"
												color="accent"
												className="min-w-11 justify-center text-xs font-semibold text-slate-700"
											>
												{option.code}
											</Chip>
											<Label>{option.name}</Label>
										</div>
										<Dropdown.ItemIndicator />
									</div>
								</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
			</div>
			{settingsControl}
		</div>
	);
}
