<script>
  // Easter-egg control panel for BloomShader (summoned with ` on a poem
  // page). Ships to production as its own lazy chunk. Nesting: the
  // "shader" toggle reveals this poem's knobs; "animate" (off by default)
  // reveals the motion-only knobs beneath it.
  const PARAMS = [
    { key: 'speed', label: 'time multiplier', min: 0, max: 60, step: 0.5, motion: true },
    { key: 'doubling', label: 'seconds per doubling', min: 10, max: 300, step: 1, motion: true },
    { key: 'phase', label: 'moment in the loop', min: 0, max: 1, step: 0.001 },
    { key: 'zoom', label: 'overall scale', min: 0.5, max: 4, step: 0.05 },
    { key: 'unfold', label: 'outward drift per layer age', min: 0, max: 1, step: 0.01 },
    { key: 'churn', label: 'morph orbit radius', min: 0, max: 0.5, step: 0.01 },
    { key: 'lw1', label: 'lace width A', min: 0.005, max: 0.15, step: 0.005 },
    { key: 'lw2', label: 'lace width B', min: 0.005, max: 0.15, step: 0.005 },
    { key: 'lv1', label: 'lace level A', min: 0.2, max: 0.8, step: 0.01 },
    { key: 'lv2', label: 'lace level B', min: 0.2, max: 0.9, step: 0.01 },
    { key: 'inkGain', label: 'lace density', min: 0.5, max: 4, step: 0.05 },
    { key: 'inkFloor', label: 'lace floor outside annulus', min: 0, max: 1, step: 0.05 },
    { key: 'annA', label: 'bloom annulus inner', min: 0.05, max: 0.6, step: 0.01 },
    { key: 'annB', label: 'bloom annulus outer', min: 0.3, max: 1.5, step: 0.05 },
    { key: 'originX', label: 'origin x', min: 0, max: 1, step: 0.01 },
    { key: 'originY', label: 'origin y', min: 0, max: 1, step: 0.01 },
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
  /** @type {(part: 'still' | 'motion') => void} */
  export let roll;

  $: visibleParams = PARAMS.filter((p) => !p.motion || prefs.animate);
  /** @type {() => void} */
  export let onClose = () => {};

  let copied = false;

  async function copyTune() {
    const lines = Object.entries(tune)
      .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`)
      .join('\n');
    await navigator.clipboard.writeText(`{\n${lines}\n}`);
    copied = true;
    setTimeout(() => (copied = false), 1200);
  }
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
        <button class="dice" type="button" aria-label="Reroll this poem's blot" title="reroll the blot" on:click={() => roll('still')}>🎲</button>
      {/if}
    </span>
    <code>{prefs.shaderOn ? 'on' : 'off'}</code>
  </div>
  {#if prefs.shaderOn}
    <div class="row nested">
      <label class="cell"><span>animate</span><input type="checkbox" bind:checked={prefs.animate} on:change={onPrefs} /></label>
      <span class="dice-cell">
        <button class="dice" type="button" aria-label="Reroll this poem's motion" title="reroll the motion" on:click={() => roll('motion')}>🎲</button>
      </span>
      <code>{prefs.animate ? 'on' : 'off'}</code>
    </div>
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
    {#each visibleParams as p (p.key)}
      <label class="row" class:nested={p.motion}>
        <span>{p.label}</span>
        <input
          type="range"
          min={p.min}
          max={p.max}
          step={p.step}
          bind:value={tune[p.key]}
          on:input={onTweak}
        />
        <code>{tune[p.key]}</code>
      </label>
    {/each}
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
    <div class="note">🎲 rerolls into this poem's edits; revert returns to the blot it was born with.</div>
    <div class="note">generated palettes clear 4.5:1 against the ink — the pickers can't promise that; recheck before keeping a hand-picked color</div>
  {/if}
  <div class="tuner-actions">
    <button on:click={copyTune}>{copied ? 'copied!' : 'copy values'}</button>
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
    align-items: baseline;
    gap: 8px;
    margin-bottom: 6px;
  }
  .tuner-head .hud {
    color: #9d8fa6;
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
  .row input[type='range'] {
    width: 110px;
    accent-color: #caa8d6;
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
