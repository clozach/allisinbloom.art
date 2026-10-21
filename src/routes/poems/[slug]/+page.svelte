<script>
  import PoemLayout from '../_poem.svelte';
  export let data;
</script>

<svelte:head><meta name="robots" content="noindex, nofollow" /></svelte:head>
<PoemLayout title={data.title} showTitle={data.showTitle} byline={data.translator ? 'translated by' : 'by'} scale={data.scale}>
  <div class="notion-poem" aria-label={data.title}>{@html data.html}</div>
</PoemLayout>

<style>
  /* Global on purpose: a saved edit stores the words' markup, wrapper included, with
     whatever scope class the build that saved it gave this component. Rules keyed to
     that hash would stop matching after any edit to this block. */
  :global(.notion-poem) { white-space: normal; }
  :global(.notion-poem .verse) { white-space: pre-wrap; tab-size: 8; margin: 0; }
  :global(.notion-poem .stanza) { margin: 0; }
  :global(.notion-poem .preformatted) { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; line-height: 1.5; white-space: pre; max-width: 100%; overflow-x: auto; padding-bottom: .25em; }
  :global(.notion-poem .title-verse) { font: inherit; }
  :global(.notion-poem .empty-line) { min-height: 1.8em; }
  :global(.notion-poem .indent) { margin-left: 2em; }
  :global(.notion-poem blockquote) { margin: 1em 0; padding-left: 1em; border-left: 1px solid var(--hr); }
  :global(.notion-poem hr) { margin: 1.8em 0; }
  :global(.notion-poem .columns) { display: flex; gap: 2em; }
  :global(.notion-poem .column) { flex: 1; min-width: 0; }
  :global(.notion-poem .callout) { padding: 1em; margin: 1em 0; border: 1px solid var(--hr); }
</style>
