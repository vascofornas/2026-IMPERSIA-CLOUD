#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
API="$ROOT/services/api"
WEB="$ROOT/apps/web"

if [[ ! -d "$API/.venv" ]]; then
  python3 -m venv "$API/.venv"
  "$API/.venv/bin/pip" install -q -r "$API/requirements.txt"
fi

if [[ ! -d "$WEB/node_modules" ]]; then
  (cd "$WEB" && npm install)
fi

export IMPERSIA_LOCAL_DATA="$ROOT/data"
mkdir -p "$IMPERSIA_LOCAL_DATA"

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

"$API/.venv/bin/uvicorn" main:app --host 127.0.0.1 --port 8765 --app-dir "$API" &
API_PID=$!
(cd "$WEB" && npm run dev) &
WEB_PID=$!

sleep 2
open "http://127.0.0.1:5174" 2>/dev/null || true
echo "Impersia local → http://127.0.0.1:5174 (Ctrl+C para parar)"
wait
