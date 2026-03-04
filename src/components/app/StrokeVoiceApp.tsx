import { useStrokeVoiceAppController } from "../../composables/useStrokeVoiceAppController";
import StrokeVoiceScene from "./StrokeVoiceScene";

export default function StrokeVoiceApp() {
	const controller = useStrokeVoiceAppController();
	return <StrokeVoiceScene controller={controller} />;
}
