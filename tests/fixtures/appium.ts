// tests/fixtures/appium.ts
import { test as base, expect } from '@playwright/test';
import { createIosDriver } from '../support/driver';

type Fixtures = { driver: WebdriverIO.Browser };

function requireEnv(name: string, hint?: string) {
  const v = process.env[name];
  if (!v) throw new Error(`[fixtures/appium] Missing env: ${name}${hint ? ` (${hint})` : ''}`);
  return v;
}

function buildCaps(): Record<string, any> {
  const deviceName = requireEnv('DEVICE_NAME', 'set in pipeline');
  const appPath    = requireEnv('IOS_APP_DIR', 'unzipped .app path from pipeline');
  const udid       = process.env.SIM_UDID || process.env.BOOTED_UDID || '';

  const apiBaseUrl = requireEnv('API_BASE_URL', 'e.g. https://.../api');
  const apiUrl     = process.env.API_URL || apiBaseUrl; // keep in sync but don’t fail if omitted
  const xApiKey    = requireEnv('X_API_KEY', 'API key header value');

  const caps: Record<string, any> = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': deviceName,
    ...(udid ? { 'appium:udid': udid } : {}),

    // ⛔️ Do NOT set bundleId — always launch the .app so processArguments/env are applied
    'appium:app': appPath,

    // Pass runtime config to the app process
    'appium:processArguments': {
      args: [], // keep empty unless your app *explicitly* reads launch args
      env: {
        API_BASE_URL: apiBaseUrl,
        API_URL:      apiUrl,
        X_API_KEY:    xApiKey,
        NODE_ENV:     'test',
      },
    },

    // Stability knobs
    'appium:newCommandTimeout': 300,
    'appium:waitForQuiescence': false,
    'appium:wdaStartupRetries': 2,
    'appium:wdaStartupRetryInterval': 2000,
    'appium:wdaLaunchTimeout': 180000,
    'appium:wdaConnectionTimeout': 180000,
    'appium:showXcodeLog': true,
  };

  return caps;
}

export const test = base.extend<Fixtures>({
  driver: async ({}, use, testInfo) => {
    const caps = buildCaps();

    // Small debug surface in CI logs
    console.log('[fixtures/appium] Launching with caps:', {
      deviceName: caps['appium:deviceName'],
      udid: caps['appium:udid'],
      app: caps['appium:app'],
      env: caps['appium:processArguments']?.env
        ? {
            API_BASE_URL: caps['appium:processArguments'].env.API_BASE_URL,
            API_URL: caps['appium:processArguments'].env.API_URL,
            X_API_KEY: '***redacted***',
          }
        : undefined,
    });

    const driver = await createIosDriver(caps);
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