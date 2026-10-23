// The bloom's WebGL program, shared by the page background (BloomShader.svelte,
// which animates it across the document) and the picture of the day
// (Afterglow.svelte, one still frame in a frame of its own). The shader source,
// its uniform names and the way a tune becomes uniforms live here once.

// uniform name -> tune key for the palette endpoint colors
export const COLOR_UNIFORMS = {
  u_lg0: 'lightGroundA',
  u_lg1: 'lightGroundB',
  u_ll0: 'lightLaceA',
  u_ll1: 'lightLaceB',
  u_dg0: 'darkGroundA',
  u_dg1: 'darkGroundB',
  u_dl0: 'darkLaceA',
  u_dl1: 'darkLaceB'
};

export const UNIFORM_NAMES = [
  'u_originPx', 'u_ref', 'u_time', 'u_dark', 'u_loopT', 'u_zoom', 'u_unfold', 'u_churn',
  'u_lw1', 'u_lw2', 'u_lv1', 'u_lv2', 'u_inkGain', 'u_inkFloor',
  'u_annA', 'u_annB', 'u_core',
  ...Object.keys(COLOR_UNIFORMS)
];

/** @param {string} h e.g. "#c6bfcc" @returns {[number, number, number]} */
export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const VERT = `
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
export const FRAG = `
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

/** The fragment source for this context: highp where the GPU has it, mediump otherwise. @param {WebGLRenderingContext} gl */
export function fragmentSource(gl) {
  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  return hp && hp.precision > 0 ? FRAG : FRAG.replace('precision highp float;', 'precision mediump float;');
}

/**
 * @param {WebGLRenderingContext} gl @param {number} type @param {string} src
 */
function compile(gl, type, src) {
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

/**
 * Compiles and links the bloom, binds its one triangle, and looks up every
 * uniform. Call again after a context restore.
 * @param {WebGLRenderingContext} gl
 * @returns {Record<string, WebGLUniformLocation | null> | null} the uniform locations, or null
 */
export function setupBloom(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource(gl));
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('BloomShader:', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  /** @type {Record<string, WebGLUniformLocation | null>} */
  const locs = {};
  for (const n of UNIFORM_NAMES) locs[n] = gl.getUniformLocation(prog, n);
  return locs;
}

/** One full ladder cycle of a tune, in seconds. @param {Record<string, any>} tune */
export const loopSeconds = (tune) => tune.doubling * 6;

/**
 * Sets every uniform for one frame and draws it.
 * @param {WebGLRenderingContext} gl
 * @param {Record<string, WebGLUniformLocation | null>} locs
 * @param {Record<string, any>} tune
 * @param {{ time: number, dark: number, originPx: [number, number], ref: number }} frame
 *   time: seconds into the loop; dark: 1 for the dark palette; originPx: the bloom's
 *   origin in canvas pixels, GL coordinates (y up); ref: the reference length in px
 */
export function drawBloom(gl, locs, tune, frame) {
  gl.uniform1f(locs.u_time, frame.time);
  gl.uniform1f(locs.u_dark, frame.dark);
  gl.uniform1f(locs.u_loopT, loopSeconds(tune));
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
  gl.uniform2f(locs.u_originPx, frame.originPx[0], frame.originPx[1]);
  gl.uniform1f(locs.u_ref, frame.ref);
  for (const [uni, key] of Object.entries(COLOR_UNIFORMS)) {
    const [r, g, b] = hexToRgb(tune[key]);
    gl.uniform3f(locs[uni], r, g, b);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/**
 * One still of a tune in a canvas of its own: the picture of the day. The origin
 * sits where the tune puts it, the reference length is the canvas height, and
 * the moment is the tune's `phase`. Returns false where WebGL is unavailable;
 * the canvas is then left untouched for a CSS fallback.
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, any>} tune
 * @param {{ dark: boolean, width: number, height: number, pixelRatio?: number }} frame CSS px
 */
export function renderBloomStill(canvas, tune, { dark, width, height, pixelRatio = 1 }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, preserveDrawingBuffer: true });
  if (!gl) return false;
  const w = Math.max(1, Math.floor(width * pixelRatio));
  const h = Math.max(1, Math.floor(height * pixelRatio));
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, w, h);
  const locs = setupBloom(gl);
  if (!locs) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return false;
  }
  drawBloom(gl, locs, tune, {
    time: tune.phase * loopSeconds(tune),
    dark: dark ? 1 : 0,
    originPx: [tune.originX * w, h - tune.originY * h],
    ref: h
  });
  return true;
}
