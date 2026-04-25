#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PYTHONPATH="$(pwd)/backend:$(pwd)/shared"
UVICORN_BIN="${UVICORN_BIN:-$(pwd)/.venv/bin/uvicorn}"
if [ ! -x "$UVICORN_BIN" ]; then
  UVICORN_BIN="uvicorn"
fi
"$UVICORN_BIN" app.main:app --reload --host 0.0.0.0 --port 8080 --app-dir backend
