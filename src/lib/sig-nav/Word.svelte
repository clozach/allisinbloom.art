<script>
  // Word.svelte — the link itself: a word on a torn-paper strip hanging by a
  // thread from the stem. Its letters drop in Gilliam-credits style (stepped
  // ~8 fps, ±12° on the way down, a ±8° tilt at rest, 90 ms apart). The strip
  // is clamped inside `bounds` so a long word can never leave the page; the
  // thread stays on the stem wherever the strip ends up. A ⌃h keycap hint
  // shows while the word is hovered/focused and fades only after you leave.

  const THREAD = 14; // px of thread between stem and strip
  const TIE = 10; // px in from the strip's left edge where the thread ties on
  const RESTS = [-7, 5, -4, 8, -6, 6];
  const CLEAR = 6; // px the strip keeps clear of the signature button

  import { intersects } from './placement.js';

  /** @type {string} */
  export let href;
  export let text = 'home';
  export let label = 'home — first poem';
  /** hang point, garden px: x on the stem, y where the thread starts @type {{ x: number, y: number }} */
  export let at;
  /** horizontal clamp for the strip's left/right edges, garden px */
  export let bounds = { minX: -Infinity, maxX: Infinity };
  /** a box the strip must not land on (the signature button), garden px @type {{x:number,y:number,w:number,h:number} | null} */
  export let avoid = null;
  /** show the ⌃h keycap (Mac desktop only) */
  export let hint = false;
  /** letters at rest at once (remount, reduced motion, speed 0) */
  export let instant = false;
  /** no hint fade either (reduced motion, speed 0 — NOT a remount) */
  export let still = false;
  /** hovered/focused state, for the parent to pause the sway */
  export let onEngage = (/** @type {boolean} */ _v) => {};

  /** @type {HTMLAnchorElement | null} */
  let link = null;
  let width = 0;
  let height = 0;
  let engaged = false;

  $: letters = [...text];
  // the tag hangs off the stem to the RIGHT (where the engine found room —
  // the poem's text is always to the left of a placed flower), then clamps
  $: top = at.y + THREAD;
  $: x = stripX(at.x - TIE, top, width, height, avoid, bounds);

  /**
   * The strip's left edge: under the tie point, pushed right past the
   * signature button when it would land on it (an 'above' flower hangs its
   * stem over the signature, and the button paints above the garden), then
   * clamped into the page.
   * @param {number} want @param {number} y @param {number} w @param {number} h
   * @param {{x:number,y:number,w:number,h:number} | null} box @param {{minX:number,maxX:number}} b
   */
  function stripX(want, y, w, h, box, b) {
    let left = want;
    if (box && intersects({ x: left, y, w, h }, box, CLEAR)) left = box.x + box.w + CLEAR;
    return Math.max(b.minX, Math.min(left, b.maxX - w));
  }

  export function focus() {
    link?.focus();
  }
  /** @param {boolean} v */
  function engage(v) {
    engaged = v;
    onEngage(v);
  }
</script>

<div
  class="strip"
  class:instant
  class:still
  bind:clientWidth={width}
  bind:clientHeight={height}
  style="left:{x}px; top:{top}px; --thread:{at.x - x}px; --thread-len:{THREAD}px"
>
  <!-- the thread: from the stem down to where it ties on the strip -->
  <svg class="thread" aria-hidden="true" focusable="false"
    ><line x1={at.x - x} y1={-THREAD} x2={TIE} y2="0" stroke="currentColor" stroke-width="1" opacity="0.6" /></svg
  >
  <a
    class="word"
    {href}
    aria-label={label}
    aria-keyshortcuts={hint ? 'Control+H' : undefined}
    data-sveltekit-preload-data="hover"
    bind:this={link}
    on:pointerenter={() => engage(true)}
    on:pointerleave={() => engage(false)}
    on:focus={() => engage(true)}
    on:blur={() => engage(false)}
  >
    {#each letters as ch, i}<span
        class="letter"
        aria-hidden="true"
        style="--i:{i}; --rest:{RESTS[i % RESTS.length]}deg; --tilt:{i % 2 ? 12 : -12}deg">{ch}</span
      >{/each}
  </a>
  {#if hint}
    <span class="hint" class:on={engaged} aria-hidden="true"><kbd>⌃h</kbd></span>
  {/if}
</div>

<style>
  .strip {
    position: absolute;
    display: flex;
    align-items: baseline;
    gap: 0.45em;
    pointer-events: none;
    transform: rotate(-3deg);
    transform-origin: var(--thread) calc(-1 * var(--thread-len));
    white-space: nowrap;
    /* the strip unrolls from the stem while the letters are still in the air */
    animation: unroll calc(var(--letter-delay, 0ms) + 1ms) ease-out both;
  }
  .strip.instant {
    animation: none;
  }
  @keyframes unroll {
    from {
      transform: rotate(-3deg) scaleY(0);
    }
    to {
      transform: rotate(-3deg) scaleY(1);
    }
  }
  .thread {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    overflow: visible;
  }
  .word {
    pointer-events: auto;
    position: relative;
    isolation: isolate;
    display: inline-block;
    font: 700 24px/1.1 'Noto Serif Display', 'Noto Serif', serif;
    color: var(--accent-strong);
    padding: 0.12em 0.5em 0.18em;
  }
  /* the torn paper is a layer UNDER the link, so the clip-path cannot eat the
     focus ring (clip-path clips an element's whole rendering, outline included) */
  .word::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--sig-paper);
    border: 1px solid color-mix(in srgb, currentColor 40%, transparent);
    clip-path: polygon(
      0 8%, 6% 0, 15% 6%, 28% 1%, 40% 7%, 55% 0, 68% 6%, 80% 1%, 92% 5%, 100% 0,
      100% 90%, 94% 100%, 82% 94%, 70% 100%, 56% 95%, 42% 100%, 30% 94%, 16% 100%, 6% 95%, 0 100%
    );
  }
  @media (max-width: 567px) {
    .word {
      font-size: 20px;
    }
  }
  .word::after {
    content: none;
  }
  .word:hover,
  .word:focus,
  .word:active {
    color: var(--accent-strong);
  }
  .word:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 3px;
  }
  .letter {
    display: inline-block;
    transform: rotate(var(--rest));
    animation: drop var(--letter-drop, 420ms) steps(3, end) both;
    animation-delay: calc(var(--letter-delay, 0ms) + var(--i) * var(--letter-stagger, 90ms));
  }
  .instant .letter {
    animation: none;
  }
  @keyframes drop {
    from {
      transform: translateY(-40px) rotate(var(--tilt));
      opacity: 0;
    }
    to {
      transform: translateY(0) rotate(var(--rest));
      opacity: 1;
    }
  }
  .hint {
    font: 600 12px/1 'Noto Sans', sans-serif;
    color: var(--ink);
    opacity: 0;
    /* own compositor layer: without it Chrome skips repainting an opacity-only
       change inside the zero-size garden when the grove is not animating
       (speed 0 / reduced motion) — the keycap stayed invisible at opacity 1 */
    will-change: opacity;
    transition: opacity var(--hint-fade, 3000ms) linear;
  }
  .hint.on {
    opacity: 1;
    transition-duration: 120ms;
  }
  .still .hint {
    transition: none;
  }
  kbd {
    font: inherit;
    background: var(--sig-paper);
    border: 1px solid var(--hr);
    border-radius: 4px;
    padding: 2px 5px;
  }
</style>
