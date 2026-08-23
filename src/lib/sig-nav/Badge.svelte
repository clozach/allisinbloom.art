<script>
  // Badge.svelte — the ⌃ affordance (Mac desktop only). Sits just right of
  // the signature on its row, fades in over `--badge-fade`, and is a second
  // way to fire the click phase. Not a tab stop and hidden from screen
  // readers: the signature button already announces the nav — so a click must
  // not move focus onto it either (mousedown is prevented).
  import { CHEVRON } from './art/chevron.js';

  /** the rendered element, for the placement engine to treat as an obstacle @type {HTMLElement | null} */
  export let el = null;
  /** fade-in length, ms */
  export let fade = 350;
  /** click handler (the click trigger) */
  export let onActivate = () => {};
</script>

<button
  class="badge"
  type="button"
  tabindex="-1"
  aria-hidden="true"
  bind:this={el}
  style="--badge-fade:{fade}ms"
  on:mousedown|preventDefault
  on:click={onActivate}>{@html CHEVRON}</button
>

<style>
  .badge {
    position: absolute;
    left: 100%;
    bottom: 0.1em;
    margin-left: 0.5em;
    padding: 0.1em 0.3em;
    border: 1px solid var(--hr);
    border-radius: 0.35em;
    background: color-mix(in srgb, var(--bg) 92%, var(--accent) 8%);
    color: var(--ink);
    line-height: 1;
    /* tracks the "by" size (ByLine.svelte) */
    font-size: clamp(0.6rem, calc(0.6rem + (1.5rem - 0.6rem) * ((100vw - 50px) / (568px - 50px))), 1.5rem);
    cursor: pointer;
    animation: badge-in var(--badge-fade, 350ms) ease-out both;
    z-index: 2;
  }
  .badge :global(svg) {
    display: block;
  }
  @keyframes badge-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
