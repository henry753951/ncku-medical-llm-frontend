import {
	AlertDialog,
	Button,
	Chip,
	Dropdown,
	Label,
	ScrollShadow,
} from "@heroui/react";
import type { QuestionCode } from "../../lib/questions";
import {
	AlertTriangle,
	CheckCircle2,
	Clock3,
	FileText,
	History,
	Trash2,
	XCircle,
} from "lucide-react";

type HistoryRecord = {
	id: string;
	questionCode?: QuestionCode;
	questionName?: string;
	question?: string;
	text?: string;
	result: boolean | null;
	errorReason?: string;
	time: string;
};

type HistoryDropdownProps = {
	records: HistoryRecord[];
	disabled?: boolean;
	onDeleteRecord: (id: string) => void;
	onClearAll: () => void;
};

export default function HistoryDropdown({
	records,
	disabled = false,
	onDeleteRecord,
	onClearAll,
}: HistoryDropdownProps) {
	const count = records.length;
	const normalizedRecords = records.map((record) => {
		if (record.questionCode && record.questionName) {
			return record;
		}
		const source = record.question ?? "";
		const parts = source.trim().split(/\s+/);
		const possibleCode = parts[0] as QuestionCode | undefined;
		const code =
			possibleCode && possibleCode.length <= 4 ? possibleCode : undefined;
		const name = code ? source.slice(code.length).trim() : source.trim();
		return {
			...record,
			questionCode: code,
			questionName: name || "未命名題目",
		};
	});

	return (
		<Dropdown>
			<Dropdown.Trigger
				isDisabled={disabled}
				className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-800 transition hover:bg-white"
			>
				<History size={16} />
				{count > 0 ? (
					<span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-800 px-1 py-[1px] text-[10px] font-semibold text-white">
						{count > 99 ? "99+" : count}
					</span>
				) : null}
			</Dropdown.Trigger>
			<Dropdown.Popover
				placement="top start"
				className="w-[min(90vw,520px)] rounded-2xl border border-white/70 bg-white/55 p-2 shadow-[0_20px_60px_rgba(11,38,70,0.16)] backdrop-blur-xl"
			>
				<div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
					<div className="text-sm font-semibold text-slate-800">最近紀錄</div>
					{count > 0 ? (
						<Button
							onClick={() => onClearAll()}
							variant="ghost"
							size="sm"
							className="h-7 rounded-full border border-white/80 bg-white/70 px-2 text-xs text-slate-600"
						>
							<Trash2 size={12} />
							清空
						</Button>
					) : null}
				</div>
				{count === 0 ? (
					<p className="px-2 pb-2 text-sm text-slate-500">尚無轉錄紀錄</p>
				) : (
					<ScrollShadow className="overlay-scrollbar max-h-[55vh] pr-1">
						<div className="grid gap-2">
							{normalizedRecords.map((record) => (
								<Dropdown key={record.id} trigger="longPress">
									<Dropdown.Trigger className="w-full cursor-pointer text-left">
										<div className="group relative rounded-2xl border border-white/75 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(255,255,255,0.78))] px-3 py-3 shadow-[0_10px_30px_rgba(30,58,138,0.08),inset_0_1px_0_rgba(255,255,255,0.45)] transition hover:border-sky-200/80">
											<div className="mb-2 flex items-start justify-between gap-2 text-xs">
												<div className="inline-flex min-w-0 items-center gap-2">
													{record.questionCode ? (
														<Chip
															variant="soft"
															color="accent"
															className="min-w-11 shrink-0 justify-center text-[10px] font-semibold text-slate-700"
														>
															{record.questionCode}
														</Chip>
													) : null}
													<span className="truncate pr-2 font-semibold text-slate-700">
														{record.questionName}
													</span>
												</div>
												<div
													className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 ${
														record.result === true
															? "bg-emerald-100 text-emerald-800"
															: record.result === false
																? "bg-rose-100 text-rose-700"
																: "bg-amber-100 text-amber-800"
													}`}
												>
													{record.result === true ? (
														<CheckCircle2 size={12} />
													) : null}
													{record.result === false ? (
														<XCircle size={12} />
													) : null}
													{record.result === null ? (
														<AlertTriangle size={12} />
													) : null}
													<span className="font-semibold">
														{record.result === true
															? "符合"
															: record.result === false
																? "不符合"
																: "失敗"}
													</span>
												</div>
											</div>
											{record.text ? (
												<div className="rounded-xl border border-sky-100/80 bg-sky-50/55 px-3 py-2">
													<div className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800">
														<FileText size={12} />
														轉錄內容
													</div>
													<p className="line-clamp-3 break-words text-sm leading-relaxed text-slate-700">
														{record.text}
													</p>
												</div>
											) : null}
											{record.errorReason ? (
												<div className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2">
													<div className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
														<AlertTriangle size={12} />
														失敗原因
													</div>
													<p className="line-clamp-3 break-words text-sm leading-relaxed text-amber-900">
														{record.errorReason}
													</p>
												</div>
											) : null}
											<div className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
												<Clock3 size={12} />
												{record.time}
											</div>
										</div>
									</Dropdown.Trigger>
									<Dropdown.Popover placement="end top">
										<Dropdown.Menu aria-label="紀錄操作">
											<Dropdown.Item
												id={`delete-${record.id}`}
												variant="danger"
												onAction={() => onDeleteRecord(record.id)}
											>
												<Label>刪除這筆紀錄</Label>
											</Dropdown.Item>
										</Dropdown.Menu>
									</Dropdown.Popover>
								</Dropdown>
							))}
						</div>
					</ScrollShadow>
				)}
			</Dropdown.Popover>
		</Dropdown>
	);
}
