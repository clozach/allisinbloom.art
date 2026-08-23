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
    /* Site-wide poem type size, in one place. 0.7em of body (19.2px → 13.44px)
       is what shipped 2026-08-22 — it began life as a leaked per-poem
       :global() rule; made explicit here so the number is a decision, not an
       accident. Per-poem adjustments go through front-matter `scale`. */
    font-size: calc(0.7em * var(--poem-scale, 1));
  }
</style>
