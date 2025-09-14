# allisinbloom.art

A collection of poems and prose, built with mdsvex and notion.

## Tech & Services

- SvelteKit w/Svelte 5 (https://svelte.dev/llms-small.txt)
- GitHub API
- Vercel

## TODO
- [x] Add https://github.com/rohitpotato/svelte-command-palette with `another [>]` and `previously [<]` commands that respond to both `<`+`>` and `←`+`→` (left+right) arrow keys, with secret homerow keys to boot: `j`+`k`.
- [ ] Remove the nav bar (and any associated documentation/styles/etc.)
- [ ] Add the title of every poem in route.txt to the command palette.
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
