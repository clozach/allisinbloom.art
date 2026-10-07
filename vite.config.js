import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';

function revision() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unrecorded'; }
}

export default defineConfig({
  // The owner editor loads lazily. Discover its dependencies before browsers
  // connect, so first use does not invalidate in-flight hydration modules.
  optimizeDeps: { include: ['@courselit/inline-edit', 'parse5'] },
  define: {
    __SITE_BUILD__: JSON.stringify({
      environment: process.env.VERCEL_ENV === 'production' ? 'production' : process.env.VERCEL_ENV === 'preview' ? 'staging' : 'dev',
      revision: revision()
    })
  },
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
