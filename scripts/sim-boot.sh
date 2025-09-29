#!/usr/bin/env bash
# scripts/sim-boot.sh
set -euo pipefail

DEVICE_NAME="${1:-${DEVICE_NAME:-iPhone 16 Pro}}"
ARTIFACTS_DIR="${2:-artifacts}"

mkdir -p "$ARTIFACTS_DIR" || true

echo "[sim-boot] Shutting down any running simulators…"
xcrun simctl shutdown all || true
# Ensure the UI app isn't holding a booted device
pkill -x Simulator >/dev/null 2>&1 || true

# Find an available device UDID that matches the name
UDID="$(xcrun simctl list devices available | awk -v n="$DEVICE_NAME" -F'[()]' '
  $0 ~ n && $0 !~ /unavailable|unavailable,/ {print $2; exit}')"

if [ -z "${UDID:-}" ]; then
  echo "[sim-boot] ERROR: No available simulator matching: $DEVICE_NAME"
  echo "[sim-boot] Available devices:"
  xcrun simctl list devices available
  exit 1
fi

# Detect problematic "Creating" state and recover by recreating the device
STATE="$(xcrun simctl list devices | awk -v u="$UDID" '$0 ~ u {gsub(/[()]/,""); print $NF; exit}')"
if [ "$STATE" = "Creating" ]; then
  echo "[sim-boot] Device is in 'Creating' state; deleting and recreating…"
  xcrun simctl shutdown "$UDID" || true
  xcrun simctl delete "$UDID" || true

  # Pick a matching device type id for DEVICE_NAME
  DEV_TYPE_ID="$(xcrun simctl list devicetypes | awk -v n="$DEVICE_NAME" -F'[()]' '$0 ~ "^ *"n" " {print $2; exit}')"
  if [ -z "${DEV_TYPE_ID:-}" ]; then
    echo "[sim-boot] ERROR: Could not find device type for '$DEVICE_NAME'"
    xcrun simctl list devicetypes
    exit 1
  fi

  # Choose a runtime (prefer the latest available iOS)
  RUNTIME_ID="$(xcrun simctl list runtimes | awk '/iOS .* (Available)/ {print $NF}' | tail -1)"
  if [ -z "${RUNTIME_ID:-}" ]; then
    echo "[sim-boot] ERROR: No available iOS runtime found"
    xcrun simctl list runtimes
    exit 1
  fi

  UDID="$(xcrun simctl create "$DEVICE_NAME" "$DEV_TYPE_ID" "$RUNTIME_ID")"
  echo "[sim-boot] Recreated device: $DEVICE_NAME ($UDID)"
fi

# Always erase once before boot to clear residue
xcrun simctl erase "$UDID" || true

echo "[sim-boot] Booting $DEVICE_NAME ($UDID)…"
# Try boot; don't exit on first failure
xcrun simctl boot "$UDID" || true

echo "[sim-boot] Waiting for boot to complete…"
if ! xcrun simctl bootstatus "$UDID" -b -t 120; then
  echo "[sim-boot] Boot timed out; restarting CoreSimulatorService and retrying once…"
  killall -9 com.apple.CoreSimulator.CoreSimulatorService >/dev/null 2>&1 || true
  sleep 2
  xcrun simctl boot "$UDID" || true
  xcrun simctl bootstatus "$UDID" -b -t 120 || { echo "[sim-boot] ERROR: Simulator failed to boot"; exit 1; }
fi

# Save UDID (fallback to tmp if artifacts is not writable)
UDID_FILE="$ARTIFACTS_DIR/sim-udid.txt"
if ! { echo "$UDID" > "$UDID_FILE"; } 2>/dev/null; then
  UDID_FILE="$(mktemp -t sim-udid)"
  echo "$UDID" > "$UDID_FILE"
  echo "[sim-boot] Note: artifacts not writable; UDID saved to $UDID_FILE"
fi

echo "[sim-boot] Simulator ready: $DEVICE_NAME ($UDID)"