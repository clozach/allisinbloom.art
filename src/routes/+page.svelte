<script>
  import { onMount } from 'svelte';
  import Poem from '$lib/components/Poem.svelte';
  import { getRandomPoem } from '$lib/poemUtils';
  
  // Get the initial random poem from the page data
  export let data;
  
  // Store the current poem in a reactive variable
  let currentPoem = data.randomPoem && data.randomPoem.content ? data.randomPoem : {
    title: "opening in sight",
    content: "there’s but one tale unwending\nyours and mine the merest part\nno one knows the ending\nnone can know the start"
  };
  
  /**
   * Load a new random poem when the signature is clicked
   */
  function loadNewRandomPoem() {
    // Get a new random poem without page reload
    const newPoem = getRandomPoem();
    if (newPoem && newPoem.content) {
      // Only update if we got a valid poem
      currentPoem = newPoem;
    }
  }
</script>

<!-- Main content area with random poem -->
<div class="poem-container">
  {#key currentPoem.title}
    <Poem poem={currentPoem} />
  {/key}
</div>

<!-- Artist signature click handler added to the layout's signature -->
<svelte:document on:click={(e) => {
  // Check if the click was on the artist signature or its child elements
  const signature = document.querySelector('.artist-signature');
  const target = e.target;
  if (signature && target instanceof Node && (target === signature || signature.contains(target))) {
    loadNewRandomPoem();
  }
}} />

<style>
  /* Poem container with responsive margins */
  .poem-container {
    width: 100%;
    max-width: 800px;
    padding: 0 20px;
    box-sizing: border-box;
    cursor: default;
    margin: 0 auto;
  }
</style>
