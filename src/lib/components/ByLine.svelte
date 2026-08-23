<script>
  // The signature line — and the front door of the signature nav. The image
  // sits in a real <button> (screen readers hear "by Allisin Bloom, button,
  // collapsed"); SigNav hangs its ⌃ badge and garden off this `.author`.
  // This file only decides WHAT happened — hover, click, tap, focus, Enter —
  // and tells SigNav; every animation decision lives there.
  import SigNav from '$lib/sig-nav/SigNav.svelte';
  import { sigNav } from '$lib/sig-nav/store.js';
  import { isDesktop } from '$lib/sig-nav/platform.js';

  /** @type {HTMLElement | null} */ let authorEl = null;
  /** @type {HTMLImageElement | null} */ let sigEl = null;
  /** @type {SigNav | null} */ let nav = null;
  /** pointer type of the press that precedes a click ('' = keyboard) */
  let pressedWith = '';

  $: expanded = $sigNav.kind !== 'idle';

  // Hover is a trigger, not a hold: a mouse entering the line starts the
  // bloom; leaving never cancels. Touch must NOT count (iOS synthesises a
  // hover on first tap), so only `pointerType === 'mouse'` qualifies.
  /** @param {PointerEvent} e */
  const onEnter = (e) => e.pointerType === 'mouse' && nav?.hover();
  /** @param {PointerEvent} e */
  const onPress = (e) => (pressedWith = e.pointerType);
  /** @param {MouseEvent} e */
  function onClick(e) {
    const keyboard = e.detail === 0 || pressedWith === '';
    // an assistive-tech click (VoiceOver double-tap, Switch Control) has no
    // pointerdown: on a coarse-pointer device it still runs the phone chain
    const touch = pressedWith === 'touch' || pressedWith === 'pen' || (pressedWith === '' && !isDesktop());
    pressedWith = '';
    nav?.activate({ touch, keyboard });
  }
  /** @param {FocusEvent} e */
  function onFocus(e) {
    const el = /** @type {HTMLElement} */ (e.currentTarget);
    if (el.matches(':focus-visible')) nav?.hover();
  }
</script>

<span class="author" bind:this={authorEl} on:pointerenter={onEnter}
  ><span class="by">by</span><button
    type="button"
    class="sig-button"
    aria-expanded={expanded}
    aria-controls="sig-nav-garden"
    on:pointerdown={onPress}
    on:click={onClick}
    on:focus={onFocus}
    ><img class="sig" src="/artist-sig.png" alt="Allisin Bloom" bind:this={sigEl} /><span class="sr-only"
      >Opens site navigation</span
    ></button
  ><SigNav bind:this={nav} {authorEl} anchorEl={sigEl} /></span
>

<style>
  .author {
    position: relative;
    display: inline-flex;
    align-items: baseline;
    gap: clamp(0.1em, 2vw, 0.5rem);
    font-family: 'Noto Sans', sans-serif;
    font-weight: 100;
    padding-top: 3rem;
  }

  .by {
    line-height: 1;
    font-size: clamp(
      0.09rem,
      calc(0.09rem + (1.5rem - 0.09rem) * ((100vw - 50px) / (568px - 50px))),
      1.5rem
    );
  }

  .sig-button {
    position: relative;
    display: inline-block;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    line-height: inherit;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent; /* the bloom is the tap feedback */
    z-index: 51; /* wins its ~15 px overlap with the tuner's fixed hotspot (z 50) */
  }
  .sig-button:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 4px;
    border-radius: 4px;
  }
  /* ≥ 44 px hit box on phones: pad upward into the author line's 3 rem and a
     little to the right — never leftward, never moving the signature */
  @media (pointer: coarse) {
    .sig-button {
      --pad: 26px;
      padding-top: var(--pad);
      margin-top: calc(-1 * var(--pad));
      padding-right: 12px;
      margin-right: -12px;
    }
  }

  /* ℹ️ To calculate a new color for the sig: https://codepen.io/sosuke/pen/Pjoqqp
	   (recipes live in the --sig-filter theme token in +layout.svelte) */
  .sig {
    width: clamp(1rem, 25vw, 9rem);
    transform: translateY(0.1em);
    filter: var(--sig-filter);
    -webkit-touch-callout: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
</style>
