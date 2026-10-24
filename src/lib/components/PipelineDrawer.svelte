<script>
  import { onMount } from 'svelte';
  import { movableMenu, dismissMenuEvent } from '$lib/movableMenu';
  import PipelineCard from './PipelineCard.svelte';
  let open = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let hold;
  onMount(() => {
    /** @param {KeyboardEvent} event */
    const handler = (event) => {
      const target = /** @type {HTMLElement | null} */ (event.target);
      if (event.key === 'Escape' && open) { dismissMenuEvent(event, () => open = false); return; }
      if (event.key !== '`' || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '')) return;
      event.preventDefault();
      open = !open;
    };
    /** @param {PointerEvent} event */
    const outside = (event) => {
      if (!open) return;
      const inside = event.composedPath().some((node) => node instanceof Element && node.matches('.pipeline-dashboard, .pipeline-entry'));
      dismissMenuEvent(event, () => open = false, inside);
    };
    window.addEventListener('pointerdown', outside, true);
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', handler); clearTimeout(hold); };
  });
  function cancelHold() { clearTimeout(hold); }
</script>

<button class="pipeline-entry" aria-label="Open publishing dashboard" on:pointerdown={() => { hold = setTimeout(() => { open = !open; }, 600); }} on:pointerup={cancelHold} on:pointercancel={cancelHold} on:pointerleave={cancelHold} on:contextmenu|preventDefault on:click={(event) => { if (event.detail === 0) open = !open; }}></button>
{#if open}
  <aside class="pipeline-dashboard" aria-label="Publishing dashboard" use:movableMenu={'publishing-dashboard'}>
    <div class="head"><button class="move" type="button" data-menu-move-handle>allisinbloom.art</button></div>
    <div class="dashboard-body"><PipelineCard /></div>
  </aside>
{/if}

<style>
  .pipeline-entry { position: fixed; left: 0; bottom: 0; width: 56px; height: 56px; border: 0; background: transparent; z-index: 50; touch-action: none; }
  .pipeline-entry:focus-visible { outline: 2px solid var(--accent-strong); outline-offset: -4px; }
  .pipeline-dashboard { position: fixed; bottom: 12px; right: 12px; z-index: 100; box-sizing: border-box; width: min(330px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); display: flex; flex-direction: column; overflow: hidden; padding: 12px; background: #201a25; color: #e8e2ea; border: 1px solid #65566c; border-radius: 8px; font: 12px/1.5 system-ui, sans-serif; }
  .dashboard-body { min-height: 0; overflow-y: auto; }
  .head { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
  .head .move { background: none; color: inherit; border: 0; padding: 0; font: inherit; font-weight: bold; text-align: left; }
  .head .move:focus-visible { outline: 2px solid #caa8d6; outline-offset: 3px; border-radius: 2px; }
</style>
