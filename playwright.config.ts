import 'dotenv/config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ---- Tests ----
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,                        // iOS Simulator/WDA works best single-threaded
  timeout: 240_000,                  // allow time for WDA/app to settle
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 0 : 0,   // deterministic in CI; adjust locally if you want

  forbidOnly: !!process.env.CI,
  outputDir: 'test-results',

  // ---- Reports (for Buildkite artifacts & annotations) ----
  reporter: [
    ['list'],
    ['html',  { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'junit-report.xml' }], // picked up by junit-annotate step
  ],

  // ---- Defaults (we drive a native app via Appium, not PW browsers) ----
  use: {
    trace: 'off',                    // optional: keep off to avoid extra artifacts in CI
    video: 'off',                    // Appium provides MP4s when you record in tests/fixtures
    screenshot: 'only-on-failure',
  },

  // Optional: tidy project label in reports
  projects: [
    { name: 'ios-appium' },
  ],
});