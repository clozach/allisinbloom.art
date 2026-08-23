// calla.js — the home-link calla lily, hand-inked in 7 CUMULATIVE frames.
//
// Frame k draws only what is NEW at step k; the renderer stacks frames 0..k
// (later frames paint on top), so nothing ever has to disappear. Paper fills
// in later frames cover the earlier, smaller bud — that overlap is the
// onion-skin. No hard-coded colours: strokes use currentColor (the page
// --ink via `color`), bodies use --sig-paper, the spadix uses --accent.
//
// Coordinates: base (stem root) bottom-centre; the bloom ends near
// bloomCenter; the hoverfly lands at `landing` (the right lip of the spathe).

export const ART_VERSION = 1;

// shorthand attribute sets (kept as strings so each frame stays one <g>)
const INK = 'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const PAPER = 'fill="var(--sig-paper)"';

export const CALLA = {
  viewBox: '0 0 120 160',
  base: { x: 60, y: 158 },
  bloomCenter: { x: 64, y: 52 },
  landing: { x: 70, y: 48 },
  frames: [
    // 0 — the sprout: a short shoot and a furled leaf-spike breaking ground
    `<g ${INK} fill="none" stroke-width="1.8">
      <path d="M52 158.5 Q60 156 68 158.5" stroke-width="1.2" opacity=".6"/>
      <path d="M60 158 C59.5 152 59 146 59.5 140"/>
      <path d="M59.5 140 C56 134 57 126 60.5 122 C63 127 62.5 135 59.5 140 Z" ${PAPER} stroke-width="1.4"/>
    </g>`,

    // 1 — the stem rises; the leaf's petiole sets out to the left
    `<g ${INK} fill="none" stroke-width="2">
      <path d="M59.5 140 C57 130 55 118 58 104"/>
      <path d="M60 150 C52 143 44 134 38 122" stroke-width="1.6"/>
    </g>`,

    // 2 — one broad arrow-shaped (sagittate) leaf, its midrib, two side veins
    `<g ${INK} fill="none" stroke-width="1.6">
      <path d="M38 122 C36 116 34 112 32 108" />
      <path d="M32 108 C28 116 18 122 10 119 C4 104 16 82 30 66 C44 82 56 104 50 119 C42 122 36 116 32 108 Z" ${PAPER}/>
      <path d="M32 108 C31 96 31 84 30 69" stroke-width="1"/>
      <path d="M31 96 C26 94 20 96 15 101 M31 86 C36 85 42 88 46 95" stroke-width=".7" opacity=".55"/>
    </g>`,

    // 3 — the stem reaches its throat; a closed, furled bud leans up-right
    `<g ${INK} fill="none" stroke-width="2">
      <path d="M58 104 C60 96 61 92 62 86"/>
      <path d="M62 86 C55 72 58 52 75 30 C81 46 76 70 62 86 Z" ${PAPER} stroke-width="1.6"/>
      <path d="M63 80 C62 64 67 48 74 36" stroke-width=".9" opacity=".6"/>
    </g>`,

    // 4 — the spathe fills out: flared left lip, oval far rim, the tip rising behind it
    `<g ${INK} fill="none" stroke-width="1.8">
      <path d="M62 86 C52 82 40 70 34 56 C32 50 32 46 32 44 C42 34 58 30 68 36 C74 30 82 18 86 8 C91 22 90 44 82 56 C78 70 68 80 62 86 Z" ${PAPER}/>
      <path d="M60 82 C52 72 44 62 38 52" stroke-width=".8" opacity=".5"/>
      <path d="M66 80 C70 70 76 62 80 58" stroke-width=".8" opacity=".45"/>
    </g>`,

    // 5 — the mouth opens: the spathe's inside, hatched toward the throat; the rolled front lip; the tip curls out
    `<g ${INK} fill="none" stroke-width="1.8">
      <path d="M32 44 C42 34 58 30 68 36 C74 30 82 18 86 8 C91 22 90 44 82 56 C66 68 42 62 32 44 Z" fill="currentColor" fill-opacity=".09" stroke="none"/>
      <path d="M40 48 C48 58 66 62 80 55 C70 50 52 46 40 48 Z" fill="currentColor" fill-opacity=".14" stroke="none"/>
      <path d="M50 58 C46 52 42 48 38 45 M70 57 C74 46 78 30 83 16 M76 56 C80 46 84 34 86 22" stroke-width=".7" opacity=".4"/>
      <path d="M32 44 C42 62 66 68 82 56 C68 74 44 70 32 44 Z" ${PAPER} stroke-width="1.6"/>
      <path d="M86 8 C88 4.5 91.5 4 93.5 7" stroke-width="1.6"/>
    </g>`,

    // 6 — the spadix stands in the throat, dusted with pollen
    `<g ${INK} fill="none" stroke-width="1.4">
      <path d="M58.5 63 C58 57 58.5 49 60 42 C61 38.5 64.5 38.5 65.5 42 C67 49 66.5 57 65 63 Z" fill="var(--accent)" stroke-width="1.2"/>
      <path d="M61.6 43.5 C61.2 49 61.2 55 61.6 60" stroke="var(--accent-strong)" stroke-width="1.8"/>
      <g fill="var(--accent-strong)" stroke="none">
        <circle cx="63.8" cy="46" r=".8"/><circle cx="60" cy="51" r=".7"/><circle cx="64" cy="55" r=".7"/><circle cx="60.4" cy="58.5" r=".6"/>
      </g>
    </g>`
  ]
};
