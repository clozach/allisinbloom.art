<script>
  /**
   * @typedef {Object} PoemContentProps
   * @property {string} content - The HTML content of the poem
   */
</script>

<div class="poem-content">
  <slot></slot>
</div>

<style>
  .poem-content {
    line-height: 1.8;
    white-space: pre-line;
    padding-top: 1.2rem;
  }
  
  /* Format code blocks properly */
  .poem-content :global(pre),
  .poem-content :global(code) {
    font-family: 'Noto Serif', 'Georgia', serif;
    white-space: pre-wrap;
    background: none;
    padding: 0;
    margin: 0;
    font-size: inherit;
    line-height: inherit;
  }
</style>
