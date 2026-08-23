<script>
  // Easter-egg control panel for BloomShader (summoned with ` on a poem
  // page). Ships to production as its own lazy chunk. Nesting: the
  // "shader" toggle reveals this poem's knobs; "animate" (off by default)
  // reveals the motion-only knobs beneath it. Fields follow the vault's
  // propsheet contract (label above; drag the icon to scrub, click to type).
  import { onMount } from 'svelte';
  import NumberField from './NumberField.svelte';

  // step = per-px scrub step and ↑/↓ nudge; decimals follow from it
  const PARAMS = [
    { key: 'speed', label: 'time multiplier', unit: '×', icon: 'speed', min: 0, max: 60, step: 0.05, motion: true },
    { key: 'doubling', label: 'seconds per doubling', unit: 's', icon: 'duration', min: 10, max: 300, step: 1, motion: true },
    { key: 'phase', label: 'moment in the loop', unit: '', icon: 'duration', min: 0, max: 1, step: 0.001 },
    { key: 'zoom', label: 'overall scale', unit: '×', icon: 'scale', min: 0.5, max: 4, step: 0.01 },
    { key: 'unfold', label: 'outward drift per layer age', unit: '', icon: 'ratio', min: 0, max: 1, step: 0.005 },
    { key: 'churn', label: 'morph orbit radius', unit: '', icon: 'ratio', min: 0, max: 0.5, step: 0.002 },
    { key: 'lw1', label: 'lace width A', unit: '', icon: 'distance', min: 0.005, max: 0.15, step: 0.001 },
    { key: 'lw2', label: 'lace width B', unit: '', icon: 'distance', min: 0.005, max: 0.15, step: 0.001 },
    { key: 'lv1', label: 'lace level A', unit: '', icon: 'height', min: 0.2, max: 0.8, step: 0.002 },
    { key: 'lv2', label: 'lace level B', unit: '', icon: 'height', min: 0.2, max: 0.9, step: 0.002 },
    { key: 'inkGain', label: 'lace density', unit: '', icon: 'ratio', min: 0.5, max: 4, step: 0.01 },
    { key: 'inkFloor', label: 'lace floor outside annulus', unit: '', icon: 'ratio', min: 0, max: 1, step: 0.005 },
    { key: 'annA', label: 'bloom annulus inner', unit: '', icon: 'distance', min: 0.05, max: 0.6, step: 0.002 },
    { key: 'annB', label: 'bloom annulus outer', unit: '', icon: 'distance', min: 0.3, max: 1.5, step: 0.005 },
    { key: 'core', label: 'core glow', unit: '', icon: 'ratio', min: 0.5, max: 5, step: 0.01 },
    { key: 'originX', label: 'origin x', unit: '', icon: 'position', min: 0, max: 1, step: 0.002 },
    { key: 'originY', label: 'origin y', unit: '', icon: 'position', min: 0, max: 1, step: 0.002 },
  ];

  // palette gradient endpoints, picker pairs (A -> B)
  const COLOR_GROUPS = [
    {
      title: 'light palette',
      rows: [
        { label: 'ground A → B', a: 'lightGroundA', b: 'lightGroundB' },
        { label: 'lace A → B', a: 'lightLaceA', b: 'lightLaceB' },
      ],
    },
    {
      title: 'dark palette',
      rows: [
        { label: 'ground A → B', a: 'darkGroundA', b: 'darkGroundB' },
        { label: 'lace A → B', a: 'darkLaceA', b: 'darkLaceB' },
      ],
    },
  ];

  /** @type {Record<string, any>} this poem's values (incl. its seed) */
  export let tune;
  /** @type {{ shaderOn: boolean, animate: boolean }} site-wide visibility */
  export let prefs;
  /** @type {string} */
  export let theme;
  export let hud = '';
  export let onTweak;
  export let onPrefs;
  export let applyTheme;
  export let revert;
  /** @type {() => void} */
  export let roll;
  /** @type {(text: string) => boolean} */
  export let paste;
  /** @type {() => void} */
  export let onClose = () => {};

  $: visibleParams = PARAMS.filter((p) => !p.motion || prefs.animate);

  let flash = '';
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let flashTimer;
  /** @param {string} msg */
  function say(msg) {
    flash = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flash = ''), 1400);
  }

  // copy emits JSON so the same text pastes back (here, or in a friend's
  // browser with the panel open) and becomes that page's values
  async function copyTune() {
    const text = JSON.stringify(tune, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      say('copied!');
    } catch {
      say('');
    }
  }

  // paste anywhere while the panel is open (not into a text field) applies
  // a copied set — the MVP sharing path, kept working whatever else ships
  onMount(() => {
    /** @param {ClipboardEvent} e */
    const onPaste = (e) => {
      const t = /** @type {HTMLElement | null} */ (e.target);
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
      const text = e.clipboardData?.getData('text') || '';
      if (!text.trim().startsWith('{')) return;
      e.preventDefault();
      say(paste(text) ? 'pasted!' : 'not a bloom set');
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });
</script>

<div class="tuner">
  <div class="tuner-head">
    <strong>bloom tuner</strong>
    <span class="hud">{hud}</span>
    <span class="head-right">
      <span class="hint">` to close</span>
      <button class="close" type="button" aria-label="Close bloom tuner" on:click={onClose}>✕</button>
    </span>
  </div>
  <div class="row">
    <label class="cell"><span>shader</span><input type="checkbox" bind:checked={prefs.shaderOn} on:change={onPrefs} /></label>
    <span class="dice-cell">
      {#if prefs.shaderOn}
        <button class="dice" type="button" aria-label="Reroll this poem" title="a new blot for this poem" on:click={roll}>🎲</button>
      {/if}
    </span>
    <code>{prefs.shaderOn ? 'on' : 'off'}</code>
  </div>
  {#if prefs.shaderOn}
    <label class="row nested">
      <span>animate</span>
      <input type="checkbox" bind:checked={prefs.animate} on:change={onPrefs} />
      <code>{prefs.animate ? 'on' : 'off'}</code>
    </label>
  {/if}
  <label class="row">
    <span>theme</span>
    <select bind:value={theme} on:change={applyTheme}>
      <option value="auto">auto</option>
      <option value="light">light</option>
      <option value="dark">dark</option>
    </select>
  </label>
  {#if prefs.shaderOn}
    <div class="group">this poem · seed {tune.seed}</div>
    <div class="fields">
      {#each visibleParams as p (p.key)}
        <NumberField
          label={p.label}
          unit={p.unit}
          icon={p.icon}
          min={p.min}
          max={p.max}
          step={p.step}
          bind:value={tune[p.key]}
          onChange={onTweak}
        />
      {/each}
    </div>
    {#each COLOR_GROUPS as g (g.title)}
      <div class="group">{g.title}</div>
      {#each g.rows as row (row.a)}
        <div class="row colors">
          <span>{row.label}</span>
          <input type="color" bind:value={tune[row.a]} on:input={onTweak} />
          <input type="color" bind:value={tune[row.b]} on:input={onTweak} />
        </div>
      {/each}
    {/each}
    <div class="note">drag an icon to scrub, click a number to type. 🎲 rolls a new blot; revert returns to the one this poem was born with. paste a copied set (⌘V with the panel open) to take it on.</div>
    <div class="note">generated palettes clear 4.5:1 against the ink — the pickers can't promise that; recheck before keeping a hand-picked color</div>
  {/if}
  <div class="tuner-actions">
    <button on:click={copyTune}>{flash || 'copy values'}</button>
    <button on:click={revert}>revert</button>
  </div>
</div>

<style>
  .tuner {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 100;
    width: 320px;
    /* grow to the viewport before asking for a scroll */
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    background: rgb(20 16 20 / 0.92);
    color: #e8e2ea;
    font: 11px/1.5 monospace;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgb(255 255 255 / 0.15);
  }
  .tuner-head {
    display: flex;
    /* tight hosts (Safari text zoom) wrap whole tokens to a second line —
       never mid-word; the hud is width-padded so 99→100s can't reflow */
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 6px;
  }
  .tuner-head strong,
  .tuner-head .hud,
  .tuner-head .hint {
    white-space: nowrap;
  }
  .tuner-head .hud {
    color: #9d8fa6;
    font-variant-numeric: tabular-nums;
  }
  .tuner-head .head-right {
    margin-left: auto;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .tuner-head .hint {
    color: #776a80;
  }
  @media (pointer: coarse) {
    .tuner-head .hint {
      display: none; /* no ` key on a phone; the ✕ is the way out */
    }
  }
  .tuner-head .close {
    background: none;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 4px;
    color: inherit;
    font: inherit;
    line-height: 1;
    padding: 4px 7px;
    min-width: 28px;
    min-height: 28px;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 110px 44px;
    align-items: center;
    gap: 6px;
    margin: 2px 0;
  }
  .row .cell {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .dice-cell {
    justify-self: start;
  }
  .dice {
    background: none;
    border: 0;
    padding: 0 2px;
    font: inherit;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
  }
  .dice:focus-visible {
    outline: 2px solid #caa8d6;
    border-radius: 4px;
  }
  .row.nested {
    margin-left: 12px;
    padding-left: 8px;
    border-left: 1px solid rgb(255 255 255 / 0.15);
  }
  .row span {
    /* labels wrap rather than truncate — every string stays readable */
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 8px;
    margin: 4px 0;
  }
  .row input[type='checkbox'] {
    justify-self: start;
    accent-color: #caa8d6;
  }
  .row code {
    text-align: right;
    color: #caa8d6;
  }
  .row select {
    grid-column: 2 / 4;
    background: #2b2326;
    color: inherit;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 4px;
    font: inherit;
  }
  .group {
    margin: 8px 0 2px;
    color: #9d8fa6;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .row.colors {
    grid-template-columns: 1fr 52px 52px;
  }
  .row.colors input[type='color'] {
    width: 52px;
    height: 22px;
    padding: 0;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 4px;
    background: none;
  }
  .note {
    margin-top: 6px;
    color: #776a80;
  }
  .tuner-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .tuner-actions button {
    flex: 1;
    background: #3a2f3d;
    color: inherit;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 4px;
    padding: 4px 0;
    font: inherit;
  }
</style>
