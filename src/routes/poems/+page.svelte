<script>
  // This would typically fetch from an API or import data
  // For now, we'll hardcode the poems list
  const poems = [
    {
      title: 'Morning Dew',
      path: '/poems/morning-dew',
      date: '2025-07-09',
      description: 'A poem about the quiet beauty of dawn'
    },
    {
      title: 'Whispers of Autumn',
      path: '/poems/whispers-of-autumn',
      date: '2025-07-08',
      description: 'A reflection on the changing seasons'
    },
    {
      title: 'Ocean Memories',
      path: '/poems/ocean-memories',
      date: '2025-07-07',
      description: 'Reflections on the sea and time'
    }
  ];
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
        <p class="description">{poem.description}</p>
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
  
  .description {
    margin: 0;
    color: #555;
  }
</style>
