<script>
  /**
   * @typedef {Object} AuthorProps
   * @property {string} name - The author's name
   */
</script>

<span class="author">by <slot></slot></span>

<style>
  .author {
    display: block;
    font-family: 'Noto Sans', sans-serif;
    font-weight: 100;
    font-size: smaller;
    margin-bottom: 1.5rem;
    color: #555;
  }
</style>
