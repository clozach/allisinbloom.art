import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// host: true → dev server listens on the LAN so phones on the same Wi-Fi
	// can hit it (see README § Mobile testing). PORT honored for launchers.
	server: {
		host: true,
		...(process.env.PORT ? { port: Number(process.env.PORT) } : {})
	},
	plugins: [sveltekit(), devtoolsJson()],
	css: {
		devSourcemap: true
	}
});
