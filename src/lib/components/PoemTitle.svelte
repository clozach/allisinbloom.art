<script>
  /**
   * @typedef {Object} PoemTitleProps
   * @property {string} title - The title of the poem
   */
</script>

<h2 class="poem-title"><slot></slot></h2>

<style>
  .poem-title {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    font-weight: normal;
    color: #333;
  }
  
  @media (min-width: 768px) {
    .poem-title {
      font-size: 1.8rem;
    }
  }
</style>
