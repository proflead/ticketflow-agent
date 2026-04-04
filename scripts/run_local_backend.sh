#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PYTHONPATH="$(pwd)/backend:$(pwd)/shared"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080 --app-dir backend
