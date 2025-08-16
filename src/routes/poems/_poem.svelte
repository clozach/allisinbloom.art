<script>
  import Poem from '$lib/components/Poem.svelte';
  import { page } from '$app/stores';
  
  // MDsveX passes frontmatter as props
  export let title = '';
  export const date = '';
  
  let poemContent = '';

  // Load raw .svx files so we can preserve exact line breaks
  /** @type {Record<string, string>} */
  const poemFiles = import.meta.glob('/src/routes/poems/*/+page.svx', {
    eager: true,
    query: '?raw',
    import: 'default'
  });

  $: {
    // Determine slug from current path: /poems/<slug>
    const pathname = $page.url.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[1];
    if (slug) {
      const poemPath = `/src/routes/poems/${slug}/+page.svx`;
      const rawContent = poemFiles[poemPath];
      if (typeof rawContent === 'string') {
        try {
          const contentParts = rawContent.split('---');
          poemContent = contentParts.length >= 3
            ? contentParts.slice(2).join('---').trim()
            : rawContent.trim();
        } catch (e) {
          console.error('Failed to extract poem content:', e);
          poemContent = '';
        }
      }
    }
  }
</script>

<div class="poem-container">
  <!-- Render the poem using our Poem component -->
  <Poem poem={{ title, content: poemContent }} />
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
