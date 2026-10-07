// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  const __SITE_BUILD__: { environment: string; revision: string };
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
