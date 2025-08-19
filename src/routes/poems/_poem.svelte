<script>
  import Poem from '$lib/components/Poem.svelte';
  import { page } from '$app/stores';
  
  // MDsveX passes frontmatter as props
  export let title = '';
  export const date = '';
  export let slug = '';
  
  let poemContent = '';

  // Load raw .svx files so we can preserve exact line breaks
  /** @type {Record<string, string>} */
  const poemFiles = import.meta.glob('/src/routes/poems/*/+page.svx', {
    eager: true,
    query: '?raw',
    import: 'default'
  });

  $: {
    // Determine slug: use provided prop if present, else derive from path
    const pathname = $page.url.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const derivedSlug = parts[1];
    const effectiveSlug = slug || derivedSlug;
    if (effectiveSlug) {
      const poemPath = `/src/routes/poems/${effectiveSlug}/+page.svx`;
      const rawContent = poemFiles[poemPath];
      if (typeof rawContent === 'string') {
        try {
          const contentParts = rawContent.split('---');
          if (contentParts.length >= 3) {
            const frontmatter = contentParts[1];
            poemContent = contentParts.slice(2).join('---').trim();
            if (!title) {
              const m = frontmatter.match(/^\s*title:\s*(.*)$/m);
              if (m) {
                title = m[1].trim().replace(/^"|"$/g, '');
              }
            }
          } else {
            poemContent = rawContent.trim();
          }
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
