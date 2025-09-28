#!/usr/bin/env bash
set -euo pipefail

# Requested simulator name: CLI arg > env > default
DEVICE_NAME="${1:-${DEVICE_NAME:-iPhone 16 Pro}}"
echo "[sim-boot] Target device: ${DEVICE_NAME}"

# Ensure artifacts dir for UDID handoff
mkdir -p artifacts

# Pick the latest installed iOS runtime id (e.g., com.apple.CoreSimulator.SimRuntime.iOS-18-6)
RUNTIME_ID="$(xcrun simctl list runtimes | awk '/iOS/ {print $NF}' | tail -1)"
if [[ -z "${RUNTIME_ID}" || "${RUNTIME_ID}" == "(unavailable,"* ]]; then
  echo "[sim-boot] ERROR: No iOS Simulator runtimes found. Install via Xcode → Settings → Platforms."
  exit 1
fi
echo "[sim-boot] Using runtime: ${RUNTIME_ID}"

# Resolve device type id from the human name (e.g., "iPhone 16 Pro")
DEVTYPE_ID="$(xcrun simctl list devicetypes | awk -v n="$DEVICE_NAME" -F'[()]' '$1 ~ ("^" n "$") {print $2; exit}')"
# If exact match wasn’t found, try a looser match
if [[ -z "${DEVTYPE_ID}" ]]; then
  DEVTYPE_ID="$(xcrun simctl list devicetypes | awk -v n="$DEVICE_NAME" -F'[()]' '$1 ~ n {print $2; exit}')"
fi
if [[ -z "${DEVTYPE_ID}" ]]; then
  echo "[sim-boot] ERROR: No device type found matching \"${DEVICE_NAME}\""
  xcrun simctl list devicetypes | sed 's/^/  /'
  exit 1
fi
echo "[sim-boot] Device type id: ${DEVTYPE_ID}"

# Try to reuse an existing AVAILABLE device with that name
UDID="$(xcrun simctl list devices available | awk -F '[()]' -v n="$DEVICE_NAME" '$1 ~ (" " n " \\(") {print $2; exit}')"

# Create if not present
if [[ -z "${UDID}" ]]; then
  echo "[sim-boot] Creating simulator '${DEVICE_NAME}' (${DEVTYPE_ID}, ${RUNTIME_ID})"
  UDID="$(xcrun simctl create "$DEVICE_NAME" "$DEVTYPE_ID" "$RUNTIME_ID")"
fi
echo "[sim-boot] UDID: ${UDID}"

# Determine current state (Booted / Shutdown / Creating / etc.)
STATE="$(xcrun simctl list devices | awk -F '[()]' -v id="$UDID" '$0 ~ id {gsub(/^[[:space:]]+|[[:space:]]+$/,"",$3); print $3; exit}')"
echo "[sim-boot] Current state: ${STATE:-unknown}"

# Boot if not already booted
if [[ "${STATE:-}" != "Booted" ]]; then
  # If some other instance tried to boot it and it’s stuck, do a best-effort shutdown first
  xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true
  xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
fi

# Wait until SpringBoard / System App is ready
xcrun simctl bootstatus "$UDID" -b

# Show the Simulator UI only if not already running (avoid duplicate windows)
if ! pgrep -x "Simulator" >/dev/null 2>&1; then
  open -a Simulator --args -CurrentDeviceUDID "$UDID" >/dev/null 2>&1 || true
fi

# Hand off UDID to downstream steps
echo "${UDID}" > artifacts/sim-udid.txt

echo "[sim-boot] Simulator ready: ${DEVICE_NAME} (${UDID})"