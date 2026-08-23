<script>
  // Fly.svelte — the hoverfly. Mounted at the start of the click phase, it
  // flies in from up-right over `--fly-in` and perches with its feet on `at`
  // (CALLA.landing in garden px); wings alternate the two art frames while
  // `flying`, then rest on the lowered pair.

  /** the art module (HOVERFLY) @type {{ viewBox: string, body: string, wingBeat: string[] }} */
  export let art;
  /** landing point, garden px (bottom-centre of the fly's box) @type {{ x: number, y: number }} */
  export let at;
  /** px per art unit — the flower's own scale so the fly is in proportion */
  export let scale = 1;
  /** wings beating, flight animation running */
  export let flying = false;
  /** no flight: sits landed at once */
  export let instant = false;

  $: [, , vw, vh] = art.viewBox.split(/\s+/).map(Number);
  $: w = vw * scale;
  $: h = vh * scale;
</script>

<div
  class="fly"
  class:flying
  class:instant
  style="left:{at.x - w / 2}px; top:{at.y - h}px; width:{w}px; height:{h}px"
>
  <svg viewBox={art.viewBox} width="100%" height="100%" aria-hidden="true" focusable="false">
    {@html art.body}
    <g class="wing up">{@html art.wingBeat[0]}</g>
    <g class="wing down">{@html art.wingBeat[1]}</g>
  </svg>
</div>

<style>
  .fly {
    position: absolute;
    color: var(--ink);
    --sig-paper: color-mix(in srgb, var(--bg) 92%, var(--accent) 8%);
    animation: fly-in var(--fly-in, 1200ms) cubic-bezier(0.3, 0.7, 0.4, 1) both;
  }
  .fly svg {
    display: block;
    overflow: visible;
  }
  .fly.instant {
    animation: none;
  }
  .wing.up {
    opacity: 0;
  }
  .flying:not(.instant) .wing.up {
    animation: beat-up 90ms steps(1) infinite;
  }
  .flying:not(.instant) .wing.down {
    animation: beat-down 90ms steps(1) infinite;
  }
  @keyframes fly-in {
    0% {
      transform: translate(170px, -120px) rotate(-14deg);
      opacity: 0;
    }
    12% {
      opacity: 1;
    }
    55% {
      transform: translate(46px, -38px) rotate(6deg);
    }
    80% {
      transform: translate(10px, -14px) rotate(-3deg);
    }
    100% {
      transform: none;
    }
  }
  @keyframes beat-up {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
  @keyframes beat-down {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }
</style>
