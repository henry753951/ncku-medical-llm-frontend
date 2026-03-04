import { Button, Label, ListBox, Modal, Select, Slider } from "@heroui/react";
import { AlertTriangle, Settings, Volume2 } from "lucide-react";
import { useState } from "react";
import { useMicPreview } from "../../composables/useMicPreview";

type MicSettingsModalProps = {
	isRecording: boolean;
	selectedDeviceId: string;
	micGain: number;
	devices: MediaDeviceInfo[];
	onReloadDevices: () => void;
	onDeviceChange: (deviceId: string) => void;
	onMicGainChange: (value: number) => void;
};

export default function MicSettingsModal({
	isRecording,
	selectedDeviceId,
	micGain,
	devices,
	onReloadDevices,
	onDeviceChange,
	onMicGainChange,
}: MicSettingsModalProps) {
	const [isOpen, setIsOpen] = useState(false);
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
			<Modal.Backdrop className="bg-slate-900/20 backdrop-blur-md">
				<Modal.Container placement="center" className="p-4">
					<Modal.Dialog className="grid w-full max-w-[500px] gap-4 rounded-3xl border border-white/95 bg-white/90 p-4 shadow-[0_18px_70px_rgba(11,38,70,0.12)]">
						<Modal.CloseTrigger />
						<Modal.Header>
							<Modal.Icon className="bg-blue-100 text-blue-700">
								<Settings size={16} />
							</Modal.Icon>
							<Modal.Heading>麥克風設定</Modal.Heading>
						</Modal.Header>

						<Modal.Body className="grid gap-4">
							<div className="grid gap-2">
								<Select
									value={selectedDeviceId || "__default__"}
									onChange={(value) => {
										if (typeof value === "string") {
											onDeviceChange(value === "__default__" ? "" : value);
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
								<label htmlFor="mic-gain" className="text-sm text-slate-600">
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
								<Label className="text-sm text-slate-600">即時音量監看</Label>
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
						</Modal.Body>

						<Modal.Footer className="flex justify-end gap-2">
							<Button
								slot="close"
								variant="ghost"
								size="sm"
								onPress={onReloadDevices}
							>
								重新載入裝置
							</Button>
							<Button slot="close" variant="primary" size="sm">
								完成
							</Button>
						</Modal.Footer>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}
