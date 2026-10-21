<script>
  // This poem has a route of its own for one reason: a style Svelte scopes to it.
  // Its words, source panel and editing are the generic draft page, unchanged.
  import DraftPage from '../[slug]/+page.svelte';
  export let data;
</script>

<div class="all-i-know"><DraftPage {data} /></div>

<style>
  /* Al's target layout (2026-10-21): the three lines 2.8 line-heights apart and
     the byline a long breath below them. Everywhere else the poem body runs at
     1.8 and the byline sits 3rem under the words. */
  .all-i-know :global(.verse) { line-height: 2.8; }
  .all-i-know :global(.author) { padding-top: 8rem; }
</style>
