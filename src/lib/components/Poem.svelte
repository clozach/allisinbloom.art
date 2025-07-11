<script>
  import { fade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  /**
   * @typedef {Object} PoemProps
   * @property {string} title - The title of the poem
   * @property {string} content - The content of the poem
   */

  /** @type {PoemProps} */
  export let poem;
  
  // Track when the poem changes to trigger the transition
  let poemKey = poem.title;
  $: if (poem.title !== poemKey) {
    poemKey = poem.title;
  }
</script>

<div class="poem" transition:fade={{duration: 400, easing: quintOut}}>
  <h2 class="poem-title">{poem.title}</h2>
  <div class="poem-content">
    {@html poem.content}
  </div>
</div>

<style>
  .poem {
    margin: 0 auto;
    text-align: center;
  }
  
  .poem-title {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    font-weight: normal;
    color: #333;
  }
  
  .poem-content {
    font-size: 1.2rem;
    line-height: 1.8;
    color: #444;
  }
  
  @media (min-width: 768px) {
    .poem {
      margin-left: 20%;
      text-align: left;
    }
    
    .poem-title {
      font-size: 1.8rem;
    }
    
    .poem-content {
      font-size: 1.4rem;
    }
  }
  
  @media (min-width: 1024px) {
    .poem {
      margin-left: 30%;
    }
  }
  
  @media (min-width: 1400px) {
    .poem {
      margin-left: 40%;
    }
  }
</style>
