#!/usr/bin/env bash
set -euo pipefail
if [ -f ".env" ]; then set -a; . ./.env; set +a; fi
# Optional env loader (keeps any pre-set vars; won't overwrite)
[ -f "./scripts/env.sh" ] && source "./scripts/env.sh"

LOG_DIR="${LOG_DIR:-artifacts}"
mkdir -p "$LOG_DIR"

# Respect values provided by the pipeline
: "${IOS_APP_DIR:=}"        # DON'T override if already set
: "${IOS_BUNDLE_ID:=}"      # optional (launch by bundle id)
: "${SIM_NAME:=iPhone 16 Pro}"
: "${APPIUM_PORT:=4723}"
: "${APPIUM_HOST:=127.0.0.1}"
: "${APPIUM_BASE_PATH:=/}"
APPIUM_URL="http://${APPIUM_HOST}:${APPIUM_PORT}${APPIUM_BASE_PATH}"

echo "[start-appium] IOS_APP_DIR=${IOS_APP_DIR:-<not set>}"
echo "[start-appium] IOS_BUNDLE_ID=${IOS_BUNDLE_ID:-<not set>}"
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

# Check that an iOS runtime exists (sanity)
if ! xcrun simctl list runtimes | grep -qi "iOS "; then
  echo "[start-appium] ERROR: No iOS Simulator runtimes found. Install via Xcode → Settings → Platforms."
  exit 1
fi
RUNTIME_ID="$(xcrun simctl list runtimes | grep -Eo 'com\.apple\.CoreSimulator\.SimRuntime\.iOS-[0-9-]+' | tail -n 1 || true)"
echo "[start-appium] Using runtime: ${RUNTIME_ID:-unknown}"

###############################################
# Reuse an already booted simulator ONLY
###############################################
# Preferred: UDID written by sim-boot.sh
if [[ -z "${BOOTED_UDID:-}" && -f "$LOG_DIR/sim-udid.txt" ]]; then
  BOOTED_UDID="$(cat "$LOG_DIR/sim-udid.txt" 2>/dev/null || true)"
fi

# Fallback 1: a booted device that matches SIM_NAME
if [[ -z "${BOOTED_UDID:-}" ]]; then
  BOOTED_UDID="$(xcrun simctl list devices booted | \
    awk -v n="$SIM_NAME" -F '[()]' '$0 ~ n {print $2; exit}' || true)"
fi

# Fallback 2: any booted device
if [[ -z "${BOOTED_UDID:-}" ]]; then
  BOOTED_UDID="$(xcrun simctl list devices booted | \
    sed -n 's/.*(\([A-F0-9-]\{36\}\)).*/\1/p' | head -n1 || true)"
fi

# If nothing is booted, do NOT create/boot—fail clearly. sim-boot.sh should be called earlier.
if [[ -z "${BOOTED_UDID:-}" ]]; then
  echo "[start-appium] ERROR: No booted simulator found. Run scripts/sim-boot.sh \"$SIM_NAME\" first."
  exit 1
fi

echo "[start-appium] Using booted UDID: $BOOTED_UDID"
echo "$BOOTED_UDID" > "$LOG_DIR/sim-udid.txt"

# Do NOT open Simulator again; avoid duplicate windows.
# If you really want to surface it in local runs, uncomment the next line:
# open -a Simulator --args -CurrentDeviceUDID "$BOOTED_UDID" >/dev/null 2>&1 || true

###############################################
# Ensure XCUITest driver is available
###############################################
if npx --yes appium driver list --installed 2>/dev/null \
  | sed -E 's/\x1B\[[0-9;]*m//g' \
  | grep -Eiq '(^|[^[:alnum:]_])xcuitest([^[:alnum:]_]|$)'; then
  echo "[start-appium] XCUITest driver already installed."
else
  echo "[start-appium] Installing appium-xcuitest-driver..."
  npx --yes appium driver install xcuitest || true
fi

###############################################
# Start Appium server
###############################################
# Ensure port is free
if lsof -i TCP:"$APPIUM_PORT" -sTCP:LISTEN -P -n >/dev/null 2>&1; then
  echo "[start-appium] ERROR: Port $APPIUM_PORT already in use. Stop the old Appium or change APPIUM_PORT." >&2
  exit 1
fi

APP_ARGS=( --base-path "${APPIUM_BASE_PATH}" --port "${APPIUM_PORT}" --log-timestamp )
if [[ "${DEBUG_APPIUM:-0}" == "1" ]]; then
  APP_ARGS+=( --log-level debug )
  echo "[start-appium] DEBUG_APPIUM=1 → using verbose Appium logs"
fi

echo "[start-appium] Starting Appium…"
npx --yes appium "${APP_ARGS[@]}" > "${LOG_DIR}/appium.log" 2>&1 & echo $! > .appium.pid
APPIUM_PID="$(cat .appium.pid)"

# Tiny env handoff for later scripts/tools if needed
{
  echo "APPIUM_HOST=${APPIUM_HOST}"
  echo "APPIUM_PORT=${APPIUM_PORT}"
  echo "APPIUM_BASE_PATH=${APPIUM_BASE_PATH}"
  echo "APPIUM_URL=${APPIUM_URL}"
  echo "BOOTED_UDID=${BOOTED_UDID}"
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

echo "[start-appium] Simulator: $SIM_NAME ($BOOTED_UDID)"
echo "[start-appium] Appium PID: $APPIUM_PID"
echo "[start-appium] Log: ${LOG_DIR}/appium.log"
echo "[start-appium] To stop: kill -TERM \$(cat .appium.pid)  # or: lsof -tiTCP:${APPIUM_PORT} | xargs -r kill -9"