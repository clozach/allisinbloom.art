import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// host: true → dev server listens on the LAN so phones on the same Wi-Fi
	// can hit it (see README § Mobile testing). allowedHosts: vite blocks any
	// Host header it doesn't know (DNS-rebinding guard); '.local' admits every
	// Bonjour name — t.local, temps-macbook-pro.local — without disabling the
	// guard for the open internet. PORT honored for launchers.
	server: {
		host: true,
		allowedHosts: ['.local'],
		...(process.env.PORT ? { port: Number(process.env.PORT) } : {})
	},
	plugins: [sveltekit(), devtoolsJson()],
	css: {
		devSourcemap: true
	}
});
