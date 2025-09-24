import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ---- Tests ----
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,                       // iOS Simulator/WDA works best single-threaded
  timeout: 240_000,                 // allow time for WDA/app to settle
  expect: { timeout: 10_000 },
  retries: 0,                       // keep CI deterministic; we attach our own videos
  forbidOnly: !!process.env.CI,
  outputDir: 'test-results',

  // ---- Reports (for Buildkite artifacts & annotations) ----
  reporter: [
    ['list'],
    ['junit', { outputFile: 'junit-report.xml' }],          // picked up by junit-annotate
    ['html',  { open: 'never', outputFolder: 'playwright-report' }],
  ],

  // ---- Defaults (we're not using PW browsers; Appium handles video) ----
  use: {
    trace: 'on-first-retry',        // harmless even with retries=0; useful locally if you bump retries
    video: 'off',                   // Appium screen-recording provides MP4s
    screenshot: 'only-on-failure',  // helpful for quick glance in report
  },

  // Optional: name the project so reports look tidy
  projects: [
    {
      name: 'ios-appium',
      use: {},
    },
  ],
});