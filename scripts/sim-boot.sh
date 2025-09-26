#!/usr/bin/env bash
set -euo pipefail

# Requested simulator name: CLI arg > env > default
DEVICE_NAME="${1:-${DEVICE_NAME:-iPhone 16 Pro}}"

echo "[sim-boot] Target device: ${DEVICE_NAME}"

# Ensure an iOS runtime exists and pick the latest installed one
RUNTIME_ID="$(xcrun simctl list runtimes | awk '/iOS/ {print $NF}' | tail -1)"
if [[ -z "${RUNTIME_ID}" ]]; then
  echo "[sim-boot] ERROR: No iOS Simulator runtimes found. Install via Xcode → Settings → Platforms."
  exit 1
fi
echo "[sim-boot] Using runtime: ${RUNTIME_ID}"

# Find the device type id that matches the requested name (e.g., iPhone 16 Pro)
DEVTYPE_ID="$(xcrun simctl list devicetypes | awk -v n="$DEVICE_NAME" -F'[()]' '$1 ~ n {print $2; exit}')"
if [[ -z "${DEVTYPE_ID}" ]]; then
  echo "[sim-boot] ERROR: No device type found matching \"$DEVICE_NAME\""
  xcrun simctl list devicetypes | sed 's/^/  /'
  exit 1
fi
echo "[sim-boot] Device type id: ${DEVTYPE_ID}"

# Reuse an existing device if present, otherwise create it
UDID="$(xcrun simctl list devices available | awk -F '[()]' -v n="$DEVICE_NAME" '$1 ~ (" " n " \\(") {print $2; exit}')"
if [[ -z "${UDID}" ]]; then
  echo "[sim-boot] Creating simulator '${DEVICE_NAME}' (${DEVTYPE_ID}, ${RUNTIME_ID})"
  UDID="$(xcrun simctl create "$DEVICE_NAME" "$DEVTYPE_ID" "$RUNTIME_ID")"
fi
echo "[sim-boot] UDID: ${UDID}"

# Boot the device (ignore "already booted")
xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$UDID" -b

# Show the Simulator UI (non-fatal if headless)
open -a Simulator --args -CurrentDeviceUDID "$UDID" >/dev/null 2>&1 || true

echo "[sim-boot] Simulator ready: ${DEVICE_NAME} (${UDID})"