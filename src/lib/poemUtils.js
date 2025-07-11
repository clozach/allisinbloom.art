// Import all .svx files in the poems directory with their metadata
// MDsveX automatically exposes frontmatter as metadata
/**
 * @typedef {Object} PoemMetadata
 * @property {string} title - The title of the poem
 * @property {string} date - The date the poem was written
 */

/**
 * @typedef {Object} PoemData
 * @property {string} title - The title of the poem
 * @property {string} date - The date the poem was written
 * @property {string} path - The path to the poem
 * @property {string} slug - The slug of the poem
 * @property {string} content - The raw content of the poem
 */

// We also need the metadata from the files
/** @type {Record<string, {metadata: PoemMetadata}>} */
const poemMetadata = import.meta.glob('/src/routes/poems/*/+page.svx', { eager: true });

// Using eager: true with query: '?raw' returns the raw content as strings
/** @type {Record<string, string>} */
const poemFiles = import.meta.glob('/src/routes/poems/*/+page.svx', { eager: true, query: '?raw', import: 'default' });

/**
 * Gets all poems with their frontmatter
 * @returns {Array<{title: string, date: string, path: string, slug: string}>} - Array of poem objects with frontmatter data
 */
export function getAllPoems() {
  const poems = [];
  
  for (const path in poemMetadata) {
    const file = poemMetadata[path];
    const slugMatch = path.match(/\/poems\/([^/]+)\//);
    
    if (file && typeof file === 'object' && 'metadata' in file && slugMatch) {
      const slug = slugMatch[1];
      /** @type {PoemMetadata} */
      const metadata = file.metadata || {};
      
      poems.push({
        title: metadata.title || slug,
        date: metadata.date || new Date().toISOString().split('T')[0],
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
 * @returns {Array<{title: string, date: string, path: string, slug: string}>} - Array of featured poem objects
 */
export function getFeaturedPoems(count = 3) {
  const allPoems = getAllPoems();
  return allPoems.slice(0, count);
}

/**
 * Gets a random poem with its content
 * @returns {PoemData|null} - Random poem with content or null if no poems available
 */
export function getRandomPoem() {
  const allPoems = getAllPoems();
  
  // Return null if no poems are available
  if (allPoems.length === 0) return null;
  
  // Select a random poem
  const randomIndex = Math.floor(Math.random() * allPoems.length);
  /** @type {PoemData} */
  const randomPoem = { 
    ...allPoems[randomIndex],
    content: '' // Initialize with empty content
  };
  
  // Get the poem content from the raw file content
  const poemPath = `/src/routes/poems/${randomPoem.slug}/+page.svx`;
  const rawContent = poemFiles[poemPath];
  
  // Extract the raw content from the file
  if (rawContent && typeof rawContent === 'string') {
    try {      
      // Extract the content part (after the frontmatter)
      const contentParts = rawContent.split('---');
      if (contentParts.length >= 3) {
        // Everything after the second --- delimiter is the content
        randomPoem.content = contentParts.slice(2).join('---').trim();
      }
    } catch (error) {
      console.error(`Error extracting content for poem ${randomPoem.slug}:`, error);
    }
  }
  
  return randomPoem;
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


