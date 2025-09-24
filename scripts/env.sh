#!/usr/bin/env bash
# scripts/env.sh
# Purpose: Local config for Appium + iOS Simulator runs (no platformVersion pinning)

###############################################################################
# SAFETY: never pin the Simulator OS via env (this triggered your 18.5 error)
###############################################################################
unset APPIUM_PLATFORM_VERSION PLATFORM_VERSION IOS_PLATFORM_VERSION platformVersion
unset SIM_RUNTIME IOS_RUNTIME

###############################################################################
# LOCAL (Option A): Use a prebuilt Simulator .app from your machine
###############################################################################

# Your Simulator .app path from Xcode (with a Simulator destination selected)
export IOS_APP_DIR="/Users/user/Library/Developer/Xcode/DerivedData/SimpleAPIAppanish-ddufydmpunqlildogpkdvxqxalcy/Build/Products/Debug-iphonesimulator/SimpleAPIAppanish.app"

# Local niceties
export SIM_NAME="${SIM_NAME:-iPhone 15}"
export APPIUM_PORT="${APPIUM_PORT:-4723}"

# If you want deterministic test data (only if your app supports it)
# export UITESTS_MOCK_API=1

# OPTIONAL (Option B): Launch an already-installed app by bundle id instead of .app
# export IOS_BUNDLE_ID="com.anishmathew.SimpleAPIApp.SimpleAPIAppanish.dev123"

# Fallback: if the hard-coded path changed, auto-find it
if [ ! -d "$IOS_APP_DIR" ]; then
  guess="$(mdfind 'kMDItemFSName="SimpleAPIAppanish.app"&&kMDItemPath=*Debug-iphonesimulator*' | head -n 1)"
  if [ -n "$guess" ]; then
    export IOS_APP_DIR="$guess"
    echo "[env.sh] IOS_APP_DIR auto-detected: $IOS_APP_DIR"
  else
    echo "[env.sh] WARNING: IOS_APP_DIR not found. Update the path in scripts/env.sh." >&2
  fi
fi

###############################################################################
# CI block left commented for future use
###############################################################################
# export IOS_APP_REPO="https://<your iOS app repo>.git"
# export IOS_APP_BRANCH="main"
# export IOS_PROJECT_PATH="SimpleAPIAppanish.xcodeproj"
# export IOS_SCHEME="SimpleAPIAppanish"
# export BUILD_DIR="build"
# export IOS_APP_DIR="build/Build/Products/Debug-iphonesimulator/${IOS_SCHEME}.app"