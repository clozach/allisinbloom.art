<script>
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Allisin Bloom | {$page.data.title || 'A Collection of Poems and Prose'}</title>
  <meta name="description" content="A collection of poems and prose, built with mdsvex and notion." />
</svelte:head>

<div class="app">
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

  <main>
    <slot />
  </main>

  <footer>
    <p>© {new Date().getFullYear()} Allisin Bloom. All rights reserved.</p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Georgia', serif;
    line-height: 1.6;
    color: #333;
    background-color: #f9f9f9;
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

  footer {
    text-align: center;
    padding: 1.5rem;
    background-color: #fff;
    border-top: 1px solid #eee;
    font-size: 0.9rem;
    color: #666;
  }

  @media (max-width: 600px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style>
