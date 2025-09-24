// tests/support/driver.ts
import wd from 'webdriverio';

export function buildCaps() {
  return {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': process.env.DEVICE_NAME || 'iPhone 15',
    'appium:app': process.env.APP_PATH,            // or use 'appium:bundleId'
    'appium:noReset': true,
    'appium:newCommandTimeout': 240,
    'appium:processArguments': {
      env: {
        API_BASE_URL: process.env.API_BASE_URL || '',
        X_API_KEY:    process.env.X_API_KEY    || '',
      },
    },
  };
}

export async function createIosDriver() {
  const driver = await wd.remote({
    protocol: 'http',
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: Number(process.env.APPIUM_PORT || 4723),
    path: process.env.APPIUM_BASE_PATH || '/',
    capabilities: buildCaps(),
  });
  return driver;
}