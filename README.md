# allisinbloom.art

A collection of poems and prose, built with mdsvex and notion.

## Workflow Criteria

1. Writing begins in Notion
2. When a page status changes to "Staged", it is exported into mdsvex in ./src/routes and pushed to the staging branch
3. When a page status changes to "Published", it is exported into mdsvex in ./src/routes and pushed to the main branch

## Services

- Notion API
- GitHub API
- Vercel

## TODO

- [ ] Kick-start the project
   - [x] Initialize SvelteKit repo with mdsvex & commit with machine-generated test content
   - [ ] Work with the user to create a static page with just one poem to publish as the site's first content
   - [ ] Guide the user through setting up Vercel, incl. configuring DNS records
   - [ ] Write a staging script that simply pushes the current code to the staging branch
   - [ ] Write a production script that simply pushes the current code to the main branch

## Development

This project is powered by [`sv`](https://github.com/sveltejs/cli) (SvelteKit).

```bash
# Start the development server
pnpm run dev

# Start the server and open the app in a new browser tab
pnpm run dev -- --open
```

## Building

To create a production version of the app:

```bash
pnpm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
