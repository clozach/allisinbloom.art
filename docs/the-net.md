# The Net

Since 2026-10-23 the site's front door is **the Net**: `/` shows a wire-frame Earth with the network's nodes, the one that answered you lit and its service region glowing, and nothing else. Hover, tap or Tab to it and it offers one thing: *Poem?*. The poem page then keeps to itself until a slow reader could have finished, and only afterwards offers the way onward. This replaces the random redirect from `/` and the previous/next poem links.

## What a visitor meets

1. **`/` — the Net.** A sphere of edges and nodes (a 15° mesh, the mesh's own crossings as dots) in the page ink, the nineteen nodes as larger dots, the lit node in the accent colour with a breathing halo over its region (the cells nearest to it, on a 5° grid). No words. Drag turns the Earth; so do the arrow keys from the *Poem?* link (⇧ for 15°), and Home brings your node back to the front. *Poem?* is a plain link; it is invisible until the globe is hovered, tapped, or the link is focused, and it floats above the lit node. The first frame is drawn on the server, so the Net needs no JavaScript to show itself.
2. **The poem page, at first:** the poem, its title and the signature, which is a plain image for now. No links, no buttons, no message. (The bloom tuner's invisible corner hotspots are still there for the owner.)
3. **When the poem has had its time:** a message appears below the byline, in Allisin's voice, saying the picture of the day for your region will be ready in about ninety seconds. The signature becomes the link to the Net and the Bluesky butterfly appears beneath. The page records that this poem was read (`localStorage` `net-read-v1`, slug → day) for the roadmap's unlocks.
4. **About ninety seconds later, never exactly:** a small picture appears (96 × 72 px). It is the region's bloom for the reader's own calendar day. Triggered, it fills the viewport; Escape or a click anywhere lets it go, and focus returns to the small picture. It carries no close button.
5. **For a visitor who hears the page:** the globe's accessible name says what it is and which node is lit; the message is announced when it appears (the block is `aria-live="polite"`); the picture is a button named for the region, described by a paragraph in the voice of a British aristocrat turned documentarian (`src/lib/net/voice.js`), and the full picture is a dialog described by the same paragraph.

## Where the pieces are

| Piece | File | Notes |
| --- | --- | --- |
| The nodes | `src/lib/net/nodes.js` | Vercel's nineteen regions with coordinates; nearest node by great circle; a guess from the browser's clock for a dev server |
| The globe | `src/lib/net/globe.js` | pure orthographic projection to SVG path data; front and back mesh, dots, the lit region, node positions; about 20 KB of path data per frame |
| The pick | `src/lib/net/pick.js` | FNV-1a; `pickPoem(slugs, node, minute)`; `pictureSeed(node, day)` |
| Which node answered | `src/lib/net/where.js` | `?node=` query, then the first segment of `x-vercel-id`, then the geolocation headers; `null` on a dev server |
| The pace | `src/lib/net/reading.js` | reading time, the wait, the site-wide preferences the tuner edits, the read record |
| The narration | `src/lib/net/voice.js` | deterministic prose for the picture |
| The bloom program | `src/lib/bloom/gl.js` | the shader and its uniforms, shared by the page background and the picture |
| `/` | `src/routes/+page.server.js`, `+page.svelte`, `src/lib/components/TheNet.svelte` | server load reads the headers and picks the poem; the component draws and turns the globe |
| The poem page's offers | `src/lib/components/Afterglow.svelte`, mounted by `Poem.svelte` | the clock, the message, the picture; the signature's link comes from its `phase` |
| The tuner's pace group | `src/lib/components/BloomTuner.svelte` | press `` ` `` on a poem page: seven fields, *reveal now*, *start over*, *reset pace* |

## The clock

- **Reading time** = words ÷ (mean − 2 × spread) wpm + lines × pause, never below the floor. Defaults: mean 238 wpm (Brysbaert 2019, silent adult reading of English non-fiction), spread 50 wpm, so 138 wpm; 500 ms per line; floor 8 s. The four-line *opening in sight* gets about 13 s. The reading clock runs only while the page is in view (`visibilitychange`).
- **The wait** = 90 s plus a random offset of at least a second either way (up to ±12 s). It runs on the wall clock: a break counts.
- All seven numbers are site-wide preferences in `localStorage` `net-pace-v1`, edited from the tuner; a change reschedules a running clock. *reveal now* advances a phase; *start over* returns to the reading phase. A page opened with `?afterglow=message|thumb|open` starts at that phase (what the tests and the reveal captures use).

## The poem the Net offers

`pickPoem` hashes `<node>:<UTC minute>` over the poems the site navigates (`static/route.txt` plus any staged drafts), so everyone answered by the same node in the same minute is offered the same poem. On production `/` carries `vercel-cdn-cache-control: max-age=60, stale-while-revalidate=600`: Vercel's CDN caches per region, so the cached copy agrees with the pick and no function wakes for the next visitor in that region for a minute (stale copies serve for up to ten minutes more while one refreshes). Previews, staging and the dev server render every request. A `?node=` query bypasses nothing but changes the key.

## The picture of the day

The region's picture is a bloom (the site's own generative background) rendered as one still from a seed of `picture:<node>:<YYYY-MM-DD>` in the reader's own calendar day, with the light or dark palette the page is in. There are no image files; the regions and the days supply the variety, and the narration is derived from the same values. A browser without WebGL shows a tinted square in the palette's lace colour, and the narration stands for the picture.

## Lighthouse

`/` is rendered on the server (the layout's server load uses Node modules, so it cannot run at the edge); the CDN rule above is what keeps cold starts away from most visitors. The globe is inline SVG with five path elements and twenty circles; the pulse animates one group's opacity and stops under reduced motion. Nothing on the poem page changes within Lighthouse's window: the first offer comes seconds later. Measure with `scripts/lighthouse/` as before; both `/` and a poem page are scored.

## To test by hand

- `http://t.local:5199/?node=hnd1` lights Tokyo; without `?node=` the dev server has no network headers and the browser guesses from its time zone.
- On a poem page, press `` ` `` and *reveal now* twice to reach the picture without waiting; or open `/poems/opening-in-sight?afterglow=thumb`.
- Tests: `pnpm test:unit` (`tests/unit/net.unit.mjs`), `pnpm test:e2e` (`tests/the-net.spec.ts`, `tests/afterglow.spec.ts`, and the nav spec).

## Roadmap, not built

Other lenses on the planet; the moon as a visitor-arranged archive after five poems read in full (the read record exists); languages; gaming platforms; print beyond the `@media print` rule that keeps the globe still. Curated pictures in place of, or beside, the generated bloom. Narration spoken aloud (the Web Speech API has British English voices) for visitors who want to hear it without a screen reader.

## To remove

Delete `src/lib/net/`, `TheNet.svelte`, `Afterglow.svelte`, `src/routes/+page.server.js`; restore `src/routes/+page.js` (the random 307), the `PoemNav` mount and the key handler in `src/routes/+layout.svelte`, and the signature's fixed `href` in `ByLine.svelte`; drop the pace group from `BloomTuner.svelte`. `src/lib/bloom/gl.js` can stay: the background uses it.
