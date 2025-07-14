import { error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

/**
 * This server endpoint is needed to provide a clean URL without the .mp3 extension
 * while still forcing the browser to download the file instead of playing it.
 * 
 * Why this approach instead of alternatives:
 * 1. Using a redirect would show the .mp3 extension in the URL after clicking
 * 2. Using the HTML download attribute works in many cases but has limitations across browsers
 * 3. This server-side approach gives us full control over the response headers
 * 
 * The Content-Disposition header with 'attachment' is key - it tells the browser
 * to download the file instead of trying to play it in the browser window.
 * 
 * @type {import('./$types').RequestHandler}
 */
export async function GET() {
  try {
    // Get the absolute path to the MP3 file
    const staticDir = path.resolve(process.cwd(), 'static');
    const filePath = path.join(staticDir, 'audio', 'clearing-song.mp3');
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      throw error(404, 'File not found');
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Set headers to force download
    const headers = {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'attachment; filename="clearing-song.mp3"',
      'Content-Length': String(fileBuffer.length)
    };
    
    return new Response(fileBuffer, { headers });
  } catch (err) {
    console.error('Error serving file:', err);
    throw error(500, 'Error serving file');
  }
}
