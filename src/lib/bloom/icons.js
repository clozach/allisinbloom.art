// The vault's unit/concept glyphs for live controls — mirrored from
// amaanah/projects/pixel-reveal/src/component/icons.js (one glyph per
// concept, reused by every property editor in the vault). Edit there first.
const wrap = (/** @type {string} */ inner) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/** @type {Record<string, string>} */
export const ICONS = {
    duration: wrap('<circle cx="8" cy="9.5" r="5"/><path d="M8 2.5v2M6.5 2.5h3M8 9.5l2.3-2.3"/>'),
    distance: wrap('<path d="M2 4v8M14 4v8M2 8h12M5 6l-3 2 3 2M11 6l3 2-3 2"/>'),
    speed:    wrap('<path d="M3 4l4.5 4L3 12M8.5 4l4.5 4-4.5 4"/>'),
    height:   wrap('<path d="M4 3v10M12 3v10M4 8h8"/>'),
    scale:    wrap('<path d="M3 13V3h10M13 13V9M13 13H9M13 13L7 7"/>'),
    ratio:    wrap('<path d="M3 13L13 3"/><circle cx="4.5" cy="4.5" r="1.6"/><circle cx="11.5" cy="11.5" r="1.6"/>'),
    position: wrap('<path d="M8 2v3M8 11v3M2 8h3M11 8h3"/><circle cx="8" cy="8" r="1.8"/>'),
    drag:     wrap('<path d="M1.5 8h13M4.5 5l-3 3 3 3M11.5 5l3 3-3 3"/>')
  };
