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

**Off by default; seeded per poem** (2026-08-23). Poem pages mount
`src/lib/components/BloomShader.svelte`. The first render of a poem rolls a 32-bit
seed, generates every shader knob and both palettes from it
(`src/lib/bloom/generate.js`, pure + deterministic), and stores the lot under
`localStorage['bloom-page-v1:<slug>']` (`src/lib/bloom/store.js`) — so each poem is
its own hand-made sheet, and a returning visitor sees the same sheet. The record is
`{ seed, current? }`: the seed is the page's **write-once default** (never rewritten
unless the visitor clears site data); `current` is its edited layer — slider tweaks
🎲 rolls and pasted sets — and **revert** deletes that layer. Site-wide
visibility lives apart in `bloom-prefs-v1` `{ shaderOn: false, animate: false }`: the
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
  `seconds per doubling` while off; the values are still generated and rolled, just
  hidden), one 🎲 beside `shader` that rerolls this poem's whole blot into its
  `current` layer, `theme` override, then **this poem · seed N** with a **field per
  knob** following the vault's propsheet contract (`NumberField.svelte`: label above;
  `[icon][value+unit]`; drag the icon to scrub — Pointer Lock wraps the cursor where
  allowed, touch-drag on phones; click/Tab to type, ↑/↓ nudge by step, ⇧ ×10, Enter/blur
  submit with junk stripped, Esc reverts; glyphs in `src/lib/bloom/icons.js`, mirrored
  from amaanah `projects/pixel-reveal/src/component/icons.js`), color pickers for the
  palette endpoints, `copy values` (JSON of this page's set) and `revert`. **Paste**
  (⌘V anywhere while the panel is open, not into a field) takes a copied set on as
  this page's values — the MVP sharing path: send a friend your `copy values` text and
  their view matches yours; their seed stays theirs so their revert still works; the
  button flashes `pasted!` or `not a bloom set`. The panel grows to the viewport height
  before it scrolls. It is `BloomTuner.svelte`, dynamic-imported on first
  summon so it ships as its own lazy chunk.
- ⚠️ `.env` must NOT set `NODE_ENV` — Vite reads it and silently turns
  `vite build` into a dev-mode build (bigger bundles, dev flags true). Removed
  2026-07-29; keep it out.
- `static/shader-lab.html` is the standalone iteration lab (`/shader-lab.html?c=g`,
  `&dark=1`, `&speed=N`, `&freeze=S`, `&seam=1` for the loop stripe-test).
- Tests: `pnpm test:unit` (generator) and `pnpm test:e2e` (Playwright).
- To test removal: delete `BloomShader.svelte`, `BloomTuner.svelte`, `NumberField.svelte`, `src/lib/bloom/`,
  `tests/unit/`, their import/mount in `src/routes/+layout.svelte`, and
  `static/shader-lab.html`.

## Signature nav

Every poem's signature is the site's front door (first pass, 2026-08-23: one
flower, both platforms). Source: `src/lib/sig-nav/` — mounted by
`src/lib/components/ByLine.svelte`, which wraps the signature image in a real
`<button aria-expanded aria-controls="sig-nav-garden">`.

**Hover phase.** Pointing at the author line (mouse), tabbing to the signature
(keyboard), or the first tap (phone) grows a hand-inked **calla lily** out of
the signature: seven cumulative frames, each cross-fading in over ~1 s on a
0.85 s beat (~6 s), grow-only — the overlap is the onion-skin. On a Mac
desktop a `⌃` badge fades in beside the signature first. The flower lands in a
free spot that touches the signature and covers no poem line: `measure.js`
reads every rendered text line, `placement.js` (pure, unit-tested) scans
candidate spots — above → beside → ragged-right → gutter — at 1×, 0.75×, 0.55×
and picks one (seeded PRNG) that sits in the current viewport when it can;
`garden.js` glues the two and falls back to a clamped "above" spot (flagged
`fallback`) when nothing is free. Hover is a trigger, not a hold: leaving
never cancels; re-entering is a no-op.

**Click phase.** Clicking the signature or the badge, `Enter`/`Space` on the
button, a bare `⌃` *tap*, or the phone's tap: a hoverfly flies in (~1.2 s) and
perches on the spathe while the word **home** drops onto a torn-paper tag tied
to the stem, Gilliam-credits style (per-letter, stepped, ±8° tilts, 90 ms
stagger). The word is a real link to the first poem in `static/route.txt`
(`/poems/<routes[0]>`, never `/`, which redirects at random). A click while
the lily is still growing is queued. Once up, the garden stays through
client-side poem changes (re-anchored, no regrowth) and resets on a real
reload. State lives in `store.js` as a tagged union
(`idle → blossoming → bloomed → labeling → labeled`) with transition functions
only.

**Keyboard (Mac desktop only — `keys.js`):** bare `⌃` tap = the click trigger
(detected on key*up*; any other key, mouse button, scroll wheel, or window
blur disarms it, so `⌃h`, `⌃`-click, `⌃`+wheel zoom and VoiceOver's pause key
held with anything are never taps — a bare VoiceOver pause *is* one, an
accepted trade-off); `⌃h` goes home from any poem. Every platform: `Tab` to
the signature blossoms, `Enter` (or the `⌃` tap) lands the word and moves
focus to it — which also scrolls it into view — unless you have Tabbed on
elsewhere in the meantime. Hovering/focusing the word shows a `⌃h`
keycap that fades 3 s *after* you leave (Mac desktop only).

**Phones** (`pointer: coarse`): one tap runs both phases as one chain at 2.5×
(~4.5 s); a second tap skips to the end. No badge, no hint; the signature's
hit box is padded to ≥ 44 px. **Reduced motion:** every trigger jumps to the
final pose with a single 350 ms fade, no sway. The lily sways ±2.5° over 6 s
otherwise, holding still while you point at the word, while the tab is hidden,
or while the signature is off-screen.

- **Test hook:** `localStorage['sig-nav-test'] = '{"seed":11,"speed":0}'` pins
  the placement PRNG and the speed multiplier (`0` = every phase instant);
  with it set, `window.__sigNav` exposes `state`, `placement`, `local`,
  `counters` (⌃ tap / ⌃h) and `diag` (`free`/`tried` candidates, the
  `roomReport` per scale — the "is there room for a 2nd flower" reading, and
  the obstacle list). Timings live in one table, `timing.js § TIMINGS`.
- **Lab page:** `static/sig-nav-lab.html` — `/sig-nav-lab.html?frame=N` renders
  the stacked frames, the fly and the chevron on light and dark grounds
  straight from the art modules (`src/lib/sig-nav/art/`).
- **Tests:** `pnpm test:unit` (placement engine) and `pnpm test:e2e`
  (`tests/sig-nav.spec.ts`: hover/click/⌃/keyboard/persistence/viewport-width/
  reduced-motion on desktop chromium, plus an `iphone` Playwright project —
  `devices['iPhone 13']` run in chromium — limited to this spec).
- **Known limits (first pass):** the runner stem is routed sideways-then-up
  and can still cross a long last line; the word tag is clamped to the page,
  not placed around text; the bare-⌃ tap has not yet had a live VoiceOver
  check.
- **To test removal:** delete `src/lib/sig-nav/`, `tests/sig-nav.spec.ts`,
  `tests/unit/placement.unit.mjs`, `static/sig-nav-lab.html`, the `iphone`
  project in `playwright.config.ts`; restore `ByLine.svelte` to the plain
  `<span class="author">…<img class="sig"/></span>` and drop the one
  `overflow-x: clip` line on `.app` in `src/routes/+layout.svelte`.

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
