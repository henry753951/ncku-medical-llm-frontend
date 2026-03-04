import { useCallback, useEffect, useState } from "react";

export const useAudioInputDevices = () => {
	const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

	const refreshDevices = useCallback(async () => {
		if (!navigator.mediaDevices?.enumerateDevices) {
			return;
		}
		const allDevices = await navigator.mediaDevices.enumerateDevices();
		setDevices(allDevices.filter((item) => item.kind === "audioinput"));
	}, []);

	useEffect(() => {
		void refreshDevices();
		const mediaDevices = navigator.mediaDevices;
		if (!mediaDevices) {
			return;
		}
		mediaDevices.addEventListener?.("devicechange", refreshDevices);
		return () => {
			mediaDevices.removeEventListener?.("devicechange", refreshDevices);
		};
	}, [refreshDevices]);

	return {
		devices,
		refreshDevices,
	};
};
