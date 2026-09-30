# Figma design workshop

[Open the workshop](https://www.figma.com/design/YM1B3KmYzdYj4o7pL3tC5y?node-id=13-2) · [Start an experiment](https://www.figma.com/design/YM1B3KmYzdYj4o7pL3tC5y?node-id=14-245)

This pilot reconstructs the current **local source**, commit `67a2fa7aacb12d123dbc464554eab1f2b203282d`, as editable Figma components. It does not assert that production is at that commit. Created 29 September 2026; no production design change accompanies the workshop.

## Where to work

| Page | Purpose |
| --- | --- |
| 00 · Start here | A short guide to the design/implementation loop |
| 01 · Foundations | Light/Dark colors, source layout values, ten shared text styles |
| 02 · Components | Eight base component families, a rich Book content composition, and review instances |
| 03 · Current site | `the book bound in my old hound` at desktop/phone widths, Light/Dark; full-length frames |
| 04 · Your experiments | Duplicate one example, name it, then edit its connected instances |

The reference and experiment copies now use [the book bound in my old hound](https://allisinbloom.art/poems/the-book-bound-in-my-old-hound), verified against the live page on 29 September 2026. The frames extend to approximately 1440×2235 and 390×1767 so the whole poem remains visible; top/bottom spacing is sampled from 1440×1000 and 390×844 browser viewports.

Begin with instance overrides. The Poem instance exposes its title, verse and navigation components in the properties panel. Double-click through nested components when changing spacing or typography. The rich opening stanza is edited directly as text to preserve its inline italics; the other stanza fields are exposed properties. Keep instances connected when possible. A deliberate main-component edit propagates to **both** Current site and Your experiments; locking the baseline frame would not freeze inherited changes. Browser evidence and the source commit preserve the original baseline.

Figma examples are breakpoint specimens. Figma does not run the website's CSS media queries: desktop/phone variants capture the `568px` type-size breakpoint, and the phone byline is sampled at 390px. The browser remains the authority for fluid widths, long titles, narrow phones and responsive behavior.

## Add another poem

Duplicate a frame in **04 · Your experiments**, rename it, then select the **Poem instance inside the frame**. Al's second poem, [the world behind the world shifted](https://www.figma.com/design/YM1B3KmYzdYj4o7pL3tC5y?node-id=38-321), is a working example.

In the right panel, expand **Footer · choose directions** and set **Footer links** to **Both directions**, **Next only**, or **Previous only**. Choose the matching **Viewport** within that footer. Then edit **Previous poem → Label** and **Next poem → Label** in the same panel. Choose the footer state before entering the labels; switching between variants with absent links can restore a variant's default label. Phone and Desktop are separate layout specimens. The Phone two-way footer wraps its long titles; its 390px widths follow the live second poem.

For verse indentation, edit the actual text layer and select the line you want to indent. Figma's native control is **Typography → Type settings → Details → Paragraph indent**. Keep hard Returns between lines and paragraph spacing at zero. The repaired phone example uses **27.96875px** (28px is practical to type); the corresponding desktop indent is **39.9375px** (about 40px). Use zero for a flush-left line. You can also duplicate an already indented line and replace its words.

**Plain Tab is not a browser tab stop in Figma.** This poem's website source is a fenced block containing literal tabs, rendered with `tab-size: 8`; its Figma copy now represents those four leading tabs as paragraph indentation. Ordinary Markdown poems use a different source transform (six nonbreaking spaces per leading tab). During implementation, translate the chosen indentation back into the appropriate source format; do not insert arbitrary CSS or rewrite the poem's punctuation to match a Figma measurement. The native per-paragraph control is documented in the [Figma API](https://developers.figma.com/docs/plugins/api/TextNode/) and [December 2024 update](https://developers.figma.com/docs/plugins/updates/2024/12/13/version-1-update-105/).

## Source map

| Figma family | Main set | Production owner | Editable/state coverage |
| --- | --- | --- | --- |
| PoemTitle | `10:22` | `src/lib/components/PoemTitle.svelte` | Title; Desktop/Phone |
| PoemContent | `10:23` | `src/lib/components/PoemContent.svelte` | Verse with explicit line breaks; Desktop/Phone |
| PoemContent/Book | `29:170` | `src/routes/poems/the-book-bound-in-my-old-hound/+page.svx` through `PoemContent.svelte` | Desktop/Phone; five text paragraphs, preserved indentation/italics, real divider |
| ByLine | `10:24` | `src/lib/components/ByLine.svelte` | Desktop/Phone; original signature asset tinted with theme ink |
| NavLink | `10:43` | `src/lib/components/PoemNav.svelte` | Label; Previous/Next × Default/Hover/Focus |
| Bluesky | `10:54` | `src/lib/components/PoemNav.svelte` | Original vector; Default/Hover/Focus |
| PoemNav | `10:87` | `src/lib/components/PoemNav.svelte` | Footer links: Next only/Both directions/Previous only × Desktop/Phone; exposed Previous poem and Next poem labels |
| Poem | `10:134` | `src/lib/components/Poem.svelte`, `src/routes/poems/_poem.svelte` | Desktop/Phone; nested title, verse, nav exposed |
| PoemCard | `10:144` | `src/routes/poems/+page.svelte` | Title/Date; Default/Hover/Focus |

For a set link, append `?node-id=10-22` (replace the colon with a hyphen) to the workshop URL. Component descriptions carry their source paths. This map is the initial implementation bridge; no official Code Connect publishing was configured. Code Connect can be added later if the account's plan supports it and its maintenance cost is justified.

## Foundations and assets

Theme variables alias hidden palette values and expose the actual CSS syntax:

| Figma variable | CSS owner in `src/routes/+layout.svelte` |
| --- | --- |
| paper | `var(--bg)` |
| ink | `var(--ink)` |
| accent | `var(--accent)` |
| focus | `var(--accent-strong)` |
| rule | `var(--hr)` |
| card | `var(--card-bg)` |
| shadow | `var(--shadow)` |

The separate Source layout collection records existing literal values (padding, gaps and radius). Its descriptions preserve the CSS units. These are **not** new CSS custom properties: map changes back to existing selectors deliberately. `browser-focus` records the native Chrome/macOS card outline in Light/Dark, not a custom application token; other browsers may render their native focus differently.

Typography uses Noto Serif, Noto Serif Italic, Noto Serif Display SemiCondensed Bold and Noto Sans Thin. The missing Noto Serif Italic and Noto Serif Display variable fonts were uploaded from the Mac's existing fonts to the owner's Figma personal fonts under their open font license; verified available through Figma MCP. Text remains editable. The signature uses the real `artist-sig.png` alpha, and Bluesky uses the source SVG path. There is no page-sized screenshot masquerading as an editable design.

## Give an edit to Codex

Copy a link to the **specific frame**, and supply this short handoff:

> Implement this experiment in the existing allisinbloom.art codebase: [frame link].
> Change: [what I changed and why].
> Scope: [this poem / all poem pages / the index / site-wide].
> Keep: [verse line breaks, reading order, signature behavior, anything else].
> Compare with the recorded baseline, reuse the mapped Svelte components and CSS, and show a tested preview before production deployment.

When available, mark the chosen frame Ready for dev and give it a clear name. Dev Mode/MCP supplies design context; it is not an automatic deployment or a complete code replacement. The agent reads the frame, variables, assets and this map, then makes a focused source diff.

Before shipping an actual design change:

1. Reconcile the selected frame against current code and this baseline; preserve intervening edits.
2. Implement the delta in existing Svelte components. Preserve mdsvex content, routing, link semantics and accessibility.
3. Compare desktop/phone, Light/Dark, first/middle/last navigation and long labels in the running browser. Test the changed interaction, keyboard focus and meaningful responsive cases.
4. Run the checks appropriate to that code change, update its docs and reveal, and produce a preview/reviewable commit.
5. Deploy through the site's established release workflow once the concrete change is approved. Never push unrelated unshipped commits merely to publish a design tweak.
6. Update the Figma baseline and this source map after the accepted implementation lands. This is an intentional reconciliation step, not unattended two-way synchronization.

## Pilot verification (initial short-poem build)

- Eight main sets / 23 variants, ten shared text styles, three variable collections; native editable text and component instances.
- Four Current site exemplars and four experiment copies: desktop/phone × Light/Dark.
- Source and Figma screenshots visually compared at the same viewport sizes. Layout, fonts, verse, signature, navigation and theme match materially; browser/Figma text rounding and antialiasing differ by roughly 1–2px in some vertical positions.
- Card states were measured in the browser: title/date remain ink; hover lifts by 3px and increases the shadow; metadata has 12px bottom margin. Focus retains the native browser outline.
- A longer phone title was set through its exposed text property. It reflowed from one line to two and moved the verse/signature/nav down without overlap. Restoring the original yielded a byte-identical screenshot to the pre-test Figma frame.
- Temporary web capture was removed after rebuilding the components. The temporary source capture script was removed; `src/app.html` matches its original bytes. No application source remains modified by this pilot.

The replacement adds two rich-content variants (nine sets / 25 variants total), plus desktop/phone italic and end-mark styles (14 styles total). Eight full-length copies retain the exact rendered paragraphs, NBSP indentation, italic phrase and closing square; Last navigation shows the previous poem only. Navigation dividers now scale to 30% of their available column. The small square uses a documented Figma-only optical font-size adjustment to match the browser fallback glyph; do not copy that adjustment into CSS. Long-page text rounding accumulates to about 4–6px versus the browser.

The second-poem repair adds three Phone footer variants (28 total), exposes both link labels at the Poem level, and renames the navigation choices to explicit directions. Al's frame `38:320` preserves his edits, with four native paragraph indents and the correct previous/next titles. The saved frame remains a connected instance. Verification includes the rendered result, visible property-panel fields, per-line indent change/restoration through the Figma API, and intact original reference content. The exact manual Typography click sequence was not exercised end to end; native Tab behavior has not been changed. No application source or production deployment accompanies this repair.

Still outside this pilot: remaining poem layouts/content, shader/tuner design, a full index-page composition, animated prototypes, official Code Connect publishing, and the separate Swami KK library. The prototype frames do not implement real keyboard navigation or routes; these remain owned and tested in code.

## Undo and resume

Figma edits are undoable through Undo/version history; this new file is separate from existing design files. The source documentation is in Git. Resume with the file key `YM1B3KmYzdYj4o7pL3tC5y` and this map; the detailed node ledger and verification notes live in `amaanah/projects/allisinbloom-site/figma/`.
