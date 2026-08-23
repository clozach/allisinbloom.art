# allisinbloom.art

A collection of poems and prose, built with mdsvex and notion.

## Tech & Services

- SvelteKit w/Svelte 5 (https://svelte.dev/llms-small.txt)
- GitHub API
- Vercel

## TODO
- [ ] Configure navigation using `gelato` (https://github.com/bradistewart/gelato)
- [ ] Add the title of every poem in static/route.txt to the command palette.
- [ ] (user-activity): populate the rest of the file & add more poems to flesh out the site some more.
- [ ] Write scripts to push to a preview branch, then add an automation so it happens without effort on every commit

## Dark mode

Theme tokens (`--bg`, `--ink`, `--accent`, `--hr`, `--card-bg`, `--sig-filter`, …) live
in `src/routes/+layout.svelte`. Dark values apply via `prefers-color-scheme`, and
`:root[data-theme='light'|'dark']` overrides beat the media query (used by the dev
tuner; ready for a future manual toggle). Both ink-on-bg pairs hold ≥ 7:1 contrast.
To test: flip the OS appearance, or use the tuner's theme select in dev.

## Background shader ("endless fractal blossoming")

**On by default, as a still, seeded per poem** (2026-08-23). Poem pages mount
`src/lib/components/BloomShader.svelte`. The first render of a poem rolls a 32-bit
seed, generates every shader knob and both palettes from it
(`src/lib/bloom/generate.js`, pure + deterministic), and stores the lot under
`localStorage['bloom-page-v1:<slug>']` (`src/lib/bloom/store.js`) — so each poem is
its own hand-made sheet, and a returning visitor sees the same sheet. The record is
`{ seed, current? }`: the seed is the page's **write-once default** (never rewritten
unless the visitor clears site data); `current` is its edited layer — slider tweaks
and 🎲 rolls — and **revert** deletes that layer. Site-wide
visibility lives apart in `bloom-prefs-v1` `{ shaderOn: true, animate: false }`: the
nesting is shader-visible? ▸ shader-animated? — with `animate` off the clock is
frozen at the page's generated `phase` (a still blot); on, it runs from there.
Reduced-motion always forces a still. (The pre-2026-08-23 single global blob
`bloom-tune-v1` is removed on first load.)

**a11y:** the generator searches, not trusts — every palette endpoint is nudged
in lightness (then chroma) until it clears **4.5:1** against that theme's ink
(`INK` in `generate.js` mirrors `--ink` in `+layout.svelte`; keep them in step).
`tests/unit/generate.unit.mjs` proves it over 5000 seeds. The tuner's color
pickers can leave the band — recheck before keeping a hand-picked color.

**Reproducibility:** a stored `{ "seed": N }` alone reproduces the whole tune, so
tests (and you) pin a page with
`localStorage.setItem('bloom-page-v1:<slug>', '{"seed":7}')`; the e2e suite
asserts pixel-identical frames for a pinned seed across fresh browser contexts.

When enabled, the shader renders behind the text: a WebGL1
fragment shader of contour filigree perpetually unfolding from an origin — six layers
on a cyclic scale-ladder, each born as hairline lace and dissolving as broad bands
(features double every `doubling` seconds). Every time term is an integer-frequency
function of `t / loopT`, so the loop is bit-exact (verified by pixel-diff at `t` vs
`t + loopT`).

- **Tuner panel:** on any poem page, press `` ` `` — or, on a phone, **long-press
  the bottom-left corner of the screen** (an invisible 56 px hotspot; hold ~0.6 s
  without moving) — to open the "bloom tuner"; ✕ closes it. Rows: `shader` (site-wide),
  `animate` nested under it (site-wide, hides the motion sliders `time multiplier` /
  `seconds per doubling` while off) — each row carries a 🎲: the shader die rerolls
  this poem's blot (every still knob + both palettes), the animate die rerolls only
  its motion knobs, both into the page's `current` layer — then `theme` override,
  **this poem · seed N** with live sliders for every knob (incl. `moment in the loop`)
  and color pickers for the palette endpoints, `copy values` (exports this page's set
  incl. seed) and `revert` (back to the seed's generated blot). The panel grows to the
  viewport height before it scrolls. It is `BloomTuner.svelte`, dynamic-imported on first
  summon so it ships as its own lazy chunk.
- ⚠️ `.env` must NOT set `NODE_ENV` — Vite reads it and silently turns
  `vite build` into a dev-mode build (bigger bundles, dev flags true). Removed
  2026-07-29; keep it out.
- `static/shader-lab.html` is the standalone iteration lab (`/shader-lab.html?c=g`,
  `&dark=1`, `&speed=N`, `&freeze=S`, `&seam=1` for the loop stripe-test).
- Tests: `pnpm test:unit` (generator) and `pnpm test:e2e` (Playwright).
- To test removal: delete `BloomShader.svelte`, `BloomTuner.svelte`, `src/lib/bloom/`,
  `tests/unit/`, their import/mount in `src/routes/+layout.svelte`, and
  `static/shader-lab.html`.

## Mobile testing (before every push)

The dev server always listens on the LAN (`server.host: true` in
`vite.config.js`), so any phone on the same Wi-Fi can load it live, HMR
included — no build, no deploy:

- **iPhone:** **`http://t.local:5199`** — `t` (for *test*) is the vault-wide
  Bonjour alias for this Mac, advertised by the always-on `amaanah.tlocal`
  agent (dot-to-dot `bin/t-local`), so it survives DHCP address changes and
  hostname renames. `vite.config.js` allow-lists `.local` names (vite's
  DNS-rebinding guard otherwise answers "Blocked request"). Fallbacks: the
  Mac's own name `http://temps-macbook-pro.local:5199`, or the "Network" URL
  vite prints (`just agent-logs`).
- `5199` is the always-on server (below). A bare `pnpm run dev` starts a
  second, throwaway instance on `5173`.

Check a poem on the phone (stanza gaps, nav, type size) before pushing —
the July-2025→Aug-2026 publish freeze hid a year of design drift, and
mobile is where this site is mostly read. Note the LAN exposure: anyone on
the same Wi-Fi can see the dev site while the server runs.

## Always-on dev server (localhost:5199)

`http://localhost:5199` is kept up 100% of the time by a macOS launchd
LaunchAgent (`com.clozach.allisinbloom.dev`): it starts at login and restarts
within seconds if it crashes or is killed (verified with `kill -9`). It runs
`just _serve-dev` with a fixed PATH (fnm's default Node, pnpm, Homebrew), so
it needs no shell hooks. Installed through the vault-wide `always-on` tool
(`~/Documents/2-Ongoing/dot-to-dot/bin/always-on`) — the same mechanism as
the stonks and finance-hub agents.

| | |
|---|---|
| Install / reinstall | `just install-agent` |
| Bounce (e.g. after a `vite.config.js` change) | `just restart-agent` |
| State, pid, last exit | `just agent-status` |
| Tail logs (`~/Library/Logs/allisinbloom/dev.{out,err}.log`) | `just agent-logs` |
| Opt out | `just uninstall-agent` |

Because launchd owns port 5199, never start another server there; the Claude
preview launcher `allisinbloom-dev` simply attaches to it.

## Development

This project is powered by [`sv`](https://github.com/sveltejs/cli) (SvelteKit).

```bash
   nvm use; pnpm run dev -- --open
```

## Building

To create a production version of the app:

```bash
   nvm use; pnpm run build
```

You can preview the production build with `nvm use; npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
