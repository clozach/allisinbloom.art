<script>
  /**
   * @typedef {Object} PoemTitleProps
   * @property {string} title - The title of the poem
   */
</script>

<div class="poem-title"><slot></slot></div>

<style>
  .poem-title {
    font-family: 'Noto Serif Display', serif;
    font-stretch: semi-condensed;
    font-weight: bold;
    color: #333;
  }
</style>
