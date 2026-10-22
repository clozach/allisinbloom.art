# Lighthouse, measured like production

Plain `vite preview` overstates the score: it answers in about 4 ms over plain HTTP, so the page always paints before its font files arrive. Production answers in 75-350 ms over HTTP/2, and when the fonts finish first, Lighthouse counts them against first paint and the phone score drops 20 points. These scripts build a commit exactly as Vercel does, serve it on loopback behind a small Vercel-like front, and audit it several times.

Needs Node 22 (`.nvmrc`; adapter-vercel refuses newer), pnpm, Google Chrome and openssl. Ports 5212-5215 only.

```bash
L=scripts/lighthouse/lh-recipe.sh
$L setup                                   # once: Lighthouse 12.8.2 and a throwaway certificate in ~/.cache/allisinbloom-lighthouse
rev=$(git rev-parse --short HEAD)         # labels carry the commit, so two commits' reports never mix
$L build $rev /tmp/ab-build                # git archive of the commit: tracked files only, no private drafts, no .env
$L serve /tmp/ab-build 5212
$L front 5212 5214 70                      # production warm
$L front 5212 5215 300                     # production slow
for port in 5214 5215; do
  $L audit $rev-d$port-poem https://127.0.0.1:$port/poems/opening-in-sight 5
  $L audit $rev-d$port-root https://127.0.0.1:$port/ 5
done
$L unfront 5214; $L unfront 5215; $L stop /tmp/ab-build
```

`build` replaces everything in its folder, so it takes only a new folder or one it built before (it leaves a `.lh-build` marker there); it refuses any other folder, and an unknown revision, before deleting anything.

`audit` writes its reports to `$LH_HOME/out` (by default `~/.cache/allisinbloom-lighthouse/out`) unless given a fourth argument. Keep any other folder outside the repo: each report is about 450 KB, so the loop above writes about 18 MB (`lh-out/` at the repo root is ignored by git, Prettier and `vercel deploy`, in case). It runs mobile then desktop, five runs each, and prints per preset the median and the minimum of each category score, the median and worst of each metric, the audits still below 1, and for every run whether a font file finished before the observed first paint. It says how many of the requested runs it used, and names any run Lighthouse reported as failed instead of counting it as a 0. Report median and minimum: one run is not a measurement (production's mobile score has swung between 70 and 95 in one sitting). A change counts only if it holds behind both fronts. To compare two commits, build both and audit them one after the other on the same ports, each under its own labels: `audit` refuses a label whose reports are already in the folder, because a run that fails leaves no report and an older one of the same name would be summarised as new.

Run one Lighthouse at a time and nothing heavy beside it (the browser tests use about nine workers); a `benchmarkIndex` far below the others marks a run taken on a busy machine. The protected Vercel previews answer anonymous requests with a sign-in page, so they cannot be audited this way.
