// tests/fixtures/appium.ts
import { test as base, expect } from '@playwright/test';
import { createIosDriver } from '../support/driver';

type Fixtures = { driver: WebdriverIO.Browser };

function buildCaps(): Record<string, any> {
  const deviceName = process.env.DEVICE_NAME || 'iPhone 16 Pro';

  // Provide either app path (from pipeline) or bundleId (if you pre-installed it)
  const appPath   = process.env.IOS_APP_DIR || process.env.APP_PATH || '';
  const bundleId  = process.env.IOS_BUNDLE_ID || '';

  const apiBaseUrl = process.env.API_BASE_URL || '';
  const xApiKey    = process.env.X_API_KEY || '';

  const baseCaps: Record<string, any> = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': deviceName,

    // Prefer explicit BOOTED_UDID if your pipeline exports it
    ...(process.env.BOOTED_UDID ? { 'appium:udid': process.env.BOOTED_UDID } : {}),

    // Launch via app path OR bundle id
    ...(appPath ? { 'appium:app': appPath } : {}),
    ...(bundleId ? { 'appium:bundleId': bundleId } : {}),

    // 👇 Inject runtime config for the app
    'appium:processArguments': {
      // Launch arguments (available via UserDefaults / ProcessInfo.arguments)
      args: [
        '-API_BASE_URL', apiBaseUrl,
        '-X_API_KEY',    xApiKey,
      ],
      // Environment variables visible to the app’s process
      env: {
        API_BASE_URL: apiBaseUrl,
        X_API_KEY:    xApiKey,
      },
    },

    // Helpful stability knobs
    'appium:newCommandTimeout': 300,
    'appium:waitForQuiescence': false,
    'appium:wdaStartupRetries': 2,
    'appium:wdaStartupRetryInterval': 2000,
  };

  if (!appPath && !bundleId) {
    throw new Error(
      '[fixtures/appium] Neither IOS_APP_DIR/APP_PATH nor IOS_BUNDLE_ID is set. ' +
      'Set IOS_APP_DIR to your .app path (from the ZIP) or IOS_BUNDLE_ID if you preinstalled.'
    );
  }

  return baseCaps;
}

export const test = base.extend<Fixtures>({
  driver: async ({}, use, testInfo) => {
    const caps = buildCaps();
    const driver = await createIosDriver(caps); // ← pass caps in
    await driver.startRecordingScreen();
    try {
      await use(driver);
    } finally {
      const b64 = await driver.stopRecordingScreen();
      await testInfo.attach('run.mp4', {
        body: Buffer.from(b64, 'base64'),
        contentType: 'video/mp4',
      });
      await driver.deleteSession();
    }
  },
});

export { expect };