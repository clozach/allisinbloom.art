<script>
  import { onMount } from 'svelte';

  const STORE_KEY = 'bloom-tune-v1';

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

  // Every magic number in the shader, live-tunable from the tuner panel
  // (press ` on a poem page; slider metadata lives in BloomTuner.svelte).
  // These are the shipped defaults; the panel's Copy button exports your
  // current set for baking in. The shader itself ships OFF — `shaderOn`
  // is the easter-egg toggle, persisted per-browser in localStorage.
  const DEFAULTS = {
    shaderOn: false,
    speed: 1,
    doubling: 120,
    zoom: 2.2,
    unfold: 0.35,
    churn: 0.16,
    lw1: 0.055,
    lw2: 0.035,
    lv1: 0.42,
    lv2: 0.62,
    inkGain: 1.8,
    inkFloor: 0.35,
    annA: 0.28,
    annB: 0.55,
    core: 2.2,
    originX: 0.5,
    originY: 0.46,
    // palette gradient endpoints (sRGB hex). Shipped values sit inside the
    // a11y contrast bands; the pickers can leave the band, so re-check
    // contrast before baking in a new palette.
    lightGroundA: "#ffecd5",
    lightGroundB: "#d9cafe",
    lightLaceA: "#d9cff2",
    lightLaceB: "#5b95a1",
    darkGroundA: "#161114",
    darkGroundB: "#20191d",
    darkLaceA: "#3d3243",
    darkLaceB: "#513e5d",
  };

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

  /** @type {Record<string, any>} */
  let tune = { ...DEFAULTS };
  if (typeof window !== 'undefined') {
    try {
      tune = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
    } catch {
      /* stale storage, keep defaults */
    }
  }

  // assigned while the canvas is mounted; safe no-ops otherwise
  let kick = () => {};

  function onTweak() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORE_KEY, JSON.stringify(tune));
    }
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

  function resetTune() {
    tune = { ...DEFAULTS };
    if (typeof window !== 'undefined') localStorage.removeItem(STORE_KEY);
    kick();
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

uniform vec2 u_res;
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
uniform vec2 u_origin;
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
    vec2 p = (gl_FragCoord.xy - u_origin * u_res) / u_res.y;
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
    const t0 = performance.now();
    const FRAME_MS = 1000 / 30;
    // low-frequency field behind text: render at 70% and let CSS upscale
    const RENDER_SCALE = 0.7;
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
        'u_res', 'u_time', 'u_dark', 'u_loopT', 'u_zoom', 'u_unfold', 'u_churn',
        'u_lw1', 'u_lw2', 'u_lv1', 'u_lv2', 'u_inkGain', 'u_inkFloor',
        'u_annA', 'u_annB', 'u_core', 'u_origin',
        ...Object.keys(COLOR_UNIFORMS),
      ]) {
        locs[n] = gl.getUniformLocation(prog, n);
      }
      return true;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // re-read: zoom/display moves
      const w = Math.floor(canvas.clientWidth * dpr * RENDER_SCALE);
      const h = Math.floor(canvas.clientHeight * dpr * RENDER_SCALE);
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
      resize();
      const loopT = tune.doubling * 6; // one full ladder cycle
      const t = (((now - t0) / 1000) * tune.speed) % loopT;
      gl.uniform2f(locs.u_res, canvas.width, canvas.height);
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
      gl.uniform2f(locs.u_origin, tune.originX, tune.originY);
      for (const [uni, key] of Object.entries(COLOR_UNIFORMS)) {
        const [r, g, b] = hexToRgb(tune[key]);
        gl.uniform3f(locs[uni], r, g, b);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      hud = `t ${t.toFixed(1)}s / loop ${loopT.toFixed(0)}s`;
      if (reduced.matches) cancelAnimationFrame(raf); // one still frame
    }

    function start() {
      cancelAnimationFrame(raf);
      last = 0; // bypass the throttle so the next frame is immediate
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

{#if tune.shaderOn}
  <div class="cloud" aria-hidden="true">
    <canvas use:shader></canvas>
  </div>
{/if}

{#if panelOpen && TunerComp}
  <svelte:component
    this={TunerComp}
    bind:tune
    bind:theme
    {hud}
    {onTweak}
    {applyTheme}
    {resetTune}
  />
{/if}

<style>
  .cloud {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
