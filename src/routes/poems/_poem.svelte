<script>
  import Poem from '$lib/components/Poem.svelte';
  import { onMount } from 'svelte';
  
  // MDsveX passes frontmatter as props
  export let title = '';
  export const date = '';
  
  let poemContent = '';
  /** @type {HTMLDivElement | null} */
  let contentElement = null;
  
  onMount(() => {
    // Extract the content from the rendered markdown
    if (contentElement) {
      // Remove the title (h1) as we'll display it separately through the Poem component
      const h1 = contentElement.querySelector('h1');
      if (h1) h1.remove();
      
      // Extract the poem content from the pre/code elements or paragraphs
      const preElement = contentElement.querySelector('pre code');
      if (preElement && preElement.textContent) {
        // For code block poems - preserve as raw text to maintain formatting
        poemContent = preElement.textContent;
      } else {
        // For regular paragraph poems
        const paragraphs = contentElement.querySelectorAll('p');
        if (paragraphs.length > 0) {
          poemContent = Array.from(paragraphs)
            .map(p => p.textContent || '')
            .join('\n\n');
        } else {
          // Fallback to all content
          poemContent = contentElement.textContent || '';
        }
      }
    }
  });
</script>

<div class="poem-container">
  <!-- Render the poem using our Poem component -->
  <Poem poem={{ title, content: poemContent }} />
  
  <!-- Hidden content that will be processed by onMount -->
  <div class="hidden-content" bind:this={contentElement}>
    <slot />
  </div>
</div>

<style>
  .poem-container {
    width: 100%;
    max-width: 800px;
    padding: 0 20px;
    box-sizing: border-box;
    margin: 0 auto;
  }
  
  /* Hide the original content but keep it accessible for our JavaScript */
  .hidden-content {
    position: absolute;
    visibility: hidden;
    height: 0;
    overflow: hidden;
  }
</style>
