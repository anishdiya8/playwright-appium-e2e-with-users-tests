// tests/support/driver.ts
import wd from 'webdriverio';

function buildEnvForApp(): Record<string, string> {
  const env: Record<string, string> = {};
  const { API_BASE_URL, X_API_KEY } = process.env;

  if (API_BASE_URL && API_BASE_URL.trim()) env.API_BASE_URL = API_BASE_URL.trim();
  if (X_API_KEY && X_API_KEY.trim())       env.X_API_KEY    = X_API_KEY.trim();

  // Helpful debug so you can see this in CI logs
  // (won’t include the key value itself, just whether it’s present)
  console.log('[caps] API_BASE_URL present:', !!env.API_BASE_URL);
  console.log('[caps] X_API_KEY present   :', !!env.X_API_KEY);

  return env;
}

export function buildCaps() {
  const env = buildEnvForApp();

  return {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': process.env.DEVICE_NAME || 'iPhone 16 Pro',
    'appium:udid': process.env.UDID, // optional, if you export it
    'appium:app': process.env.APP_PATH, // or use bundleId
    'appium:newCommandTimeout': 300,
    // only send processArguments.env if we actually have at least one key
    ...(Object.keys(env).length
      ? { 'appium:processArguments': { args: [], env } }
      : {}),
    'appium:autoAcceptAlerts': true,
    'appium:waitForQuiescence': false,
    'appium:wdaStartupRetries': 2,
    'appium:wdaStartupRetryInterval': 2000,
  } as const;
}

export async function createIosDriver() {
  return wd.remote({
    protocol: 'http',
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: Number(process.env.APPIUM_PORT || 4723),
    path: process.env.APPIUM_BASE_PATH || '/',
    capabilities: buildCaps(),
  });
}