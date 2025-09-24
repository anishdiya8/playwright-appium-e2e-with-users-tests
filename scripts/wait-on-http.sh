#!/usr/bin/env bash
set -euo pipefail
URL="${1:?usage: wait-on-http.sh <url> [timeout_s]}"
TIMEOUT="${2:-30}"
for i in $(seq $TIMEOUT); do
  if curl -fsS "$URL" >/dev/null; then
    echo "Ready: $URL"; exit 0
  fi
  sleep 1
done
echo "Timeout waiting for $URL"; exit 1