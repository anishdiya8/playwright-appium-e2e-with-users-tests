# Playwright + Appium (iOS) — SimpleAPIAppanish

This repo lets you run **native iOS UI automation** for your SwiftUI app using **Appium (XCUITest driver)**, while keeping **Playwright** as your test runner and reporter.  
Artifacts: screenshots (`artifacts/*.png`), run video (`artifacts/*-run-video.mp4`), HTML report (`playwright-report/`).

> Note: *uiautomator2* is **Android-only**. For **iOS** we use the **XCUITest** driver.

## Prereqs
- macOS with **Xcode** + iOS Simulator
- Node.js 18+
- Appium 2 (`npx appium -v` works; the script installs the driver automatically)

## One-time
```bash
npm ci
npm run appium:drivers   # installs the 'xcuitest' driver
```

## Build the iOS app for Simulator
Option A — build from your app repo (recommended):
```bash
export IOS_APP_REPO="https://github.com/you/SimpleAPIAppanish.git"   # set your real URL
export IOS_APP_BRANCH="main"                                         # optional
export IOS_PROJECT_PATH="SimpleAPIAppanish.xcodeproj"                # or YourApp.xcworkspace (adjust build script)
export IOS_SCHEME="SimpleAPIAppanish"
npm run build:app
```

Option B — use an already-built .app and set:
```bash
export IOS_APP_DIR="/absolute/path/to/SimpleAPIAppanish.app"
```

## Start simulator + Appium
```bash
npm run appium:start
# reads SIM_UDID from artifacts/sim-udid.txt for later
```

## Run tests locally
```bash
# If you didn't set IOS_APP_DIR, the default is build/Build/Products/Debug-iphonesimulator/SimpleAPIAppanish.app
npx playwright test
npx playwright show-report
open artifacts   # view screenshots and videos
```

## Buildkite
Use `.buildkite_pipeline.yml` as your step content or adapt into your main pipeline.  
Set `IOS_APP_REPO` (and optional overrides) as **environment variables** in the pipeline.

## Test coverage (3 tests)
1. **Basic UI exists** — XPath & iOS predicate selects the title.
2. **Load users (mocked)** — taps button by XPath, waits for list, asserts first cell.
3. **Error path** — sets env so app fails; verifies error banner.

## iOS app selectors
Make sure your SwiftUI view sets `accessibilityIdentifier`s like:
```swift
Text("SimpleAPIAppanish").accessibilityIdentifier("titleLabel")
Button("Load Users") { /* ... */ }.accessibilityIdentifier("loadUsersButton")
List { /* rows */ }.accessibilityIdentifier("userList")
Text("Failed to load users").accessibilityIdentifier("errorBanner")
```
This gives you stable selectors (and allows XPath by @name).

> Keep your Info.plist `API_BASE_URL` and ATS exception as per your existing cheatsheet.
