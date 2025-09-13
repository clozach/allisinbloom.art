<script>
  import Poem from '$lib/components/Poem.svelte';
  // front-matter `title` is passed in automatically by mdsvex
  export let title = '';
</script>

<div class="poem-container">
  <Poem {title}>
    <slot />
  </Poem>
</div>

<style>
  .poem-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }
</style>
