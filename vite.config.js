import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// honor PORT from the environment (e.g. preview launchers); vite ignores it natively
	server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
	plugins: [sveltekit(), devtoolsJson()],
	css: {
		devSourcemap: true
	}
});
