<script>
  /**
   * @typedef {Object} PoemTitleProps
   * @property {string} title - The title of the poem
   */
</script>

<h2 class="poem-title"><slot></slot></h2>

<style>
  .poem-title {
    margin-bottom: 1.5rem;
    font-weight: normal;
    color: #333;
  }
</style>
