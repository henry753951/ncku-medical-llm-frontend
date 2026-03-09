const BAR_MIN = 0.08;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

class AudioAnalyserProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super();
		const processorOptions = options.processorOptions || {};
		this._barCount = Math.max(
			4,
			Number.isFinite(processorOptions.barCount)
				? processorOptions.barCount
				: 24,
		);
		this._reportEvery = Math.max(
			1,
			Number.isFinite(processorOptions.reportEvery)
				? processorOptions.reportEvery
				: 3,
		);
		this._frameCounter = 0;
	}

	process(inputs) {
		const input = inputs[0];
		const channel = input?.[0];
		if (!channel || channel.length === 0) {
			return true;
		}

		const output = this.port;

		let rms = 0;
		let peak = 0;
		for (let i = 0; i < channel.length; i += 1) {
			const sample = channel[i] ?? 0;
			rms += sample * sample;
			peak = Math.max(peak, Math.abs(sample));
		}
		rms = Math.sqrt(rms / channel.length);

		const nextBars = new Array(this._barCount).fill(BAR_MIN);
		const rangeSize = Math.max(1, Math.floor(channel.length / this._barCount));
		for (let index = 0; index < this._barCount; index += 1) {
			const start = index * rangeSize;
			const end = Math.min(channel.length, start + rangeSize);
			let sum = 0;
			for (let i = start; i < end; i += 1) {
				sum += Math.abs(channel[i] ?? 0);
			}
			const avg = sum / (end - start || 1);
			nextBars[index] = clamp01(Math.max(BAR_MIN, Math.min(1, avg * 2.2)));
		}

		const gatedRms = Math.max(0, rms - 0.003);
		const rmsBoost = clamp01(gatedRms * 20) ** 0.7;
		const peakBoost = clamp01(peak * 1.25) ** 1.05;
		const level = clamp01(rmsBoost * 0.72 + peakBoost * 0.28);

		this._frameCounter += 1;
		if (this._frameCounter % this._reportEvery === 0) {
			output.postMessage({ level, bars: nextBars });
		}

		return true;
	}
}

registerProcessor("audio-analyser-processor", AudioAnalyserProcessor);
