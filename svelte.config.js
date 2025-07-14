import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: { adapter: adapter() },
	preprocess: [
		mdsvex({
			layout: {
				_: path.join(__dirname, './src/routes/poems/_poem.svelte')
			}
		})
	],
	vitePlugin: {
		inspector: {
			showToggleButton: 'always',
			toggleButtonPos: 'bottom-right',
			editorMode: 'system'
		},
	},
	extensions: ['.svelte', '.svx']
};

export default config;
