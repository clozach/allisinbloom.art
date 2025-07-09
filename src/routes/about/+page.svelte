<script>
  // About page component
</script>

<svelte:head>
  <title>Allisin Bloom | About</title>
</svelte:head>

<div class="about-page">
  <h1>About Allisin Bloom</h1>
  
  <section class="about-content">
    <p>
      <strong>Allisin Bloom</strong> is a collection of poems and prose that celebrate the beauty in everyday moments. 
      This site serves as a digital garden where words can grow and flourish, reaching readers across the world.
    </p>
    
    <p>
      Our content begins its journey in Notion, where ideas are cultivated and refined. When ready, they are 
      carefully transplanted to this site using mdsvex, a markdown processor for Svelte applications.
    </p>
    
    <h2>Our Process</h2>
    
    <p>
      Each piece follows a thoughtful journey:
    </p>
    
    <ol>
      <li>Writing begins in Notion, where drafts are created and edited</li>
      <li>When a piece is ready for review, its status changes to "Staged" and it appears on our staging site</li>
      <li>After final approval, the status changes to "Published" and the piece appears on the main site</li>
    </ol>
    
    <h2>Technology</h2>
    
    <p>
      This site is built with:
    </p>
    
    <ul>
      <li>SvelteKit - A framework for building web applications</li>
      <li>mdsvex - A markdown processor for Svelte</li>
      <li>Notion API - For content management</li>
      <li>Vercel - For hosting and deployment</li>
    </ul>
    
    <p>
      The integration between these technologies allows for a seamless workflow from writing to publication.
    </p>
  </section>
</div>

<style>
  .about-page {
    max-width: 800px;
    margin: 0 auto;
  }
  
  h1 {
    margin-bottom: 2rem;
  }
  
  h2 {
    margin: 2rem 0 1rem;
  }
  
  .about-content {
    background-color: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  p {
    margin-bottom: 1.5rem;
    line-height: 1.7;
  }
  
  ul, ol {
    margin-bottom: 1.5rem;
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
</style>
