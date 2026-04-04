#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PYTHONPATH="$(pwd)/mcp_service:$(pwd)/shared"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 --app-dir mcp_service
