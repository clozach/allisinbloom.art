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
			},
			remarkPlugins: [
				// Preserve line breaks and whitespace for poetry
				() => (tree) => {
					// Custom plugin to preserve leading whitespace in paragraphs
					function visit(node) {
						if (node.type === 'paragraph' && node.children) {
							node.children.forEach(child => {
								if (child.type === 'text' && child.value) {
									// Convert leading tabs/spaces to non-breaking spaces
									child.value = child.value.replace(/^(\t+)/gm, (match) =>
										'&nbsp;'.repeat(match.length * 6)
									);
									child.value = child.value.replace(/^( +)/gm, (match) =>
										'&nbsp;'.repeat(match.length * 1.5)
									);
								}
							});
						}
						if (node.children) {
							node.children.forEach(visit);
						}
					}
					visit(tree);
				}
			]
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
