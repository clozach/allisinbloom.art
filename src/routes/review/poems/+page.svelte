<script>export let data;</script>
<svelte:head><title>Poem review · Allisin Bloom</title><meta name="robots" content="noindex, nofollow" /></svelte:head>
<article class="review">
  <h1>Poem review</h1>
  <p>47 confirmed latest drafts · 3 matching sources to confirm · 5 unresolved matches.</p>
  <p>This private preview follows the selected Notion poem body: text, hard line breaks, blank lines, tabs and spaces. Code blocks retain literal punctuation in a monospace face; rich text retains emphasis. Notion’s page chrome, research notes and unrelated media are outside the poem body.</p>
  <p>Review the marked choices before a production release. Use the backtick key (<kbd>`</kbd>) for dev → staging → production.</p>
  <h2>Drafts ready for review</h2>
  <ol>
    {#each data.inventory.works as poem}
      <li>
        <a class="poem-link" href={poem.path}>{poem.title}</a>
        <p class="status">{poem.status === 'verified_latest_in_poems' ? 'Latest draft in Poems' : 'Latest version unconfirmed · standalone page'}</p>
        <div class="links"><a href={poem.sourceUrl} target="_blank" rel="noopener noreferrer">Notion source ↗</a>{#each poem.blueskyUrls as url}<a href={url} target="_blank" rel="noopener noreferrer">Posted poem ↗</a>{/each}</div>
        <details><summary>Source and layout details</summary>
          <p>Notion last edit: {poem.lastEdited}</p><p>{poem.sourceSelection}</p>
          {#if poem.translator}<p>By {poem.author}; translated by {poem.translator}.</p>{/if}
          {#each poem.reviewWarnings as warning}<p class="warning">{warning}</p>{/each}
          {#if poem.sourceAssets.length}<p class="warning">Source page has additional media or research. Open Notion to review that context; these assets are outside the selected poem body.</p>{/if}
        </details>
      </li>
    {/each}
  </ol>
  <h2>Latest Notion source still needed</h2>
  <ul>{#each data.inventory.unmatched as poem}<li><strong>{poem.posted_title_or_first_line}</strong><p>{poem.reason}</p><a href={poem.first_post_url} target="_blank" rel="noopener noreferrer">Bluesky evidence ↗</a></li>{/each}</ul>
  <details><summary>Coverage audit</summary>
    <p>{data.inventory.counts.authoredPosts} authored posts reviewed; {data.inventory.counts.excludedReposts} repost excluded. {data.inventory.counts.poetryPostingsOrCandidates} poetry postings or candidates represent {data.inventory.counts.distinctWorksOrCandidates} distinct works or candidates after repeats.</p>
    <p>Three orphaned thread posts could not be classified because their roots are unavailable. Their evidence remains in the local source manifest.</p>
    <p>Source collection: {data.inventory.generatedAt}</p>
  </details>
</article>
<style>
  .review { max-width: 850px; margin: auto; padding: 1rem 1.5rem 5rem; font: 16px/1.6 'Noto Sans', sans-serif; white-space: normal; }
  h1 { font-size: 2rem; } h2 { margin-top: 2.5rem; font-size: 1.4rem; }
  ol, ul { padding-left: 1.5rem; } li { padding: 1rem .2rem; border-bottom: 1px solid var(--hr); }
  p { margin: .5rem 0; } .poem-link { font-family: 'Noto Serif', serif; white-space: pre-line; } .status { font-size: .85rem; opacity: .8; }
  .links { display: flex; flex-wrap: wrap; gap: .5rem 1.2rem; font-size: .85rem; }
  details { margin-top: .5rem; font-size: .85rem; overflow-wrap: anywhere; } summary { cursor: pointer; }
  .warning { border-left: 2px solid var(--accent); padding-left: .8rem; } kbd { font-family: monospace; }
</style>
