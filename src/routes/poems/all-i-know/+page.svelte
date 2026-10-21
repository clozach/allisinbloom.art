<script>
  // This poem has a route of its own for one reason: a style Svelte scopes to it.
  // Its words, source panel and editing are the generic draft page, unchanged.
  import DraftPage from '../[slug]/+page.svelte';
  export let data;
</script>

<div class="all-i-know"><DraftPage {data} /></div>

<style>
  /* Notion shows these three lines as three paragraph blocks: 24px of text,
     6px of block padding and 1px of margin at 16px, a pitch of about two
     lines. The site's poem body runs at 1.8; this poem keeps Notion's rhythm. */
  .all-i-know :global(.verse) { line-height: 2; }
</style>
