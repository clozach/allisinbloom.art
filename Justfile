default: start

# canonical "run this thing" — vite dev server (hot-reload)
start:
    pnpm dev

# production build (adapter-vercel writes .vercel/output)
build:
    pnpm build

# serve the built artifact locally
preview:
    pnpm preview

# regenerate the byline signature from its master, static/artist-sig.png
# (1317x300, black ink with alpha; the page tints it with --sig-filter).
# Lossless WebP at 160/288/432 px wide (1x desktop at 9rem, 2x and 1.75x
# phones, 3x phones) plus a 288 px PNG fallback. cwebp: `brew install webp`;
# sips ships with macOS. Commit the four files in src/lib/assets/.
sig:
    mkdir -p src/lib/assets
    for w in 160 288 432; do cwebp -quiet -lossless -z 9 -resize $w 0 static/artist-sig.png -o src/lib/assets/artist-sig-$w.webp; done
    sips --resampleHeightWidth 66 288 static/artist-sig.png --out src/lib/assets/artist-sig-288.png >/dev/null

# remake the static font instances src/app.css uses for the four faces every
# poem page paints with, from Google's variable files beside them in
# src/lib/fonts/ (fonttools via uv: https://docs.astral.sh/uv/). A third the
# size of the variable files; the other weights keep the variable files.
fonts:
    for spec in "noto-serif-latin 400" "noto-serif-italic-latin 400" "noto-serif-display-sc-latin 700" "noto-sans-latin 100"; do set -- $spec; SOURCE_DATE_EPOCH=0 uvx --from 'fonttools[woff]' fonttools varLib.instancer src/lib/fonts/$1.woff2 wght=$2 -o src/lib/fonts/$1-$2.woff2; done

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
