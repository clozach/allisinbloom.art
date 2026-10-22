#!/usr/bin/env bash
# lh-recipe.sh — measure the site with Lighthouse the way production behaves.
# See README.md beside this file. Subcommands:
#   setup                               install the pinned Lighthouse and a throwaway TLS certificate
#   build  <rev> <dir>                  git archive <rev> into <dir> (a new folder, or an earlier build, which it replaces), install, production build
#   serve  <dir> [port=5212]            vite preview of that build on 127.0.0.1
#   front  <upstream> <listen> [ms=300] Vercel-like edge (TLS, HTTP/2, brotli, cache headers, HTML delay)
#   unfront <listen>                    stop that front
#   audit  <label> <url> [runs=5] [out=./lh-out]   mobile then desktop, <runs> each, then the summary
#   stop   <dir>                        stop the server `serve` started for <dir>
# Ports 5212-5215 only (5199 is the always-on dev server, 5211 Playwright's).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE="${SITE:-$(git -C "$here" rev-parse --show-toplevel)}"   # history only: builds never happen inside it
LH_HOME="${LH_HOME:-$HOME/.cache/allisinbloom-lighthouse}"
LH_VERSION=12.8.2
LH_BIN="${LH_BIN:-$LH_HOME/node_modules/.bin/lighthouse}"
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -d "$HOME/.local/share/fnm/aliases/default/bin" ] && export PATH="$HOME/.local/share/fnm/aliases/default/bin:$PATH"

port_ok() { case "$1" in 5212|5213|5214|5215) ;; *) echo "port must be 5212-5215" >&2; exit 64;; esac
  if lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $1 busy" >&2; exit 65; fi; }
node_ok() { [ "$(node -p 'process.versions.node.split(".")[0]')" = 22 ] || { echo "need Node 22 (.nvmrc); adapter-vercel refuses $(node -v)" >&2; exit 69; }; }

cmd="${1:?setup|build|serve|front|unfront|audit|stop}"; shift
case "$cmd" in
  setup)
    mkdir -p "$LH_HOME/cert"
    # a pinned local copy: `npx lighthouse` stalls when several runs start at once
    [ -x "$LH_BIN" ] || npm install --prefix "$LH_HOME" --no-save --silent "lighthouse@$LH_VERSION"
    [ -f "$LH_HOME/cert/cert.pem" ] || openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj /CN=127.0.0.1 \
      -keyout "$LH_HOME/cert/key.pem" -out "$LH_HOME/cert/cert.pem" 2>/dev/null
    "$LH_BIN" --version
    ;;
  build)
    rev="${1:?rev}"; dir="${2:?dir}"; node_ok
    # nothing is deleted until the rev resolves and <dir> is new, empty, or an earlier build of this recipe
    sha="$(git -C "$SITE" rev-parse --verify --quiet "$rev^{commit}")" || { echo "unknown rev: $rev" >&2; exit 64; }
    if [ -e "$dir" ] && [ -n "$(ls -A "$dir" 2>/dev/null)" ] && [ ! -f "$dir/.lh-build" ]; then
      echo "$dir is not empty and was not made by lh-recipe build; pick a new folder (or empty it yourself)" >&2; exit 73
    fi
    rm -rf "$dir"; mkdir -p "$dir"; touch "$dir/.lh-build"
    git -C "$SITE" archive "$sha" | tar -x -C "$dir"   # tracked files only, as Vercel builds: no private drafts, no .env
    cd "$dir"; pnpm install --frozen-lockfile >/dev/null
    VERCEL_ENV=production VERCEL_GIT_COMMIT_SHA="$sha" pnpm build 2>&1 | tail -2
    ;;
  serve)
    dir="${1:?dir}"; port="${2:-5212}"; port_ok "$port"; cd "$dir"
    nohup pnpm preview --host 127.0.0.1 --port "$port" --strictPort > .preview.log 2>&1 &
    echo $! > .preview.pid
    for _ in $(seq 1 60); do curl -s -o /dev/null "http://127.0.0.1:$port/poems" && { echo "up: http://127.0.0.1:$port"; exit 0; }; sleep 0.5; done
    echo "server did not start; see $dir/.preview.log" >&2; exit 1
    ;;
  front)
    up="${1:?upstream port}"; listen="${2:?listen port}"; delay="${3:-300}"; port_ok "$listen"
    [ -f "$LH_HOME/cert/cert.pem" ] || { echo "run: $0 setup" >&2; exit 66; }
    nohup node "$here/vercel-front.mjs" "$up" "$listen" "$delay" "$LH_HOME/cert" > "$LH_HOME/front-$listen.log" 2>&1 &
    echo $! > "$LH_HOME/front-$listen.pid"; sleep 1; cat "$LH_HOME/front-$listen.log"
    ;;
  unfront)
    kill "$(cat "$LH_HOME/front-${1:?listen port}.pid")" 2>/dev/null || true
    ;;
  stop)
    dir="$(cd "${1:?dir}" && pwd -P)"; pid="$(cat "$dir/.preview.pid")"
    pkill -P "$pid" 2>/dev/null || true; kill "$pid" 2>/dev/null || true
    # vite preview can outlive pnpm: stop whatever still listens on 5212-5215 from this build's directory
    for l in $(lsof -nP -iTCP:5212-5215 -sTCP:LISTEN -t 2>/dev/null); do
      [ "$(lsof -p "$l" 2>/dev/null | awk '$4=="cwd"{print $NF}')" = "$dir" ] && kill "$l"
    done; true
    ;;
  audit)
    label="${1:?label}"; url="${2:?url}"; runs="${3:-5}"; out="${4:-./lh-out}"; mkdir -p "$out"
    [ -x "$LH_BIN" ] || { echo "run: $0 setup" >&2; exit 66; }
    for preset in mobile desktop; do
      extra=(); [ "$preset" = desktop ] && extra=(--preset=desktop)
      for n in $(seq 1 "$runs"); do
        curl -sk -o /dev/null --max-time 30 "$url"   # warm the server first
        "$LH_BIN" "$url" "${extra[@]}" --only-categories=performance,accessibility,best-practices,seo \
          --output=json --output-path="$out/$label-$preset-$n.json" \
          --chrome-flags="--headless=new --ignore-certificate-errors" --quiet 2> "$out/$label-$preset-$n.err" \
          || echo "run $n $preset failed (see $out/$label-$preset-$n.err)" >&2
      done
    done
    node "$here/lh-median.mjs" "$out" "$label"
    ;;
  *) echo "unknown subcommand: $cmd" >&2; exit 64;;
esac
