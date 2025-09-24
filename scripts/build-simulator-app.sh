#!/usr/bin/env bash
set -euo pipefail

: "${IOS_APP_REPO:?Set IOS_APP_REPO (git URL to your SwiftUI app repo)}"
IOS_APP_BRANCH="${IOS_APP_BRANCH:-main}"
IOS_PROJECT_PATH="${IOS_PROJECT_PATH:-SimpleAPIAppanish.xcodeproj}"
IOS_SCHEME="${IOS_SCHEME:-SimpleAPIAppanish}"
BUILD_DIR="${BUILD_DIR:-build}"

rm -rf app-src
git clone --depth=1 -b "$IOS_APP_BRANCH" "$IOS_APP_REPO" app-src

pushd app-src >/dev/null

# Build for Simulator (no signing needed)
xcodebuild       -project "$IOS_PROJECT_PATH"       -scheme "$IOS_SCHEME"       -configuration Debug       -destination "generic/platform=iOS Simulator"       -derivedDataPath "../$BUILD_DIR"       build

popd >/dev/null

APP_PATH="${BUILD_DIR}/Build/Products/Debug-iphonesimulator/${IOS_SCHEME}.app"
echo "Built .app at: $APP_PATH"
