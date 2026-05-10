#!/bin/sh
# nginx:alpine sources every executable in /docker-entrypoint.d before
# launching nginx. We use that hook to rewrite every build-time placeholder
# with whatever environment values point at runtime.
set -eu
TARGET_DIR=/usr/share/nginx/html

# API base URL — overridden at container start; falls back to the
# localhost default for `ng serve`-style standalone runs.
API_BASE_URL_DEFAULT='http://localhost:3000/api/v1'
API_BASE_URL_VAL="${API_BASE_URL:-$API_BASE_URL_DEFAULT}"

for f in "$TARGET_DIR"/*.js; do
  [ -f "$f" ] || continue
  sed -i \
    -e "s|__API_BASE_URL__|$API_BASE_URL_VAL|g" \
    -e "s|$API_BASE_URL_DEFAULT|$API_BASE_URL_VAL|g" \
    "$f"
done

echo "[agelo-frontend] API base set to $API_BASE_URL_VAL"
