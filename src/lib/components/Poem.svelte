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
  <Author />
  <PoemContent>
    <slot />
  </PoemContent>
</div>

