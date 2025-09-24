#!/usr/bin/env bash
set -euo pipefail
APPIUM_PORT="${APPIUM_PORT:-4723}"
if [[ -f .appium.pid ]]; then kill -TERM "$(cat .appium.pid)" || true; rm -f .appium.pid; fi
p="$(lsof -tiTCP:$APPIUM_PORT -sTCP:LISTEN -P -n || true)"; [[ -n "$p" ]] && kill -9 $p || true