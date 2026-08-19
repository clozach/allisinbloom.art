import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Determine directories relative to the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const poemsDir = path.join(rootDir, 'src', 'routes', 'poems');

// Read immediate sub-directories inside src/routes/poems
const entries = fs.readdirSync(poemsDir, { withFileTypes: true });
const dirnames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

dirnames.sort(); // Ensure deterministic output

// Write the inventory file at the project root (the live poem list is static/route.txt)
const outPath = path.join(rootDir, 'routes-inventory.txt');
fs.writeFileSync(outPath, `${dirnames.join('\n')}\n`, 'utf8');

console.log(`✅ routes-inventory.txt generated with ${dirnames.length} entries.`);
