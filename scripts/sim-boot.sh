#!/usr/bin/env bash
set -euo pipefail
DEVICE_NAME="${1:-iPhone 15}"
xcrun simctl create "$DEVICE_NAME" "iPhone 15" "iOS" >/dev/null 2>&1 || true
xcrun simctl boot "$DEVICE_NAME" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$DEVICE_NAME" -b