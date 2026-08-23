// hoverfly.js — a small Syrphid (hoverfly) facing LEFT, drawn to perch at
// CALLA.landing. Body and wings are separate so the renderer can alternate
// the two wingBeat frames while it flies, then rest on one.
//
// Fills: --sig-paper body with currentColor bands/outlines; eyes currentColor
// with an --accent-strong highlight. No hard-coded colours.

export const ART_VERSION = 1;

const INK = 'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const PAPER = 'fill="var(--sig-paper)"';

export const HOVERFLY = {
  viewBox: '0 0 40 30',
  // head at left, thorax middle, flat banded abdomen tapering right
  body: `<g ${INK} fill="none" stroke-width="1.1">
    <path d="M13 20 L10 25.5 M16.5 21 L16 26 M20 20 L23.5 25" stroke-width=".9" opacity=".8"/>
    <path d="M21 11.2 C29 8.6 36.5 10.5 38.5 15 C36.5 19.5 29 21.4 21 18.8 Z" ${PAPER}/>
    <path d="M25.5 10.3 C26.2 13 26.2 17 25.5 19.7" stroke-width="2.4"/>
    <path d="M30 9.9 C30.6 12.8 30.6 17.2 30 20.1" stroke-width="2"/>
    <path d="M34.3 10.9 C34.7 13.2 34.7 16.8 34.3 19.1" stroke-width="1.6"/>
    <ellipse cx="16.5" cy="15" rx="5.6" ry="5.2" ${PAPER} stroke-width="1.2"/>
    <path d="M12.5 12.5 C14 10.5 19 10.5 20.5 12.5" fill="currentColor" fill-opacity=".25" stroke="none"/>
    <circle cx="8.6" cy="15" r="4.2" ${PAPER} stroke-width="1.2"/>
    <ellipse cx="7.4" cy="14.2" rx="2.9" ry="3.4" fill="currentColor" stroke="none"/>
    <circle cx="6.3" cy="12.7" r="1" fill="var(--accent-strong)" stroke="none"/>
    <path d="M5.2 11.6 L3.4 9.6 M6.4 10.9 L5.6 8.4" stroke-width=".9"/>
  </g>`,
  // two membranous wings from the thorax, swept back over the abdomen
  wingBeat: [
    // raised — mid-beat, both wings lifted up and back
    `<g ${INK} stroke-width=".9">
      <path d="M18 11.5 C23 3 32 .5 37.5 3.5 C34 8.5 25 11.5 18 11.5 Z" fill="currentColor" fill-opacity=".07"/>
      <path d="M19 12.5 C25 8 33 6.5 38 8.5 C33.5 11.5 25.5 13.5 19 12.5 Z" fill="currentColor" fill-opacity=".07"/>
      <path d="M20 11 C26 6 32 4 36 4.5" stroke-width=".6" opacity=".5"/>
    </g>`,
    // at rest / down-stroke — wings lying low along the back
    `<g ${INK} stroke-width=".9">
      <path d="M18 11.5 C26 6.5 35 6.5 39.5 10.5 C34 12.8 26 13.5 18 11.5 Z" fill="currentColor" fill-opacity=".07"/>
      <path d="M19 13 C27 10.5 35 11 39 13.5 C34.5 15.5 26.5 15.5 19 13 Z" fill="currentColor" fill-opacity=".07"/>
      <path d="M20 11.5 C27 8.5 34 8.5 38 10" stroke-width=".6" opacity=".5"/>
    </g>`
  ]
};
