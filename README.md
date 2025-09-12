# allisinbloom.art

A collection of poems and prose, built with mdsvex and notion.

## Tech & Services

- SvelteKit w/Svelte 5 (https://svelte.dev/llms-small.txt)
- GitHub API
- Vercel

## TODO
- [x] Replace random poem loading with simple MVP of a single home page with no interactivity & the "opening in sight" poem inlined onto the home page.
- [x] Add `actions` buttons from: https://www.figma.com/design/D9xiMh3Fno8hlA4eUtZjVu/allisin-bloom-allisinbloom.art?node-id=372-447&t=WJBUJ6VTgvAfCP14-11
   - [x] Implement click handlers
      - [x] To determine the routes navigated by clicking `another [>]` and `previously [<]`, load `routes.txt`—a plaintext file with one route per line.
   - [ ] Position & style another/previously buttons to match Figma:

- [ ] (user-activity): populate the rest of the file & add more poems to flesh out the site some more.
- [ ] Write scripts to push to a preview branch, then add an automation so it happens without effort on every commit

## Development

This project is powered by [`sv`](https://github.com/sveltejs/cli) (SvelteKit).

```bash
   nvm use; pnpm run dev -- --open
```

## Building

To create a production version of the app:

```bash
   nvm use; pnpm run build
```

You can preview the production build with `nvm use; npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
