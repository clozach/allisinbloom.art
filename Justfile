default: start

# canonical "run this thing" — vite dev server (hot-reload)
start:
    pnpm dev

# production build to ./build
build:
    pnpm build

# serve the built artifact locally
preview:
    pnpm preview
