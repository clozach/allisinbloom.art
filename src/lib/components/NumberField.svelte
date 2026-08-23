<script>
  // Figma-style numeric field (vault propsheet contract, 2026-08-21): label
  // ABOVE the control; the control is [icon][value+unit]. Drag the icon to
  // scrub (right = up, `step` per px) — a plain capture-drag, never Pointer
  // Lock: Safari answers pointer lock with a mandatory "mouse pointer is
  // hidden" banner that pushes the whole page down. Click/Tab into
  // the number to type; ↑/↓ nudge by `step` (⇧ ×10); Enter or blur submits
  // with every non-numeric character stripped; Esc reverts.
  import { ICONS } from '$lib/bloom/icons.js';

  export let label = '';
  export let unit = '';
  export let icon = 'ratio';
  export let min = 0;
  export let max = 1;
  export let step = 0.01;
  /** @type {number} */
  export let value;
  /** @type {(v: number) => void} */
  export let onChange = () => {};

  $: decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  $: text = fmt(value);

  /** @param {number} v */
  function clamp(v) {
    const f = 10 ** decimals;
    return Math.min(max, Math.max(min, Math.round(v * f) / f));
  }
  /** @param {number} v */
  function fmt(v) {
    const s = decimals ? v.toFixed(decimals).replace(/\.?0+$/, '') : String(Math.round(v));
    return s + unit;
  }
  /** @param {number} v */
  function commit(v) {
    value = clamp(v);
    onChange(value);
  }
  /** @type {HTMLInputElement} */
  let input;
  function submit() {
    const cleaned = input.value.replace(/[^0-9.\-]/g, '').replace(/(?!^)-/g, '');
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) commit(n);
    text = fmt(value);
    input.value = text;
  }
  /** @param {KeyboardEvent} e */
  function onKey(e) {
    e.stopPropagation(); // the page's own shortcuts (j/k, `) never fire from here
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
      input.select();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input.value = fmt(value);
      input.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(value + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1));
      input.value = fmt(value);
      input.select();
    }
  }

  // scrubbing — plain capture-drag only (no Pointer Lock; see header comment)
  let dragging = false;
  let startVal = 0;
  let acc = 0;
  let lastX = 0;
  /** @param {MouseEvent} e */
  function onMove(e) {
    acc += (e.clientX - lastX) * step;
    lastX = e.clientX;
    commit(startVal + acc);
  }
  function endDrag() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', endDrag);
    dragging = false;
  }
  /** @param {MouseEvent} e */
  function startDrag(e) {
    e.preventDefault();
    startVal = value;
    acc = 0;
    lastX = e.clientX;
    dragging = true;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDrag);
  }
  // touch: the same capture-drag
  /** @param {TouchEvent} e */
  function onTouchStart(e) {
    const t = e.touches[0];
    startVal = value;
    acc = 0;
    lastX = t.clientX;
    dragging = true;
  }
  /** @param {TouchEvent} e */
  function onTouchMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    acc += (t.clientX - lastX) * step;
    lastX = t.clientX;
    commit(startVal + acc);
  }
</script>

<div class="field">
  <span class="lbl">{label}</span>
  <div class="ctl">
    <span
      class="knob"
      class:is-dragging={dragging}
      role="presentation"
      title="drag to adjust {label}"
      on:mousedown={startDrag}
      on:touchstart|passive={onTouchStart}
      on:touchmove={onTouchMove}
      on:touchend={endDrag}
    >
      {@html ICONS[icon] || ICONS.ratio}
    </span>
    <input
      bind:this={input}
      type="text"
      inputmode="decimal"
      spellcheck="false"
      aria-label="{label}{unit ? ` (${unit})` : ''}"
      value={text}
      on:focus={(e) => e.currentTarget.select()}
      on:keydown={onKey}
      on:blur={submit}
    />
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .lbl {
    color: #b9b1c2;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .ctl {
    display: flex;
    align-items: center;
    height: 28px;
    background: rgb(255 255 255 / 0.07);
    border: 1px solid rgb(255 255 255 / 0.14);
    border-radius: 6px;
  }
  .ctl:focus-within {
    border-color: #caa8d6;
  }
  .knob {
    display: grid;
    place-items: center;
    width: 28px;
    height: 100%;
    color: #caa8d6;
    border-right: 1px solid rgb(255 255 255 / 0.12);
    cursor: ew-resize;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .knob.is-dragging,
  .knob:hover {
    background: rgb(202 168 214 / 0.18);
  }
  input {
    flex: 1;
    min-width: 0;
    width: 100%;
    background: transparent;
    border: 0;
    color: #f1ecf4;
    font: inherit;
    padding: 0 8px;
    outline: 0;
    font-variant-numeric: tabular-nums;
  }
</style>
