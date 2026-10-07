<script>
  import { onMount } from 'svelte';
  import PipelineCard from './PipelineCard.svelte';
  let open = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let hold;
  onMount(() => {
    /** @param {KeyboardEvent} event */
    const handler = (event) => {
      const target = /** @type {HTMLElement | null} */ (event.target);
      if (event.key === 'Escape') open = false;
      if (event.key !== '`' || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '')) return;
      event.preventDefault();
      open = !open;
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); clearTimeout(hold); };
  });
  function cancelHold() { clearTimeout(hold); }
</script>

<button class="pipeline-entry" aria-label="Open publishing dashboard" on:pointerdown={() => { hold = setTimeout(() => { open = !open; }, 600); }} on:pointerup={cancelHold} on:pointercancel={cancelHold} on:pointerleave={cancelHold} on:contextmenu|preventDefault on:click={(event) => { if (event.detail === 0) open = !open; }}></button>
{#if open}
  <aside class="pipeline-dashboard" aria-label="Publishing dashboard">
    <div class="head"><strong>allisinbloom.art</strong><button aria-label="Close publishing dashboard" on:click={() => open = false}>✕</button></div>
    <PipelineCard />
  </aside>
{/if}

<style>
  .pipeline-entry { position: fixed; left: 0; bottom: 0; width: 56px; height: 56px; border: 0; background: transparent; z-index: 50; touch-action: none; }
  .pipeline-entry:focus-visible { outline: 2px solid var(--accent-strong); outline-offset: -4px; }
  .pipeline-dashboard { position: fixed; bottom: 12px; right: 12px; z-index: 100; box-sizing: border-box; width: min(330px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); overflow-y: auto; padding: 12px; background: #201a25; color: #e8e2ea; border: 1px solid #65566c; border-radius: 8px; font: 12px/1.5 system-ui, sans-serif; }
  .head { display: flex; align-items: center; justify-content: space-between; }
  .head button { background: transparent; color: inherit; border: 1px solid #65566c; padding: 6px 10px; }
</style>
