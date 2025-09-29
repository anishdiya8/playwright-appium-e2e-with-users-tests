#!/usr/bin/env bash
# scripts/env.sh
# Purpose: Shared config for Appium + iOS Simulator runs (no platformVersion pinning)

###############################################################################
# SAFETY: never pin the Simulator OS via env (this triggered earlier 18.x issues)
###############################################################################
unset APPIUM_PLATFORM_VERSION PLATFORM_VERSION IOS_PLATFORM_VERSION platformVersion
unset SIM_RUNTIME IOS_RUNTIME

###############################################################################
# IOS_APP_DIR resolution
# - If the pipeline/export already set IOS_APP_DIR, keep it.
# - Otherwise prefer the unzipped artifact, then first *.app we can find.
###############################################################################
if [ -z "${IOS_APP_DIR:-}" ]; then
  if [ -d "artifacts/SimpleAPIAppanish.app" ]; then
    IOS_APP_DIR="artifacts/SimpleAPIAppanish.app"
  elif [ -d "./SimpleAPIAppanish.app" ]; then
    IOS_APP_DIR="./SimpleAPIAppanish.app"
  else
    # Last resort: find any .app (avoid node_modules)
    guess="$(
      /usr/bin/find artifacts . -type d -name '*.app' \
        -not -path '*/node_modules/*' | head -n1
    )"
    [ -n "$guess" ] && IOS_APP_DIR="$guess"
  fi
fi

if [ -z "${IOS_APP_DIR:-}" ] || [ ! -d "$IOS_APP_DIR" ]; then
  echo "[env.sh] ERROR: IOS_APP_DIR not set or not a directory." >&2
  echo "[env.sh] Hint: ensure your pipeline exports IOS_APP_DIR to the unzipped .app (e.g., artifacts/SimpleAPIAppanish.app)." >&2
  exit 1
fi
export IOS_APP_DIR
echo "[env.sh] IOS_APP_DIR=$IOS_APP_DIR"

###############################################################################
# Device name / simulator config
# - Keep consistent with sim-boot.sh (DEVICE_NAME default: iPhone 16 Pro)
###############################################################################
export DEVICE_NAME="${DEVICE_NAME:-iPhone 16 Pro}"
export SIM_NAME="${SIM_NAME:-$DEVICE_NAME}"

###############################################################################
# Appium port (default 4723)
###############################################################################
export APPIUM_PORT="${APPIUM_PORT:-4723}"

# OPTIONAL: deterministic fixtures if your app supports it
# export UITESTS_MOCK_API=1

# OPTIONAL: Launch by bundle id instead of .app
# export IOS_BUNDLE_ID="com.anishmathew.SimpleAPIApp.SimpleAPIAppanish.dev123"