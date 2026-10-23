<script>
  import { onMount } from 'svelte';
  import { dismissMenuEvent } from '$lib/movableMenu';
  import { loadPrefs, savePrefs, loadPage, savePage, revertPage, rollPage, pasteValues } from '$lib/bloom/store.js';
  import { setupBloom, drawBloom, loopSeconds } from '$lib/bloom/gl.js';

  /** the poem this page shows — its bloom is seeded + persisted per slug */
  export let slug = '';

  let panelOpen = false;
  /** theme override: 'auto' | 'light' | 'dark' */
  let theme = 'auto';
  let hud = '';

  // The tuner panel ships as an easter egg (press ` on a poem page); the
  // dynamic import keeps it out of the main bundle until first summoned.
  /** @type {typeof import('./BloomTuner.svelte').default | null} */
  let TunerComp = null;
  function togglePanel() {
    panelOpen = !panelOpen;
    if (panelOpen && !TunerComp) {
      import('./BloomTuner.svelte').then((m) => (TunerComp = m.default));
    }
  }
  function closePanel() {
    panelOpen = false;
  }

  // Touch front door: a long-press (600ms, finger held still) on the invisible
  // bottom-left hotspot opens the panel — phones have no ` key.
  const HOLD_MS = 600;
  const HOLD_SLOP_PX = 12;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let holdTimer = null;
  let holdX = 0;
  let holdY = 0;
  function cancelHold() {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
  }
  /** @param {PointerEvent} e */
  function onHoldStart(e) {
    cancelHold();
    holdX = e.clientX;
    holdY = e.clientY;
    holdTimer = setTimeout(() => {
      holdTimer = null;
      togglePanel();
    }, HOLD_MS);
  }
  /** @param {PointerEvent} e */
  function onHoldMove(e) {
    if (holdTimer && Math.hypot(e.clientX - holdX, e.clientY - holdY) > HOLD_SLOP_PX) cancelHold();
  }

  // Every magic number in the shader is generated per poem from a seed
  // (src/lib/bloom/generate.js) and persisted per page (store.js); the
  // tuner panel (press ` on a poem page) live-edits this page's values.
  // Visibility is site-wide: `prefs.shaderOn` shows the bloom (default off),
  // `prefs.animate` lets its clock run (default off → a still blot).

  // assigned while the canvas is mounted; safe no-ops otherwise
  let kick = () => {};

  let prefs = loadPrefs();
  /** @type {Record<string, any>} */
  let tune = {};
  let loadedSlug = '';
  // (re)load this page's blot whenever the poem changes
  $: if (slug !== loadedSlug) {
    loadedSlug = slug;
    tune = loadPage(slug);
    kick();
  }

  function onTweak() {
    savePage(slug, tune);
    kick();
  }
  function onPrefs() {
    savePrefs(prefs);
    kick();
  }

  // theme override flips the whole page (CSS tokens key on [data-theme])
  // so text ink and shader palette always move together
  function applyTheme() {
    if (typeof document === 'undefined') return;
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    kick();
  }

  // back to THIS poem's generated default (drops its edited layer only)
  function revert() {
    tune = revertPage(slug);
    kick();
  }
  /** the die: a whole new blot for this poem (motion knobs included — they show once animate is on) */
  function roll() {
    tune = rollPage(slug, tune.seed);
    kick();
  }
  /** a copied set, pasted while the panel is open → this page's values */
  /** @param {string} text @returns {boolean} */
  function paste(text) {
    const next = pasteValues(slug, tune, text);
    if (!next) return false;
    tune = next;
    kick();
    return true;
  }


  // ` summons the tuner panel everywhere (the easter egg's front door)
  onMount(() => {
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === 'Escape' && panelOpen) { dismissMenuEvent(e, closePanel); return; }
      if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.repeat) return;
        const t = /** @type {HTMLElement | null} */ (e.target);
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        e.preventDefault();
        togglePanel();
      }
    };
    /** @param {PointerEvent} e */
    const onOutside = (e) => {
      if (!panelOpen) return;
      const inside = e.composedPath().some((node) => node instanceof Element && node.matches('.tuner, .egg'));
      dismissMenuEvent(e, closePanel, inside);
    };
    window.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onOutside, true);
      window.removeEventListener('keydown', onKey);
      delete document.documentElement.dataset.theme;
    };
  });

  // GL lifecycle as an action: runs when the toggle mounts the canvas,
  // tears down when the toggle unmounts it.
  /** @param {HTMLCanvasElement} canvas */
  function shader(canvas) {
    const gl0 = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false });
    if (!gl0) {
      canvas.remove(); // never leave an undrawn opaque canvas behind
      return;
    }
    const gl = gl0; // non-null from here on, incl. inside hoisted functions


    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Bloom time advances by clamped per-frame deltas, never wall-clock:
    // when Safari skips frames (scroll start, toolbar animation) the next
    // frame must not "catch up" in one visible zoom-step. Under reduced
    // motion the clock is frozen, so every redraw is the same still.
    let clock = 0; // seconds of bloom time
    let prevFrame = 0;
    const MAX_STEP_MS = 1000 / 20;
    const FRAME_MS = 1000 / 30;
    // low-frequency field behind text: render at 70% and let CSS upscale;
    // the canvas now spans the whole document (it scrolls with the text),
    // so cap total pixels and scale down further for very long pages
    const RENDER_SCALE = 0.7;
    const MAX_PIXELS = 2.5e6;
    /** @type {HTMLElement} */
    const cloud = /** @type {HTMLElement} */ (canvas.parentElement);
    const probe = document.createElement('div'); // 100lvh: viewport height with iOS toolbars collapsed — stable while scrolling
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    let refH = 0; // CSS px — pinned per width so no mid-scroll viewport read can re-zoom
    let refW = 0;
    let pxScale = 1; // canvas px per CSS px
    let last = 0;
    let raf = 0;
    /** @type {Record<string, WebGLUniformLocation | null>} */
    let locs = {};

    // full GL object setup; rerun after webglcontextrestored
    function initGL() {
      const l = setupBloom(gl);
      if (!l) return false;
      locs = l;
      return true;
    }

    function resize() {
      // the cloud covers the document, not the viewport
      // cover the document, never less than one viewport. Always written as an
      // explicit height: a child's `height: 100%` cannot resolve against a
      // parent sized only by min-height (short poems rendered a half-height
      // canvas that way, 2026-08-22).
      const docH = Math.max(document.body.offsetHeight, document.documentElement.clientHeight);
      const want = `${docH}px`;
      if (cloud.style.height !== want) cloud.style.height = want;
      if (window.innerWidth !== refW) {
        // (re)measure only on a width change (orientation), never on the
        // height-only resizes iOS fires while its toolbars slide
        refW = window.innerWidth;
        refH = Math.max(probe.offsetHeight, window.innerHeight);
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // re-read: zoom/display moves
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      let scale = dpr * RENDER_SCALE;
      const budget = Math.sqrt(MAX_PIXELS / Math.max(1, cssW * cssH * scale * scale));
      if (budget < 1) scale *= budget;
      pxScale = scale;
      const w = Math.floor(cssW * scale);
      const h = Math.floor(cssH * scale);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function effectiveDark() {
      if (theme !== 'auto') return theme === 'dark' ? 1 : 0;
      return mql.matches ? 1 : 0;
    }

    /** @param {number} now */
    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (gl.isContextLost()) return;
      if (now - last < FRAME_MS) return;
      last = now;
      const still = reduced.matches || !prefs.animate;
      if (prevFrame && !still) {
        clock += (Math.min(now - prevFrame, MAX_STEP_MS) / 1000) * tune.speed;
      }
      prevFrame = now;
      resize();
      const loopT = loopSeconds(tune); // one full ladder cycle
      // the page's `phase` picks the moment in the loop a still frame shows;
      // animation runs onward from it
      const t = (tune.phase * loopT + clock) % loopT;
      drawBloom(gl, locs, tune, {
        time: t,
        dark: effectiveDark(),
        // origin sits at (originX, originY) of the FIRST screen, measured from the page top
        originPx: [tune.originX * canvas.width, canvas.height - tune.originY * refH * pxScale],
        ref: refH * pxScale
      });
      // pad t to the loop total's digit count (NBSP = one monospace cell) so
      // the hud never changes width mid-loop — 99→100 must not reflow the head
      const total = loopT.toFixed(0);
      hud = `${t.toFixed(0).padStart(total.length, ' ')}/${total}s`;
      if (still) cancelAnimationFrame(raf); // one still frame
    }

    function start() {
      cancelAnimationFrame(raf);
      last = 0; // bypass the throttle so the next frame is immediate
      prevFrame = 0; // and don't count the gap since the last frame as bloom time
      raf = requestAnimationFrame(draw);
    }
    kick = start;

    // under reduced motion the loop stops after one frame; redraw on any
    // signal so the still frame never goes stale
    const onResize = () => start();
    const onMotion = () => start();
    const onScheme = () => start();
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) start();
    };
    /** @param {Event} e */
    const onLost = (e) => {
      e.preventDefault(); // allow restore
      cancelAnimationFrame(raf);
    };
    const onRestored = () => {
      if (initGL()) start();
    };
    if (!initGL()) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove(); // page background shows through instead of black
      return;
    }

    window.addEventListener('resize', onResize);
    // page length changes (route change, fonts settling) → re-cover the document
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => start()) : null;
    ro?.observe(document.body);
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener?.('change', onMotion);
    mql.addEventListener?.('change', onScheme);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    start();

    return {
      destroy() {
        cancelAnimationFrame(raf);
        kick = () => {};
        window.removeEventListener('resize', onResize);
        ro?.disconnect();
        probe.remove();
        cloud.style.height = '';
        document.removeEventListener('visibilitychange', onVisibility);
        reduced.removeEventListener?.('change', onMotion);
        mql.removeEventListener?.('change', onScheme);
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    };
  }
</script>

{#if prefs.shaderOn}
  <div class="cloud" aria-hidden="true">
    <canvas use:shader></canvas>
  </div>
{/if}

<!-- invisible long-press hotspot (bottom-left) — the touch way into the tuner;
     also keyboard-reachable: Tab to it and press Enter/Space -->
<button
  class="egg"
  type="button"
  aria-label="Open bloom tuner"
  on:pointerdown={onHoldStart}
  on:pointermove={onHoldMove}
  on:pointerup={cancelHold}
  on:pointercancel={cancelHold}
  on:pointerleave={cancelHold}
  on:contextmenu|preventDefault
  on:click={(e) => e.detail === 0 && togglePanel()}
></button>

{#if panelOpen && TunerComp}
  <svelte:component
    this={TunerComp}
    bind:tune
    bind:prefs
    bind:theme
    {hud}
    {onTweak}
    {onPrefs}
    {applyTheme}
    {revert}
    {roll}
    {paste}
  />
{/if}

<style>
  .egg {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 56px;
    height: 56px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    opacity: 0;
    z-index: 50;
    -webkit-touch-callout: none;
    user-select: none;
    touch-action: none; /* hold must not scroll or zoom the page */
    cursor: default;
  }
  .egg:focus-visible {
    opacity: 1;
    outline: 2px solid var(--accent-strong, #b077c5);
    outline-offset: -4px;
    border-radius: 8px;
  }
  .cloud {
    /* anchored to the document so it scrolls WITH the text: the lace under
       each glyph stays put, and iOS toolbar collapse can't resize it */
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100vh; /* until resize() measures the page */
    z-index: -1;
    pointer-events: none;
    overflow: hidden;
  }
  canvas {
    /* absolute: percentages resolve against the cloud's real box, whatever
       sized it (explicit height or the min-height floor) */
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
