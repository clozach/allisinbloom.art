<script>
  import Poem from '$lib/components/Poem.svelte';
  
  /** @type {import('./$types').PageData} */
  export let data;
  
  $: poem = data.poem;
</script>

<div class="poem-container">
  {#if poem}
    <Poem title={poem.title}>
      {@html poem.content}
    </Poem>
  {:else}
    <p>Loading poem...</p>
  {/if}
</div>

<style>
  .poem-container {
    width: 100%;
    max-width: 800px;
    padding: 0 20px;
    box-sizing: border-box;
    margin: 0 auto;
  }
</style>
