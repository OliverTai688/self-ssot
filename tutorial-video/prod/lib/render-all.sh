#!/usr/bin/env bash
export HYPERFRAMES_BROWSER_PATH=${HYPERFRAMES_BROWSER_PATH:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}
cd "$(dirname "$0")/.."
for c in "$@"; do echo "== $c $(date +%T)"; (cd $c/comp && npx hyperframes render -o ../$c.mp4 2>&1 | grep -E "^◇|rendered in|rror" ); done; echo "ALL DONE $(date +%T)"
