<script>
  import ByLine from './ByLine.svelte';
  import PoemTitle from './PoemTitle.svelte';
  import PoemContent from './PoemContent.svelte';

  /**
   * Title of the poem (from front-matter).
   * The poem body is provided via the default slot compiled by mdsvex.
   */
  export let title = '';
  export let showTitle = true;
  export let byline = 'by';
</script>

<div class="poem">
  {#if showTitle}<PoemTitle>{title}</PoemTitle>{/if}
  <PoemContent>
    <slot />
  </PoemContent>
  <ByLine label={byline} />
</div>

