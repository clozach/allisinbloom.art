<script>
  import { onMount } from 'svelte';
  import { loadPrefs, savePrefs, loadPage, savePage, revertPage, rollPage, pasteValues } from '$lib/bloom/store.js';

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
  // uniform name -> tune key for the palette endpoint colors
  const COLOR_UNIFORMS = {
    u_lg0: 'lightGroundA',
    u_lg1: 'lightGroundB',
    u_ll0: 'lightLaceA',
    u_ll1: 'lightLaceB',
    u_dg0: 'darkGroundA',
    u_dg1: 'darkGroundB',
    u_dl0: 'darkLaceA',
    u_dl1: 'darkLaceB',
  };

  /** @param {string} h e.g. "#c6bfcc" @returns {[number, number, number]} */
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

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

  const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

  // Endless fractal blossoming: a cyclic scale-ladder about an origin.
  // Six layers of billow-lobe contour filigree; each layer's features grow
  // without end (doubling every u_doubling seconds), born as hairline lace,
  // dissolving as broad bands -- watched stilly, every line keeps
  // re-articulating into finer lines forever. Every time term is an
  // integer-frequency function of f = t/loopT, so the loop is bit-exact
  // (verified: zero pixel diff at t vs t+loopT).
  // The two palettes are hard-coded to their accessibility bands (light
  // stays >= 4.5:1 under #533737 ink; dark >= 4.5:1 under the cream ink),
  // so no knob can break text contrast.
  const FRAG = `
precision highp float;
const float TAU = 6.28318530718;
const float LN = 6.0;

uniform vec2 u_originPx; // bloom origin, canvas px (GL coords)
uniform float u_ref;     // reference length, canvas px: one stable viewport height
uniform float u_time;
uniform float u_dark;
uniform float u_loopT;
uniform float u_zoom;
uniform float u_unfold;
uniform float u_churn;
uniform float u_lw1;
uniform float u_lw2;
uniform float u_lv1;
uniform float u_lv2;
uniform float u_inkGain;
uniform float u_inkFloor;
uniform float u_annA;
uniform float u_annB;
uniform float u_core;
uniform vec3 u_lg0;
uniform vec3 u_lg1;
uniform vec3 u_ll0;
uniform vec3 u_ll1;
uniform vec3 u_dg0;
uniform vec3 u_dg1;
uniform vec3 u_dl0;
uniform vec3 u_dl1;

float hash2(vec2 p) {
    p = 50.0 * fract(p * 0.3183099 + vec2(0.71, 0.113));
    return fract(p.x * p.y * (p.x + p.y));
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 fr = fract(p);
    vec2 u = fr * fr * (3.0 - 2.0 * fr);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

const mat2 M2 = mat2(0.80, 0.60, -0.60, 0.80);

// Soft billow lobes; per-octave orbit churn at integer frequencies {1,2,3,5}.
float lobes(vec2 q, float f) {
    float amp = 0.5;
    float sum = 0.0;
    float nrm = 0.0;
    vec2 qq = q;
    for (int i = 0; i < 4; i++) {
        float kf = floor(exp2(float(i) * 0.78) + 0.5);
        float th = TAU * kf * f + float(i) * 2.4;
        vec2 orb = u_churn * vec2(cos(th), sin(th));
        float n = vnoise(qq + orb);
        sum += amp * abs(2.0 * n - 1.0);
        nrm += amp;
        amp *= 0.55;
        qq = M2 * qq * 2.02;
    }
    return sum / nrm;
}

void main() {
    float f = fract(u_time / u_loopT); // the ONLY gateway for time
    // normalized against a STABLE length (not the canvas size) so neither
    // page length nor iOS toolbar collapse can re-zoom the pattern
    vec2 p = (gl_FragCoord.xy - u_originPx) / u_ref;
    float r = length(p);

    // the blossoming ladder
    float ink = 0.0;
    float body = 0.0;
    float wsum = 0.0;
    for (int i = 0; i < 6; i++) {
        float phase = fract(f + float(i) / LN);
        float freq = exp2((1.0 - phase) * LN - u_zoom);
        float w = smoothstep(0.0, 0.30, phase) * (1.0 - smoothstep(0.70, 1.0, phase));
        float unfold = 1.0 + u_unfold * phase;
        vec2 q = p * freq / unfold;
        float n = lobes(q + vec2(17.31, 9.77) * float(i), f);
        float c1 = 1.0 - smoothstep(0.0, u_lw1, abs(n - u_lv1));
        float c2 = (1.0 - smoothstep(0.0, u_lw2, abs(n - u_lv2))) * 0.6;
        ink += w * (c1 + c2);
        body += w * n;
        wsum += w;
    }
    ink = clamp(ink * u_inkGain / max(wsum, 1e-4), 0.0, 1.0);
    body = body / max(wsum, 1e-4);

    // radial breath: luminous core, lace densest in a bloom annulus
    float core = exp(-r * r * u_core);
    float annulus = smoothstep(0.05, u_annA, r) * (1.0 - smoothstep(u_annB, u_annB + 0.5, r));
    ink *= u_inkFloor + (1.0 - u_inkFloor) * annulus;

    float shade = smoothstep(0.15, 0.9, body);

    // LIGHT palette: ground and lace gradients from tunable endpoints
    // (shipped defaults: pearl ground, mauve lace, a11y floor ~5.9:1 vs ink)
    vec3 Lground = mix(u_lg0, u_lg1, shade);
    vec3 Llace = mix(u_ll0, u_ll1, 0.5 + 0.5 * shade);
    vec3 light = mix(Lground, Llace, ink);
    light += vec3(0.014, 0.005, -0.004) * core;

    // DARK palette (shipped defaults: plum-black ground, dusk-mauve lace,
    // ~6.6:1 vs cream ink)
    vec3 Dground = mix(u_dg0, u_dg1, shade);
    vec3 Dlace = mix(u_dl0, u_dl1, 0.5 + 0.5 * shade);
    vec3 darkc = mix(Dground, Dlace, ink);
    darkc += vec3(0.012, 0.007, 0.014) * core;

    gl_FragColor = vec4(mix(light, darkc, u_dark), 1.0);
}
`;

  // ` summons the tuner panel everywhere (the easter egg's front door)
  onMount(() => {
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = /** @type {HTMLElement | null} */ (e.target);
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        togglePanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
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

    const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const fragSrc =
      hp && hp.precision > 0
        ? FRAG
        : FRAG.replace('precision highp float;', 'precision mediump float;');

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

    /**
     * @param {number} type
     * @param {string} src
     */
    function compile(type, src) {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('BloomShader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    // full GL object setup; rerun after webglcontextrestored
    function initGL() {
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('BloomShader:', gl.getProgramInfoLog(prog));
        return false;
      }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      locs = {};
      for (const n of [
        'u_originPx', 'u_ref', 'u_time', 'u_dark', 'u_loopT', 'u_zoom', 'u_unfold', 'u_churn',
        'u_lw1', 'u_lw2', 'u_lv1', 'u_lv2', 'u_inkGain', 'u_inkFloor',
        'u_annA', 'u_annB', 'u_core',
        ...Object.keys(COLOR_UNIFORMS),
      ]) {
        locs[n] = gl.getUniformLocation(prog, n);
      }
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
      const loopT = tune.doubling * 6; // one full ladder cycle
      // the page's `phase` picks the moment in the loop a still frame shows;
      // animation runs onward from it
      const t = (tune.phase * loopT + clock) % loopT;
      gl.uniform1f(locs.u_time, t);
      gl.uniform1f(locs.u_dark, effectiveDark());
      gl.uniform1f(locs.u_loopT, loopT);
      gl.uniform1f(locs.u_zoom, tune.zoom);
      gl.uniform1f(locs.u_unfold, tune.unfold);
      gl.uniform1f(locs.u_churn, tune.churn);
      gl.uniform1f(locs.u_lw1, tune.lw1);
      gl.uniform1f(locs.u_lw2, tune.lw2);
      gl.uniform1f(locs.u_lv1, tune.lv1);
      gl.uniform1f(locs.u_lv2, tune.lv2);
      gl.uniform1f(locs.u_inkGain, tune.inkGain);
      gl.uniform1f(locs.u_inkFloor, tune.inkFloor);
      gl.uniform1f(locs.u_annA, tune.annA);
      gl.uniform1f(locs.u_annB, tune.annB);
      gl.uniform1f(locs.u_core, tune.core);
      // origin sits at (originX, originY) of the FIRST screen, measured from the page top
      gl.uniform2f(locs.u_originPx, tune.originX * canvas.width, canvas.height - tune.originY * refH * pxScale);
      gl.uniform1f(locs.u_ref, refH * pxScale);
      for (const [uni, key] of Object.entries(COLOR_UNIFORMS)) {
        const [r, g, b] = hexToRgb(tune[key]);
        gl.uniform3f(locs[uni], r, g, b);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      hud = `${t.toFixed(0)}/${loopT.toFixed(0)}s`;
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
    onClose={closePanel}
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
