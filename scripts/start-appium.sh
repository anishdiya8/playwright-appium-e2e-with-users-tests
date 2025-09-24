#!/usr/bin/env bash
set -euo pipefail

# Load env (IOS_APP_DIR, SIM_NAME, APPIUM_PORT, LOG_DIR, etc.)
[ -f "./scripts/env.sh" ] && source "./scripts/env.sh"

LOG_DIR="${LOG_DIR:-artifacts}"
mkdir -p "$LOG_DIR"

SIM_NAME="${SIM_NAME:-iPhone 15}"
APPIUM_PORT="${APPIUM_PORT:-4723}"
APPIUM_HOST="${APPIUM_HOST:-127.0.0.1}"
APPIUM_BASE_PATH="${APPIUM_BASE_PATH:-/}"
APPIUM_URL="http://${APPIUM_HOST}:${APPIUM_PORT}${APPIUM_BASE_PATH}"

echo "[start-appium] IOS_APP_DIR=${IOS_APP_DIR:-<not set>}"
echo "[start-appium] Desired device: ${SIM_NAME}"
echo "[start-appium] Appium target: ${APPIUM_URL}"

# Ensure xcode-select points to full Xcode (not CommandLineTools)
DEV_DIR="$(xcode-select -p 2>/dev/null || true)"
if [[ -z "${DEV_DIR}" || "${DEV_DIR}" == *"CommandLineTools"* ]]; then
  echo "[start-appium] ERROR: xcode-select is not set to Xcode."
  echo "  sudo xcode-select -s /Applications/Xcode.app"
  exit 1
fi
echo "[start-appium] Xcode dev dir: ${DEV_DIR}"

# Make sure an iOS runtime exists
if ! xcrun simctl list runtimes | grep -qi "iOS "; then
  echo "[start-appium] ERROR: No iOS Simulator runtimes found. Install via Xcode → Settings → Platforms."
  exit 1
fi
RUNTIME_ID="$(xcrun simctl list runtimes | grep -Eo 'com\.apple\.CoreSimulator\.SimRuntime\.iOS-[0-9-]+' | tail -n 1)"
echo "[start-appium] Using runtime: ${RUNTIME_ID}"

# Find or create the simulator
UDID="$(xcrun simctl list devices available | awk -F '[()]' -v n="$SIM_NAME" '$0 ~ (" " n " \\(") {print $2; exit}')"
if [[ -z "${UDID:-}" ]]; then
  DEVTYPE="$(xcrun simctl list devicetypes | awk -F '[()]' -v n="$SIM_NAME" '$1 ~ n {print $2; exit}')"
  DEVTYPE="${DEVTYPE:-com.apple.CoreSimulator.SimDeviceType.iPhone-15}"
  echo "[start-appium] Creating simulator '$SIM_NAME' ($DEVTYPE, ${RUNTIME_ID})"
  UDID="$(xcrun simctl create "$SIM_NAME" "$DEVTYPE" "$RUNTIME_ID")"
fi

# Boot (ignore 'already booted'), wait until ready
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b || true
echo "$UDID" > "$LOG_DIR/sim-udid.txt"
echo "[start-appium] Booted UDID: $UDID"

# Show the Simulator UI (non-fatal in CI)
open -a Simulator --args -CurrentDeviceUDID "$UDID" || true

# Ensure the XCUITest driver is present (idempotent, robust against ANSI colors)
if npx --yes appium driver list --installed 2>/dev/null \
  | sed -E 's/\x1B\[[0-9;]*m//g' \
  | grep -Eiq '(^|[^[:alnum:]_])xcuitest([^[:alnum:]_]|$)'; then
  echo "[start-appium] XCUITest driver already installed."
else
  echo "[start-appium] Installing appium-xcuitest-driver..."
  npx --yes appium driver install xcuitest || true
fi

# Ensure port is free
if lsof -i TCP:"$APPIUM_PORT" -sTCP:LISTEN -P -n >/dev/null 2>&1; then
  echo "[start-appium] ERROR: Port $APPIUM_PORT already in use. Stop the old Appium or change APPIUM_PORT." >&2
  exit 1
fi

# Start Appium (persist after script exits)
APP_ARGS=( --base-path "${APPIUM_BASE_PATH}" --port "${APPIUM_PORT}" --log-timestamp )
if [[ "${DEBUG_APPIUM:-0}" == "1" ]]; then
  APP_ARGS+=( --log-level debug )
  echo "[start-appium] DEBUG_APPIUM=1 → using verbose Appium logs"
fi

echo "[start-appium] Starting Appium…"
npx --yes appium "${APP_ARGS[@]}" > "${LOG_DIR}/appium.log" 2>&1 & echo $! > .appium.pid
APPIUM_PID="$(cat .appium.pid)"

# Write a tiny env file other steps can source
{
  echo "APPIUM_HOST=${APPIUM_HOST}"
  echo "APPIUM_PORT=${APPIUM_PORT}"
  echo "APPIUM_BASE_PATH=${APPIUM_BASE_PATH}"
  echo "APPIUM_URL=${APPIUM_URL}"
} > "${LOG_DIR}/appium-env"

# Wait until /status responds OK
echo "[start-appium] Waiting for ${APPIUM_URL%/}/status …"
for i in $(seq 1 45); do
  if curl -fsS "${APPIUM_URL%/}/status" >/dev/null 2>&1; then
    echo "[start-appium] Appium is ready."
    READY=1; break
  fi
  sleep 1
done
if [[ "${READY:-0}" != "1" ]]; then
  echo "[start-appium] ERROR: Timed out waiting for Appium readiness. Tail of log:"
  tail -n 60 "${LOG_DIR}/appium.log" || true
  exit 1
fi

echo "[start-appium] Simulator: $SIM_NAME ($UDID)"
echo "[start-appium] Appium PID: $APPIUM_PID"
echo "[start-appium] Log: ${LOG_DIR}/appium.log"
echo "[start-appium] To stop: kill -TERM \$(cat .appium.pid)  # or: lsof -tiTCP:${APPIUM_PORT} | xargs -r kill -9"