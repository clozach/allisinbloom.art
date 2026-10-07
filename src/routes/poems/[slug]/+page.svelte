<script>
  import PoemLayout from '../_poem.svelte';
  export let data;
</script>

<svelte:head><meta name="robots" content="noindex, nofollow" /></svelte:head>
{#if data.status !== 'verified_latest_in_poems'}<aside class="review-notice">Latest version unconfirmed. <a href="#draft-source">Review the matched source ↓</a></aside>{/if}
<PoemLayout title={data.title} showTitle={data.showTitle} byline={data.translator ? 'translated by' : 'by'} scale={data.scale}>
  <div class="notion-poem" aria-label={data.title}>{@html data.html}</div>
</PoemLayout>
<details class="source" id="draft-source">
  <summary>Draft source{data.status !== 'verified_latest_in_poems' ? ' · latest version unconfirmed' : ''}</summary>
  {#if data.status !== 'verified_latest_in_poems'}<p class="warning">Matching standalone Notion page. Its latest-version status in Poems is unconfirmed.</p>{/if}
  {#each data.reviewWarnings as warning}<p class="warning">{warning}</p>{/each}
  <p>{data.sourceSelection}</p>
  {#if data.translator}<p>Poem by {data.author}; translated by {data.translator}.</p>{/if}
  <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">{data.status === 'verified_latest_in_poems' ? 'Latest Notion draft' : 'Matched Notion page'} ↗</a>
  <p>Last edited {data.lastEdited}</p>
  {#each data.blueskyUrls as url}<a href={url} target="_blank" rel="noopener noreferrer">Bluesky posting ↗</a>{/each}
<a href="/review/poems">All sources and unresolved matches →</a>
</details>

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
  .review-notice { margin: 0 auto 1rem; padding: .6rem 1rem; max-width: 760px; font: 12px/1.6 system-ui, sans-serif; white-space: normal; border-left: 2px solid var(--accent); }
  .source { margin: 2rem auto 0; padding: 0 1.25rem; max-width: 800px; font: 12px/1.8 system-ui, sans-serif; opacity: .75; white-space: normal; }
  .source a { display: block; }
  .warning { border-left: 2px solid var(--accent); padding-left: .8em; }
  .source p { margin: .5em 0; }
</style>
