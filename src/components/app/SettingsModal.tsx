import {
	Button,
	Label,
	ListBox,
	Modal,
	Select,
	Slider,
	Tabs,
} from "@heroui/react";
import { AlertTriangle, Settings, Volume2 } from "lucide-react";
import { useState } from "react";
import { useMicPreview } from "../../composables/useMicPreview";

type SettingsModalProps = {
	isRecording: boolean;
	selectedDeviceId: string;
	micGain: number;
	requestTimeoutMs: number;
	waveFps: number;
	animationsEnabled: boolean;
	devices: MediaDeviceInfo[];
	onReloadDevices: () => void;
	onDeviceChange: (deviceId: string) => void;
	onMicGainChange: (value: number) => void;
	onRequestTimeoutChange: (value: number) => void;
	onWaveFpsChange: (value: number) => void;
	onAnimationsEnabledChange: (value: boolean) => void;
};

export default function SettingsModal({
	isRecording,
	selectedDeviceId,
	micGain,
	requestTimeoutMs,
	waveFps,
	animationsEnabled,
	devices,
	onReloadDevices,
	onDeviceChange,
	onMicGainChange,
	onRequestTimeoutChange,
	onWaveFpsChange,
	onAnimationsEnabledChange,
}: SettingsModalProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [tabKey, setTabKey] = useState<"audio" | "visual" | "request">("audio");
	const isIOSDevice =
		typeof navigator !== "undefined" &&
		/iP(ad|hone|pod|one|touch)|iPad|iPhone|iPod/i.test(
			navigator.userAgent || navigator.platform || "",
		);

	const { previewLevel, isClipping, previewError } = useMicPreview({
		enabled: isOpen,
		isRecording,
		selectedDeviceId,
		micGain,
	});

	const micDeviceOptions = [
		{ key: "__default__", label: "系統預設" },
		...devices.map((device, index) => ({
			key: device.deviceId,
			label: device.label || `麥克風 ${index + 1}`,
		})),
	];

	return (
		<Modal onOpenChange={setIsOpen}>
			<Modal.Trigger className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-800 transition hover:bg-white">
				<Settings size={16} />
			</Modal.Trigger>
			<Modal.Backdrop className="fixed inset-0 bg-slate-900/20 backdrop-blur-md h-dvh">
				<Modal.Container placement="center" className="p-4 sm:p-10">
					<Modal.Dialog className="pointer-events-auto grid w-[min(92vw,560px)] gap-4 rounded-3xl border border-white/95 bg-white/90 p-4 shadow-[0_18px_70px_rgba(11,38,70,0.12)]">
						<Modal.CloseTrigger />
						<Modal.Header>
							<Modal.Icon className="bg-blue-100 text-blue-700">
								<Settings size={16} />
							</Modal.Icon>
						</Modal.Header>

						<Modal.Body>
							<Tabs
								className="w-full"
								orientation="vertical"
								selectedKey={tabKey}
								onSelectionChange={(key) =>
									setTabKey(
										key === "request"
											? "request"
											: key === "visual"
												? "visual"
												: "audio",
									)
								}
							>
								<Tabs.ListContainer className="p-1">
									<Tabs.List aria-label="設定分類" className="min-w-[104px]">
										<Tabs.Tab id="audio" className="justify-start">
											音訊
											<Tabs.Indicator />
										</Tabs.Tab>
										<Tabs.Tab id="request" className="justify-start">
											請求
											<Tabs.Indicator />
										</Tabs.Tab>
										<Tabs.Tab id="visual" className="justify-start">
											視覺
											<Tabs.Indicator />
										</Tabs.Tab>
									</Tabs.List>
								</Tabs.ListContainer>

								<Tabs.Panel
									id="audio"
									className="overlay-scrollbar h-[312px] w-full overflow-y-auto px-4 pr-2"
								>
									<div className="grid gap-4">
										<div className="grid gap-2">
											<Select
												value={selectedDeviceId || "__default__"}
												onChange={(value) => {
													if (typeof value === "string") {
														onDeviceChange(
															value === "__default__" ? "" : value,
														);
													}
												}}
												className="w-full"
											>
												<Label>麥克風</Label>
												<Select.Trigger className="border-blue-100 bg-white/90">
													<Select.Value />
													<Select.Indicator />
												</Select.Trigger>
												<Select.Popover className="border border-white/95 bg-white/95 backdrop-blur-xl">
													<ListBox>
														{micDeviceOptions.map((item) => (
															<ListBox.Item
																key={item.key}
																id={item.key}
																textValue={item.label}
															>
																{item.label}
																<ListBox.ItemIndicator />
															</ListBox.Item>
														))}
													</ListBox>
												</Select.Popover>
											</Select>
										</div>

										<div className="grid gap-2">
											<label
												htmlFor="mic-gain"
												className="text-sm text-slate-600"
											>
												麥克風音量增益 {micGain.toFixed(1)}x
											</label>
											<Slider
												id="mic-gain"
												aria-label="麥克風音量增益"
												className="w-full"
												minValue={0.5}
												maxValue={3}
												step={0.1}
												value={micGain}
												onChange={(value) =>
													onMicGainChange(
														typeof value === "number" ? value : (value[0] ?? 1),
													)
												}
											>
												<Slider.Track>
													<Slider.Fill />
													<Slider.Thumb />
												</Slider.Track>
											</Slider>
										</div>

										<div className="grid gap-2">
											<Label className="text-sm text-slate-600">
												即時音量監看
											</Label>
											<div className="h-3 overflow-hidden rounded-full border border-blue-200/90 bg-blue-100/70">
												<div
													className={`h-full rounded-full ${isClipping ? "bg-red-500" : "bg-blue-400"}`}
													style={{
														width: `${Math.max(3, Math.min(100, previewLevel * 94 + (isClipping ? 6 : 0)))}%`,
													}}
												/>
											</div>
											<div className="flex items-center justify-between gap-3 text-sm text-slate-600">
												<span className="inline-flex items-center gap-1.5">
													<Volume2 size={14} />
													{previewLevel < 0.06 ? "幾乎無聲" : "有聲音輸入"}
												</span>
												<span
													className={`inline-flex items-center gap-1.5 ${isClipping ? "font-semibold text-red-700" : ""}`}
												>
													{isClipping ? <AlertTriangle size={14} /> : null}
													{isClipping ? "可能爆音" : "訊號正常"}
												</span>
											</div>
											{previewError ? (
												<p className="text-sm text-rose-800">{previewError}</p>
											) : null}
										</div>

										<div className="flex justify-end">
											<Button
												slot="close"
												variant="secondary"
												className="text-gray-700"
												size="sm"
												onPress={onReloadDevices}
											>
												重新載入裝置
											</Button>
										</div>
									</div>
								</Tabs.Panel>

								<Tabs.Panel
									id="request"
									className="overlay-scrollbar h-[312px] w-full overflow-y-auto px-4 pr-2"
								>
									<div className="grid gap-4">
										<label
											htmlFor="request-timeout"
											className="text-sm text-slate-600"
										>
											最長等待時間 {Math.round(requestTimeoutMs / 1000)} 秒
										</label>
										<Slider
											id="request-timeout"
											aria-label="最長等待時間"
											className="w-full"
											minValue={5}
											maxValue={60}
											step={1}
											value={Math.round(requestTimeoutMs / 1000)}
											onChange={(value) =>
												onRequestTimeoutChange(
													(typeof value === "number"
														? value
														: (value[0] ?? 20)) * 1000,
												)
											}
										>
											<Slider.Track>
												<Slider.Fill />
												<Slider.Thumb />
											</Slider.Track>
										</Slider>
										<p className="text-xs leading-relaxed text-slate-500">
											超過設定秒數會自動中止語音辨識或判斷請求，避免卡住。
										</p>
									</div>
								</Tabs.Panel>

								<Tabs.Panel
									id="visual"
									className="overlay-scrollbar h-[312px] w-full overflow-y-auto px-4 pr-2"
								>
									<div className="grid gap-4">
										<div className="grid gap-2">
											<label
												htmlFor="wave-fps"
												className="text-sm text-slate-600"
											>
												背景波浪 FPS {waveFps}
												{isIOSDevice ? "（iOS 預設 18）" : ""}
											</label>
											<Slider
												id="wave-fps"
												aria-label="背景波浪 FPS"
												className="w-full"
												minValue={8}
												maxValue={60}
												step={2}
												value={waveFps}
												onChange={(value) =>
													onWaveFpsChange(
														typeof value === "number"
															? value
															: (value[0] ?? 60),
													)
												}
											>
												<Slider.Track>
													<Slider.Fill />
													<Slider.Thumb />
												</Slider.Track>
											</Slider>
											<p className="text-xs leading-relaxed text-slate-500">
												FPS 越高動畫越流暢，但會增加耗電與發熱。
											</p>
										</div>

										<div className="grid gap-2">
											<label
												htmlFor="animations-enabled"
												className="text-sm text-slate-600"
											>
												關閉動畫
											</label>
											<label
												htmlFor="animations-enabled"
												className="inline-flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700"
											>
												<span>
													{animationsEnabled
														? "目前為開啟動畫"
														: "目前為關閉動畫"}
												</span>
												<input
													id="animations-enabled"
													type="checkbox"
													checked={!animationsEnabled}
													onChange={(event) =>
														onAnimationsEnabledChange(
															!event.currentTarget.checked,
														)
													}
													className="h-4 w-4"
												/>
											</label>
											<p className="text-xs leading-relaxed text-slate-500">
												開啟此選項後會停用背景動畫，降低裝置負擔。
											</p>
										</div>
									</div>
								</Tabs.Panel>
							</Tabs>
						</Modal.Body>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}
