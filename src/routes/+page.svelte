<script>
  import { onMount } from 'svelte';
  
  /** @type {import('./$types').PageData} */
  export let data;
  
  let featuredPoems = data.featuredPoems;
  let randomQuote = '';
  const quotes = data.quotes;
  
  onMount(() => {
    randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  });
</script>

<div class="home">
  <section class="hero">
    <h1>Allisin Bloom</h1>
    <p class="tagline">A collection of poems and prose that celebrate the beauty in everyday moments</p>
  </section>
  
  <section class="quote">
    <blockquote>
      {randomQuote}
    </blockquote>
  </section>
  
  <section class="featured">
    <h2>Featured Poems</h2>
    <div class="poem-grid">
      {#each featuredPoems as poem}
        <a href={poem.path} class="poem-card">
          <h3>{poem.title}</h3>
        </a>
      {/each}
    </div>
  </section>
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }
  
  .hero {
    text-align: center;
    margin-bottom: 1rem;
  }
  
  .hero h1 {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }
  
  .tagline {
    font-size: 1.2rem;
    color: #555;
    max-width: 600px;
    margin: 0 auto;
  }
  
  .quote {
    padding: 2rem;
    background-color: #f0f0f0;
    border-radius: 8px;
    font-style: italic;
    text-align: center;
  }
  
  blockquote {
    margin: 0;
    font-size: 1.2rem;
    color: #444;
  }
  
  .featured h2 {
    margin-bottom: 1.5rem;
    text-align: center;
  }
  
  .poem-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .poem-card {
    padding: 1.5rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .poem-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  
  .poem-card h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #333;
  }
</style>
