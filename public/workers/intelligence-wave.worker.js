const WIDTH = 1600;
const HEIGHT = 900;
const BASE_Y = HEIGHT - 80;

function buildWave(width, height, baseY, amp, phase) {
	const points = 72;
	const bleed = 140;
	const startX = -bleed;
	const endX = width + bleed;
	const span = endX - startX;
	const pts = [];

	for (let i = 0; i <= points; i += 1) {
		const t = i / points;
		const x = startX + t * span;
		let wave =
			Math.sin((t * 1.25 + phase) * Math.PI * 2) * 0.68 +
			Math.sin((t * 0.52 + phase * 1.24) * Math.PI * 2) * 0.32;
		wave = Math.tanh(wave * 1.08);
		const y = baseY - wave * amp;
		pts.push({ x, y });
	}

	let d = `M ${pts[0].x} ${pts[0].y}`;
	for (let i = 1; i < pts.length; i += 1) {
		const p0 = pts[i - 1];
		const p1 = pts[i];
		const cx = (p0.x + p1.x) / 2;
		d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
	}
	d += ` L ${endX} ${height} L ${startX} ${height} Z`;
	return d;
}

self.onmessage = (event) => {
	const data = event.data || {};
	const phase = Number(data.phase) || 0;
	const liveEnergy = Number(data.liveEnergy) || 0.07;
	const amp = 52 + liveEnergy * HEIGHT * 0.35;

	self.postMessage({
		pathA: buildWave(WIDTH, HEIGHT, BASE_Y, amp, phase),
		pathB: buildWave(
			WIDTH,
			HEIGHT,
			BASE_Y + 20,
			amp * 0.72,
			phase * 1.1 + 0.13,
		),
		pathC: buildWave(
			WIDTH,
			HEIGHT,
			BASE_Y + 42,
			amp * 0.48,
			phase * 0.92 + 0.27,
		),
	});
};
