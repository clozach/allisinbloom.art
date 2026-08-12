<script>
  // Easter-egg control panel for BloomShader (summoned with ` on a poem
  // page). Ships to production as its own lazy chunk; the shader itself
  // stays off unless the "shader" toggle below turns it on.
  const PARAMS = [
    { key: 'speed', label: 'time multiplier', min: 0, max: 60, step: 0.5 },
    { key: 'doubling', label: 'seconds per doubling', min: 10, max: 300, step: 1 },
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

  /** @type {Record<string, any>} */
  export let tune;
  /** @type {string} */
  export let theme;
  export let hud = '';
  export let onTweak;
  export let applyTheme;
  export let resetTune;

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
    <span class="hint">` to close</span>
  </div>
  <label class="row">
    <span>shader</span>
    <input type="checkbox" bind:checked={tune.shaderOn} on:change={onTweak} />
    <code>{tune.shaderOn ? 'on' : 'off'}</code>
  </label>
  <label class="row">
    <span>theme</span>
    <select bind:value={theme} on:change={applyTheme}>
      <option value="auto">auto</option>
      <option value="light">light</option>
      <option value="dark">dark</option>
    </select>
  </label>
  {#each PARAMS as p (p.key)}
    <label class="row">
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
  <div class="note">defaults sit inside the a11y contrast bands — recheck before baking in</div>
  <div class="tuner-actions">
    <button on:click={copyTune}>{copied ? 'copied!' : 'copy values'}</button>
    <button on:click={resetTune}>reset</button>
  </div>
</div>

<style>
  .tuner {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 100;
    width: 320px;
    max-height: 80vh;
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
  .tuner-head .hint {
    margin-left: auto;
    color: #776a80;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 110px 44px;
    align-items: center;
    gap: 6px;
    margin: 2px 0;
  }
  .row span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
