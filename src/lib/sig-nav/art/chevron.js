// chevron.js — the ⌃ (U+2303 UP ARROWHEAD) badge glyph as inline SVG.
// Noto Serif carries no ⌃ glyph, so the badge draws its own: round caps,
// stroke weight ≈ Noto Serif 700 stems (~2.6 units on a 24 box), sized by
// the surrounding font-size via `1em`.

export const ART_VERSION = 1;

export const CHEVRON =
  `<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false">` +
  `<path d="M5.5 15.5 L12 8.5 L18.5 15.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
  `</svg>`;
