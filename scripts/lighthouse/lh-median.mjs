// lh-median.mjs <out-dir> <label> [runs-requested] — summarise <label>-<preset>-<n>.json
// Lighthouse reports: per preset, how many reports were usable, the median and minimum
// score of each category, the median and worst of each metric, the audits still below 1 in
// the median run, and, per run, whether any font file finished before the observed first
// paint (a font that does sits on the first-paint path). A report Lighthouse wrote for a
// failed run (runtimeError, or no performance score) is named and left out, never counted
// as a 0, so one bad run cannot hide the rest of the summary.
import { readdirSync, readFileSync } from 'node:fs';

const [dir, label, requested] = process.argv.slice(2);
const median = (a) => {
	const s = [...a].sort((x, y) => x - y);
	const m = s.length >> 1;
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (v) => Math.round(v * 1000) / 1000;
const runNumber = (f) => parseInt(f.split('-').pop());
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const read = (f) => {
	try {
		return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
	} catch {
		return null;
	}
};

for (const preset of ['mobile', 'desktop']) {
	const files = readdirSync(dir)
		.filter((f) => f.startsWith(`${label}-${preset}-`) && f.endsWith('.json'))
		.sort((a, b) => runNumber(a) - runNumber(b));
	if (!files.length && !requested) continue;
	const reports = files.map((f) => ({ f, r: read(f) }));
	const problem = ({ r }) =>
		!r
			? 'unreadable'
			: r.runtimeError
				? r.runtimeError.code || 'runtimeError'
				: !isNumber(r.categories?.performance?.score)
					? 'no performance score'
					: null;
	const errored = reports.filter((x) => problem(x));
	const ok = reports.filter((x) => !problem(x));
	const of = requested ? `${requested} requested runs` : `${files.length} reports found`;
	const why = errored.length
		? ` (${errored.length} errored: ${errored.map((x) => `run ${runNumber(x.f)} ${problem(x)}`).join(', ')})`
		: '';
	if (!ok.length) {
		console.log(`\n${label} ${preset}: used 0 of ${of}${why}`);
		continue;
	}
	const rs = ok.map((x) => x.r);
	const names = ok.map((x) => x.f);
	const bench = rs.map((r) => Math.round(r.environment?.benchmarkIndex ?? NaN)).join('/');
	console.log(
		`\n${label} ${preset}: used ${rs.length} of ${of}${why}; ${rs[0].requestedUrl} -> ${rs[0].finalDisplayedUrl}; benchmarkIndex ${bench} (a run under ~1000 means a busy machine)`
	);
	for (const k of ['performance', 'accessibility', 'best-practices', 'seo']) {
		const v = rs
			.map((r) => r.categories[k]?.score)
			.filter(isNumber)
			.map((s) => Math.round(s * 100));
		if (!v.length) {
			console.log(`  ${k.padEnd(26)} no score in any run`);
			continue;
		}
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
		const v = rs.map((r) => r.audits[id]?.numericValue).filter(isNumber);
		if (!v.length) {
			console.log(`  ${id.padEnd(26)} no value in any run`);
			continue;
		}
		console.log(
			`  ${id.padEnd(26)} median ${String(fmt(median(v))).padStart(7)}${unit}   worst ${String(fmt(Math.max(...v))).padStart(7)}${unit}   runs ${v.map(fmt).join(' / ')}`
		);
	}
	const byPerf = rs.map((r, i) => [r.categories.performance.score, i]).sort((a, b) => a[0] - b[0]);
	const midIndex = byPerf[byPerf.length >> 1][1];
	console.log(`  audits below 1 in the median-performance run (${names[midIndex]}):`);
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
		const run = runNumber(names[i]);
		const m = r.audits.metrics?.details?.items?.[0];
		const nr = r.audits['network-requests']?.details;
		if (!m || !nr?.items) {
			console.log(`    run ${run}: no metrics or network details in this report`);
			return;
		}
		const offset = (nr.debugData?.networkStartTimeTs - m.observedTimeOriginTs) / 1000 || 0;
		const obs = m.observedFirstContentfulPaint;
		const fonts = nr.items
			.filter((x) => x.resourceType === 'Font')
			.map((x) => x.networkEndTime + offset);
		const early = fonts.filter((end) => end < obs);
		const ends = fonts.map(Math.round).join(',') || 'none';
		console.log(
			`    run ${run}: observed FCP ${Math.round(obs)} ms, font ends ${ends} ms${early.length ? `  <- ${early.length} font(s) before first paint` : ''}`
		);
	});
}
