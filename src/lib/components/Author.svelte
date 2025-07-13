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
    font-weight: 300;
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
    color: #555;
  }
  
  @media (min-width: 768px) {
    .author {
      font-size: 1rem;
    }
  }
</style>
