<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Check if we're on the home page
  $: isHomePage = $page.url.pathname === '/';
  
  // Get routes from layout data
  $: routes = $page.data.routes || ['opening-in-sight'];
  
  // Determine current route from URL
  $: currentRoute = getCurrentRoute($page.url.pathname);
  $: currentIndex = routes.indexOf(currentRoute);
  
  // Navigation state - ensure routes are loaded and currentIndex is valid
  $: validCurrentIndex = routes.length > 0 && currentIndex >= 0 ? currentIndex : 0;
  $: hasPrevious = routes.length > 1 && validCurrentIndex > 0;
  $: hasNext = routes.length > 1 && validCurrentIndex < routes.length - 1;
  $: previousUrl = hasPrevious ? (validCurrentIndex === 1 ? '/' : `/poems/${routes[validCurrentIndex - 1]}`) : null;
  $: nextUrl = hasNext ? `/poems/${routes[validCurrentIndex + 1]}` : null;
  
  function getCurrentRoute(pathname: string) {
    if (pathname === '/') {
      return routes && routes.length > 0 ? routes[0] : 'opening-in-sight';
    }
    const match = pathname.match(/\/poems\/([^/]+)/);
    return match ? match[1] : (routes && routes.length > 0 ? routes[0] : 'opening-in-sight');
  }
  
  function handlePrevious() {
    if (!hasPrevious) return;
    if (previousUrl) {
      goto(previousUrl);
    }
  }
  
  function handleNext() {
    if (!hasNext) return;
    if (nextUrl) {
      goto(nextUrl);
    }
  }

  // Global keyboard navigation (ArrowLeft/Right and j/k)
  onMount(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === '<' || e.key === 'j' || e.key === ',') {
        handlePrevious();
      } else if (e.key === 'ArrowRight' || e.key === '>' || e.key === 'k' || e.key === '.') {
        handleNext();
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  });
</script>

<svelte:head>
  <title>Allisin Bloom | {$page.data.title || 'A Collection of Poems and Prose'}</title>
  <meta name="description" content="A collection of poems and prose, built with mdsvex and notion." />
</svelte:head>

<div class="app">
  <main>
    <slot />
  </main>
  
  <!-- Bottom bar with navigation and artist signature -->
  <div class="bottom-bar">
    <div class="nav-buttons">
      <button 
        class="nav-button previous" 
        class:disabled={!hasPrevious}
        disabled={!hasPrevious}
        title={hasPrevious ? `Go to ${previousUrl}` : 'No previous poem'}
        on:click={handlePrevious}
      >
        previously [&lt;]
      </button>
      <button 
        class="nav-button next" 
        class:disabled={!hasNext}
        disabled={!hasNext}
        title={hasNext ? `Go to ${nextUrl}` : 'No next poem'}
        on:click={handleNext}
      >
        another [&gt;]
      </button>
    </div>
    <div class="artist-signature">
      <a href="https://bsky.app/profile/allisinbloom.bsky.social" target="_blank" rel="noopener noreferrer">
        <img src="/artist-sig.png" alt="Artist Signature" />
      </a>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    line-height: 1.6;
    color: #533737;
    background-color: hsl(0 13% 98% / 1);
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
    margin: 0 auto;
    margin-top: 12vh;
    margin-bottom: 30vh;
    padding: 0;
    font-size: clamp(0.09rem, calc(0.09rem + (1.5rem - 0.09rem) * ((100vw - 50px) / (568px - 50px))), 1.5rem); 
  }
  
  /* Home page specific main styling removed to keep wrappers identical */

  /* Bottom Bar with Navigation and Signature */
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
    justify-content: space-between;
    padding: 0 20px;
  }
  
  /* Navigation buttons */
  .nav-buttons {
    display: flex;
    gap: 2rem;
  }
  
  .nav-button {
    background: none;
    border: none;
    font-family: 'Noto Serif', serif;
    font-size: 1rem;
    color: #666;
    cursor: pointer;
    padding: 0.5rem 1rem;
    transition: color 0.2s ease;
  }
  
  .nav-button:hover {
    color: #caa8d6;
  }
  @media (hover: none) {
    .nav-button:hover {
      color: inherit;
    }
  }
  
  .nav-button:active,
  .nav-button:focus {
    color: #b077c5;
    outline: none;
  }
  
  .nav-button.disabled,
  .nav-button:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
  
  .nav-button.disabled:hover,
  .nav-button:disabled:hover {
    color: #ccc;
  }
  
  /* Artist Signature - aligned to the far right */
  .artist-signature {
    padding: 10px 0;
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
  }
</style>
