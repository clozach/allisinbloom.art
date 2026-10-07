<script>
  import PoemLayout from '../_poem.svelte';
  export let data;
</script>

<svelte:head><meta name="robots" content="noindex, nofollow" /></svelte:head>
<PoemLayout title={data.title} scale={data.scale}>
  <div class="notion-poem">{@html data.html}</div>
</PoemLayout>
<details class="source">
  <summary>Draft source</summary>
  <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">Latest Notion draft ↗</a>
  <p>Last edited {data.lastEdited}</p>
  {#each data.blueskyUrls as url}<a href={url} target="_blank" rel="noopener noreferrer">Bluesky posting ↗</a>{/each}
</details>

<style>
  .notion-poem { white-space: normal; }
  .notion-poem :global(.verse) { white-space: pre-wrap; tab-size: 8; margin: 0; }
  .notion-poem :global(.stanza) { margin: 0 0 1em; }
  .notion-poem :global(.empty-line) { min-height: 1.8em; }
  .notion-poem :global(.indent) { margin-left: 2em; }
  .notion-poem :global(blockquote) { margin: 1em 0; padding-left: 1em; border-left: 1px solid var(--hr); }
  .notion-poem :global(hr) { margin: 1.8em 0; }
  .notion-poem :global(.columns) { display: flex; gap: 2em; }
  .notion-poem :global(.column) { flex: 1; min-width: 0; }
  .notion-poem :global(.callout) { padding: 1em; margin: 1em 0; border: 1px solid var(--hr); }
  .source { margin: 2rem auto 0; padding: 0 1.25rem; max-width: 800px; font: 12px/1.8 system-ui, sans-serif; opacity: .75; white-space: normal; }
  .source a { display: block; }
  .source p { margin: .5em 0; }
</style>
