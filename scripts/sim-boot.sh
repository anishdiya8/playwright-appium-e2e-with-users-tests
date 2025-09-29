#!/usr/bin/env bash
# scripts/sim-boot.sh
set -euo pipefail

DEVICE_NAME="${1:-${DEVICE_NAME:-iPhone 16 Pro}}"
ARTIFACTS_DIR="${2:-artifacts}"

mkdir -p "$ARTIFACTS_DIR"

echo "[sim-boot] Shutting down any running simulators…"
xcrun simctl shutdown all || true
# make sure the UI app isn't holding on to a booted device
killall -9 Simulator >/dev/null 2>&1 || true

# Find an available device UDID that matches the name
UDID="$(xcrun simctl list devices available | awk -v n="$DEVICE_NAME" -F'[()]' '
  $0 ~ n && $0 !~ /unavailable|unavailable,/ {print $2; exit}')"

if [ -z "${UDID:-}" ]; then
  echo "[sim-boot] ERROR: No available simulator matching: $DEVICE_NAME"
  echo "[sim-boot] Available devices:"
  xcrun simctl list devices available
  exit 1
fi

echo "[sim-boot] Booting $DEVICE_NAME ($UDID)…"
xcrun simctl boot "$UDID" || true

# Bring up the Simulator app on the chosen UDID
open -a Simulator --args -CurrentDeviceUDID "$UDID" || true

echo "[sim-boot] Waiting for boot to complete…"
xcrun simctl bootstatus "$UDID" -b

echo "$UDID" > "$ARTIFACTS_DIR/sim-udid.txt"
echo "[sim-boot] Simulator ready: $DEVICE_NAME ($UDID)"