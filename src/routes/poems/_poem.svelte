<script>
  import Poem from '$lib/components/Poem.svelte';
  // front-matter fields are passed in automatically by mdsvex
  export let title = '';
  /** per-poem type scale (front-matter `scale: 0.85` for long-lined poems) */
  export let scale = 1;
</script>

<div class="poem-container" style="--poem-scale: {scale}">
  <Poem {title}>
    <slot />
  </Poem>
</div>

<style>
  .poem-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1.25rem;
    box-sizing: border-box;
    /* Site-wide poem type size, in one place (Al, 2026-08-22): 0.7em of body
       (13.44px) on phones so long lines don't wrap, the body's full 1.2rem
       (19.2px) from 568px up. Per-poem adjustments go through front-matter
       `scale`. */
    font-size: calc(0.7em * var(--poem-scale, 1));
  }
  @media (min-width: 568px) {
    .poem-container {
      font-size: calc(1em * var(--poem-scale, 1));
    }
  }
</style>
