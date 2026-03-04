import { useEffect, useState } from "react";

type TypewriterTextProps = {
	text: string;
	startDelayMs?: number;
	charDelayMs?: number;
};

export default function TypewriterText({
	text,
	startDelayMs = 220,
	charDelayMs = 42,
}: TypewriterTextProps) {
	const [displayed, setDisplayed] = useState("");

	useEffect(() => {
		setDisplayed("");
		let index = 0;
		let typingTimer: number | null = null;

		const startTimer = window.setTimeout(() => {
			typingTimer = window.setInterval(() => {
				index += 1;
				setDisplayed(text.slice(0, index));
				if (index >= text.length && typingTimer !== null) {
					window.clearInterval(typingTimer);
				}
			}, charDelayMs);
		}, startDelayMs);

		return () => {
			window.clearTimeout(startTimer);
			if (typingTimer !== null) {
				window.clearInterval(typingTimer);
			}
		};
	}, [text, startDelayMs, charDelayMs]);

	return <>{displayed}</>;
}
