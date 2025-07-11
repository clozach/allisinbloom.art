<script>
  /** @type {import('./$types').PageData} */
  export let data;
  
  const poems = data.poems;
</script>

<svelte:head>
  <title>Allisin Bloom | Poems</title>
</svelte:head>

<div class="poems-page">
  <h1>Poems</h1>
  
  <div class="poems-list">
    {#each poems as poem}
      <a href={poem.path} class="poem-item">
        <h2>{poem.title}</h2>
        <div class="poem-meta">
          <span class="date">{poem.date}</span>
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .poems-page {
    max-width: 800px;
    margin: 0 auto;
  }
  
  h1 {
    margin-bottom: 2rem;
    text-align: center;
  }
  
  .poems-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .poem-item {
    padding: 1.5rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
  }
  
  .poem-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  
  .poem-item h2 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  
  .poem-meta {
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    color: #666;
  }
  

</style>
