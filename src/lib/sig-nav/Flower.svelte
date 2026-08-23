<script>
  // Flower.svelte — one blossom, rendered from cumulative art frames. Frame k
  // fades in when `progress` passes k; nothing ever fades out (the overlap is
  // the onion-skin). A thin runner joins the stem origin on the signature to
  // the box's base when the engine put the box off to one side.

  /** @typedef {{ x: number, y: number }} Pt */

  /** the art module (CALLA): { viewBox, base, frames[] } @type {{ viewBox: string, frames: string[] }} */
  export let art;
  /** the flower box, in garden (author-relative) px; stem base at bottom-centre @type {{x:number,y:number,w:number,h:number}} */
  export let rect;
  /** where the stem roots on the signature, garden px (null = at the base) @type {Pt | null} */
  export let origin = null;
  /** frames visible: 0 (nothing) … art.frames.length (all) */
  export let progress = 0;
  /** no transitions — final pose at once (reduced motion, test speed 0, remount) */
  export let instant = false;
  /** 'off' = no sway class at all; 'on'; 'paused' = class kept, animation paused */
  export let sway = 'off';

  $: base = { x: rect.x + rect.w / 2, y: rect.y + rect.h };
  $: runner = origin && (Math.abs(origin.x - base.x) > 8 || Math.abs(origin.y - base.y) > 8) ? runnerPath(origin, base) : null;

  /**
   * A gentle curve from the signature out to the stem base: it leaves the
   * signature sideways first, then climbs — so it runs under the ragged
   * line-ends and up the free space the engine chose, not through the text.
   * @param {Pt} o @param {Pt} b
   */
  function runnerPath(o, b) {
    const minX = Math.min(o.x, b.x) - 4;
    const minY = Math.min(o.y, b.y) - 4;
    const w = Math.abs(o.x - b.x) + 8;
    const h = Math.abs(o.y - b.y) + 8;
    const cx = b.x - minX;
    const cy = o.y - minY;
    return { x: minX, y: minY, w, h, d: `M${o.x - minX} ${o.y - minY} Q${cx} ${cy} ${b.x - minX} ${b.y - minY}` };
  }
</script>

<div class="flower-root" class:instant>
  {#if runner}
    <svg
      class="runner"
      class:in={progress > 0}
      style="left:{runner.x}px; top:{runner.y}px; width:{runner.w}px; height:{runner.h}px"
      viewBox="0 0 {runner.w} {runner.h}"
      aria-hidden="true"
      focusable="false"
    >
      <path d={runner.d} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
  {/if}
  <div
    class="flower"
    class:sway={sway !== 'off'}
    class:paused={sway === 'paused'}
    style="left:{rect.x}px; top:{rect.y}px; width:{rect.w}px; height:{rect.h}px"
  >
    <svg viewBox={art.viewBox} width="100%" height="100%" aria-hidden="true" focusable="false">
      {#each art.frames as frame, k}
        <g class="frame" class:in={k < progress} style="--i:{k}">{@html frame}</g>
      {/each}
    </svg>
  </div>
</div>

<style>
  .flower-root {
    position: absolute;
    left: 0;
    top: 0;
    color: var(--ink);
    --sig-paper: color-mix(in srgb, var(--bg) 92%, var(--accent) 8%);
  }
  .flower,
  .runner {
    position: absolute;
    display: block;
  }
  .flower {
    transform-origin: 50% 100%;
  }
  .flower svg {
    display: block;
    overflow: visible;
  }
  .frame,
  .runner {
    opacity: 0;
    transition: opacity var(--frame-fade, 1000ms) ease-out;
  }
  .frame.in,
  .runner.in {
    opacity: 1;
  }
  .instant .frame,
  .instant .runner {
    transition: none;
  }
  .sway {
    animation: sway var(--sway-period, 6000ms) ease-in-out infinite alternate;
  }
  .sway.paused {
    animation-play-state: paused;
  }
  @keyframes sway {
    from {
      transform: rotate(-2.5deg);
    }
    to {
      transform: rotate(2.5deg);
    }
  }
</style>
