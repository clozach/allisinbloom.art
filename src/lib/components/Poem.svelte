<script>
  import Author from './Author.svelte';
  import PoemTitle from './PoemTitle.svelte';
  import PoemContent from './PoemContent.svelte';

  /**
   * Title of the poem (from front-matter).
   * The poem body is provided via the default slot compiled by mdsvex.
   */
  export let title = '';
</script>

<div class="poem">
  <PoemTitle>{title}</PoemTitle>
  <Author>allisin bloom</Author>
  <PoemContent>
    <slot />
  </PoemContent>
</div>

<style>
  .poem {
    margin: 0 auto;
    text-align: left;
  }

  /* Links inside {@html} content are not scoped; style them via :global */
  .poem :global(a) {
    text-decoration: none;
    color: inherit;
  }
  .poem :global(a::after) {
    content: 'º';
    color: #caa8d6;
    margin-left: 0.15em;
    font-size: .7em;
    vertical-align:super;
  }
  .poem :global(a:hover),
  .poem :global(a:hover::after) {
    color: #caa8d6;
  }
  .poem :global(a:active),
  .poem :global(a:focus),
  .poem :global(a:active::after),
  .poem :global(a:focus::after) {
    color: #b077c5;
  }
</style>
