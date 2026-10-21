<script>
  import PoemLayout from '../_poem.svelte';
  export let data;
</script>

<svelte:head><meta name="robots" content="noindex, nofollow" /></svelte:head>
<PoemLayout title={data.title} showTitle={data.showTitle} byline={data.translator ? 'translated by' : 'by'} scale={data.scale}>
  <div class="notion-poem" aria-label={data.title}>{@html data.html}</div>
</PoemLayout>

<style>
  .notion-poem { white-space: normal; }
  .notion-poem :global(.verse) { white-space: pre-wrap; tab-size: 8; margin: 0; }
  .notion-poem :global(.stanza) { margin: 0; }
  .notion-poem :global(.preformatted) { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; line-height: 1.5; white-space: pre; max-width: 100%; overflow-x: auto; padding-bottom: .25em; }
  .notion-poem :global(.title-verse) { font: inherit; }
  .notion-poem :global(.empty-line) { min-height: 1.8em; }
  .notion-poem :global(.indent) { margin-left: 2em; }
  .notion-poem :global(blockquote) { margin: 1em 0; padding-left: 1em; border-left: 1px solid var(--hr); }
  .notion-poem :global(hr) { margin: 1.8em 0; }
  .notion-poem :global(.columns) { display: flex; gap: 2em; }
  .notion-poem :global(.column) { flex: 1; min-width: 0; }
  .notion-poem :global(.callout) { padding: 1em; margin: 1em 0; border: 1px solid var(--hr); }
</style>
