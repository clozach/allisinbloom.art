/**
 * Extracts frontmatter from .svx content
 * @param {string} content - Raw .svx file content
 * @returns {{[key: string]: string}} - Parsed frontmatter
 */
export function extractFrontmatter(content) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match || !match[1]) {
    return {};
  }
  
  const frontmatterLines = match[1].split('\n');
  const frontmatter = {};
  
  frontmatterLines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      frontmatter[key] = value;
    }
  });
  
  return frontmatter;
}

// Import all .svx files in the poems directory
const poemFiles = import.meta.glob('/src/routes/poems/*/+page.svx', { as: 'raw' });

/**
 * Gets all poems with their frontmatter
 * @returns {Promise<Array<{title: string, date: string, description: string, path: string, slug: string}>>} - Array of poem objects with frontmatter data
 */
export async function getAllPoems() {
  try {
    // Load all poem files
    const entries = Object.entries(poemFiles);
    const poems = await Promise.all(
      entries.map(async ([path, loadModule]) => {
        try {
          // Extract slug from path
          const slugMatch = path.match(/\/poems\/([^/]+)\//); 
          if (!slugMatch) return null;
          
          const slug = slugMatch[1];
          const content = await loadModule();
          const frontmatter = extractFrontmatter(content);
          
          // Ensure all required properties exist
          return {
            title: frontmatter.title || slug,
            date: frontmatter.date || new Date().toISOString().split('T')[0],
            description: frontmatter.description || '',
            path: `/poems/${slug}`,
            slug
          };
        } catch (error) {
          console.error(`Error processing poem file ${path}:`, error);
          return null;
        }
      })
    );
    
    return poems.filter(Boolean).sort((a, b) => {
      // Sort by date (newest first)
      if (!a || !b) return 0;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  } catch (error) {
    console.error('Error loading poems:', error);
    return [];
  }
}

/**
 * Gets featured poems (most recent ones by default)
 * @param {number} count - Number of featured poems to return
 * @returns {Promise<Array<{title: string, date: string, description: string, path: string, slug: string}>>} - Array of featured poem objects
 */
export async function getFeaturedPoems(count = 3) {
  const allPoems = await getAllPoems();
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
