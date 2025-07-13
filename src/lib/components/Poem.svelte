<script>
  import { fade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import Author from './Author.svelte';
  import PoemTitle from './PoemTitle.svelte';
  import PoemContent from './PoemContent.svelte';
  
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
  <PoemTitle>{poem.title}</PoemTitle>
  <Author>allisin bloom</Author>
  <PoemContent>
    {@html poem.content}
  </PoemContent>
</div>

<style>
  .poem {
    margin: 0 auto;
    text-align: center;
  }
  
  @media (min-width: 768px) {
    .poem {
      margin-left: 20%;
      text-align: left;
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
