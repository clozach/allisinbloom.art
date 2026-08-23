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

# ── always-on review surface ───────────────────────────────────────────
# localhost:5199 (LAN-visible, HMR) is kept up 100% of the time by a launchd
# LaunchAgent — starts at login, restarts within ~10s if killed. Installed
# via the vault-wide `always-on` tool (dot-to-dot bin/). Opt out:
# `just uninstall-agent`.

# launchd entry point — what the agent actually runs (no fnm shell hooks here)
_serve-dev:
    pnpm dev --port 5199 --strictPort

install-agent:
    always-on install allisinbloom.dev --cwd "{{justfile_directory()}}" --port 5199 -- /opt/homebrew/bin/just _serve-dev

uninstall-agent:
    always-on remove allisinbloom.dev

restart-agent:
    always-on restart allisinbloom.dev

agent-status:
    always-on status allisinbloom.dev

agent-logs:
    always-on logs allisinbloom.dev
