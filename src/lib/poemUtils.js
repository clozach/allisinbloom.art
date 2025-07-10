// Import all .svx files in the poems directory with their metadata
// MDsveX automatically exposes frontmatter as metadata
/**
 * @typedef {Object} PoemMetadata
 * @property {string} title - The title of the poem
 * @property {string} date - The date the poem was written
 * @property {string} description - A short description of the poem
 */

/**
 * @typedef {Object} PoemModule
 * @property {PoemMetadata} metadata - The frontmatter metadata from the .svx file
 */

// Using eager: true returns the actual modules, not functions
/** @type {Record<string, PoemModule>} */
const poemFiles = import.meta.glob('/src/routes/poems/*/+page.svx', { eager: true });

/**
 * Gets all poems with their frontmatter
 * @returns {Array<{title: string, date: string, description: string, path: string, slug: string}>} - Array of poem objects with frontmatter data
 */
export function getAllPoems() {
  const poems = [];
  
  for (const path in poemFiles) {
    const file = poemFiles[path];
    const slugMatch = path.match(/\/poems\/([^/]+)\//);
    
    if (file && typeof file === 'object' && 'metadata' in file && slugMatch) {
      const slug = slugMatch[1];
      /** @type {PoemMetadata} */
      const metadata = file.metadata || {};
      
      poems.push({
        title: metadata.title || slug,
        date: metadata.date || new Date().toISOString().split('T')[0],
        description: metadata.description || '',
        path: `/poems/${slug}`,
        slug
      });
    }
  }
  
  return poems.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Gets featured poems (most recent ones by default)
 * @param {number} count - Number of featured poems to return
 * @returns {Array<{title: string, date: string, description: string, path: string, slug: string}>} - Array of featured poem objects
 */
export function getFeaturedPoems(count = 3) {
  const allPoems = getAllPoems();
  return allPoems.slice(0, count);
}

/**
 * Gets random quotes from poems
 * @returns {Array<string>} - Array of quotes
 */
export function getQuotes() {
  return [
    "Poetry is the spontaneous overflow of powerful feelings: it takes its origin from emotion recollected in tranquility.",
    "Poetry is what gets lost in translation.",
    "Poetry is the revelation of a feeling that the poet believes to be interior and personal which the reader recognizes as his own."
  ];
}


