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
    text-align: left;
  }

  /* Links inside {@html} content are not scoped; style them via :global */
  .poem :global(a) {
    text-decoration: none;
    color: inherit;
  }
  .poem :global(a::after) {
    content: 'º';
    color: #caa8d6;
    margin-left: 0.15em;
    font-size: .7em;
    vertical-align:super;
  }
  .poem :global(a:hover),
  .poem :global(a:hover::after) {
    color: #caa8d6;
  }
  .poem :global(a:active),
  .poem :global(a:focus),
  .poem :global(a:active::after),
  .poem :global(a:focus::after) {
    color: #b077c5;
  }
</style>
