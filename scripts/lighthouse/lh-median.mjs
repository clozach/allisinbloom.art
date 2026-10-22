// lh-median.mjs <out-dir> <label> — summarise <label>-<preset>-<n>.json Lighthouse reports:
// per preset, the median and minimum score of each category, the median and worst of each
// metric, the audits still below 1 in the median run, and, per run, whether any font file
// finished before the observed first paint (a font that does sits on the first-paint path).
import { readdirSync, readFileSync } from 'node:fs';

const [dir, label] = process.argv.slice(2);
const median = (a) => {
	const s = [...a].sort((x, y) => x - y);
	const m = s.length >> 1;
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (v) => Math.round(v * 1000) / 1000;

for (const preset of ['mobile', 'desktop']) {
	const files = readdirSync(dir)
		.filter((f) => f.startsWith(`${label}-${preset}-`) && f.endsWith('.json'))
		.sort((a, b) => parseInt(a.split('-').pop()) - parseInt(b.split('-').pop()));
	if (!files.length) continue;
	const rs = files.map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
	const bench = rs.map((r) => Math.round(r.environment.benchmarkIndex)).join('/');
	console.log(
		`\n${label} ${preset}: ${rs.length} runs; ${rs[0].requestedUrl} -> ${rs[0].finalDisplayedUrl}; benchmarkIndex ${bench} (a run under ~1000 means a busy machine)`
	);
	for (const k of ['performance', 'accessibility', 'best-practices', 'seo']) {
		const v = rs.map((r) => Math.round(r.categories[k].score * 100));
		console.log(
			`  ${k.padEnd(26)} median ${String(median(v)).padStart(7)}   min ${String(Math.min(...v)).padStart(7)}   runs ${v.join(' / ')}`
		);
	}
	const metrics = [
		['first-contentful-paint', ' ms'],
		['largest-contentful-paint', ' ms'],
		['speed-index', ' ms'],
		['total-blocking-time', ' ms'],
		['cumulative-layout-shift', ''],
		['server-response-time', ' ms']
	];
	for (const [id, unit] of metrics) {
		const fmt = unit ? Math.round : round;
		const v = rs.map((r) => r.audits[id].numericValue);
		console.log(
			`  ${id.padEnd(26)} median ${String(fmt(median(v))).padStart(7)}${unit}   worst ${String(fmt(Math.max(...v))).padStart(7)}${unit}   runs ${v.map(fmt).join(' / ')}`
		);
	}
	const byPerf = rs.map((r, i) => [r.categories.performance.score, i]).sort((a, b) => a[0] - b[0]);
	const midIndex = byPerf[byPerf.length >> 1][1];
	console.log(`  audits below 1 in the median-performance run (${files[midIndex]}):`);
	for (const [id, a] of Object.entries(rs[midIndex].audits)) {
		if (
			a.score !== null &&
			a.score < 1 &&
			!['notApplicable', 'informative', 'manual'].includes(a.scoreDisplayMode)
		)
			console.log(`    ${id} ${a.score} ${a.displayValue || ''}`);
	}
	// network-requests counts from the first request, the observed metrics from the
	// navigation start; debugData gives both origins, so font ends are moved onto the latter
	console.log('  fonts against the observed first paint:');
	rs.forEach((r, i) => {
		const m = r.audits.metrics.details.items[0];
		const nr = r.audits['network-requests'].details;
		const offset = (nr.debugData?.networkStartTimeTs - m.observedTimeOriginTs) / 1000 || 0;
		const obs = m.observedFirstContentfulPaint;
		const fonts = nr.items
			.filter((x) => x.resourceType === 'Font')
			.map((x) => x.networkEndTime + offset);
		const early = fonts.filter((end) => end < obs);
		const ends = fonts.map(Math.round).join(',') || 'none';
		console.log(
			`    run ${i + 1}: observed FCP ${Math.round(obs)} ms, font ends ${ends} ms${early.length ? `  <- ${early.length} font(s) before first paint` : ''}`
		);
	});
}
