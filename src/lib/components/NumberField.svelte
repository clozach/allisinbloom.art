<script>
  // Figma-style numeric field (vault propsheet contract, 2026-08-21): label
  // ABOVE the control; the control is [icon][value+unit]. Drag the icon to
  // scrub (right = up, `step` per px; the pointer wraps across the screen via
  // Pointer Lock where allowed, plain capture-drag otherwise). Click/Tab into
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

  // scrubbing
  /** @type {HTMLElement} */
  let knob;
  let dragging = false;
  let locked = false;
  let startVal = 0;
  let acc = 0;
  let lastX = 0;
  let cx = 0;
  let cy = 0;
  /** @type {HTMLDivElement | null} */
  let cursor = null;
  /** @param {MouseEvent} e */
  function onMove(e) {
    let dx;
    if (locked) {
      dx = e.movementX || 0;
      cx = (cx + dx + window.innerWidth) % window.innerWidth; // wrap across the screen
      cy = Math.min(window.innerHeight - 1, Math.max(0, cy + (e.movementY || 0)));
      if (cursor) {
        cursor.style.left = `${cx}px`;
        cursor.style.top = `${cy}px`;
      }
    } else {
      dx = e.clientX - lastX;
      lastX = e.clientX;
    }
    acc += dx * step;
    commit(startVal + acc);
  }
  function onLockChange() {
    locked = document.pointerLockElement === knob;
    if (locked && !cursor) {
      cursor = document.createElement('div');
      cursor.innerHTML = ICONS.drag;
      cursor.style.cssText = `position:fixed;z-index:1000;pointer-events:none;transform:translate(-50%,-50%);color:#fff;filter:drop-shadow(0 0 2px #000);left:${cx}px;top:${cy}px`;
      document.body.append(cursor);
    }
  }
  function endDrag() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('pointerlockchange', onLockChange);
    if (document.pointerLockElement === knob) document.exitPointerLock?.();
    locked = false;
    cursor?.remove();
    cursor = null;
    dragging = false;
  }
  /** @param {MouseEvent} e */
  function startDrag(e) {
    e.preventDefault();
    startVal = value;
    acc = 0;
    lastX = cx = e.clientX;
    cy = e.clientY;
    dragging = true;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('pointerlockchange', onLockChange);
    try {
      /** @type {any} */
      const r = knob.requestPointerLock?.();
      r?.catch?.(() => {}); // sandboxed host: plain drag
    } catch {
      /* plain drag */
    }
  }
  // touch: a plain capture-drag (no pointer lock on touch screens)
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
      bind:this={knob}
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
