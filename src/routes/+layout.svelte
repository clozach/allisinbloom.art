<script>
  import { page } from '$app/stores';
  
  // Check if we're on the home page
  $: isHomePage = $page.url.pathname === '/';
</script>

<svelte:head>
  <title>Allisin Bloom | {$page.data.title || 'A Collection of Poems and Prose'}</title>
  <meta name="description" content="A collection of poems and prose, built with mdsvex and notion." />
</svelte:head>

<div class="app">
  {#if !isHomePage}
  <header>
    <div class="header-content">
      <h1><a href="/">Allisin Bloom</a></h1>
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/poems">Poems</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    </div>
  </header>
  {/if}

  <main class={isHomePage ? 'home-main' : ''}>
    <slot />
  </main>
  
  <!-- Bottom bar with artist signature aligned to the right -->
  <div class="bottom-bar">
    <div class="artist-signature">
      <img src="/artist-sig.png" alt="Artist Signature" />
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    line-height: 1.6;
    color: #333;
    background-color: #f9f9f9;
  }
  
  /* Global rule for clickable elements */
  :global(button),
  :global(input[type="submit"]),
  :global(input[type="button"]),
  :global(input[type="reset"]),
  :global(.clickable),
  :global([role="button"]) {
    cursor: pointer;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  header {
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    margin: 0;
    font-size: 1.8rem;
  }

  h1 a {
    text-decoration: none;
    color: #333;
    cursor: pointer;
  }

  nav ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 1.5rem;
  }

  nav a {
    text-decoration: none;
    color: #555;
    font-size: 1rem;
    cursor: pointer;
  }

  nav a:hover {
    color: #000;
    text-decoration: underline;
  }

  main {
    flex: 1;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  
  /* Home page specific main styling */
  .home-main {
    max-width: none;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 5rem;
    min-height: calc(100vh - 60px); /* Account for bottom bar */
  }

  /* Bottom Bar with Signature */
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #eeebe2; /* Cream background color */
    z-index: 100;
    box-shadow: 0px -4px 10px rgba(0, 0, 0, 0.1); /* Drop shadow above the bar */
    height: 60px;
    display: flex;
    align-items: center;
  }
  
  /* Artist Signature - aligned to the far right */
  .artist-signature {
    margin-left: auto; /* Push to the right */
    padding: 10px 20px;
    cursor: pointer; /* Show pointing hand when hovering */
  }
  
  .artist-signature img {
    width: 220px;
    height: auto;
    object-fit: contain;
    display: block;
  }
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    .artist-signature img {
      width: 180px;
    }
  }
  
  /* iPhone SE specific optimizations */
  @media (max-width: 375px) {
    .bottom-bar {
      height: 50px;
    }
    
    .artist-signature img {
      width: 160px;
    }
    
    .home-main {
      min-height: calc(100vh - 50px);
    }
  }
</style>
