// tests/support/driver.ts
import wd from 'webdriverio';

type Caps = Record<string, any>;

function resolveAppCaps(): Caps {
  const appPath   = process.env.IOS_APP_DIR || process.env.APP_PATH || '';
  const bundleId  = process.env.IOS_BUNDLE_ID || '';

  if (!appPath && !bundleId) {
    throw new Error(
      "[driver] No app specified. Set IOS_APP_DIR (preferred) or IOS_BUNDLE_ID. " +
      "You can also set APP_PATH for backward compatibility."
    );
  }

  const caps: Caps = {};
  if (appPath)   caps['appium:app'] = appPath;
  if (bundleId)  caps['appium:bundleId'] = bundleId;
  return caps;
}

export function buildCaps(overrides: Caps = {}): Caps {
  const apiBaseUrl = process.env.API_BASE_URL || '';
  const xApiKey    = process.env.X_API_KEY    || '';
  const deviceName = process.env.DEVICE_NAME  || 'iPhone 16 Pro';
  const udid       = process.env.BOOTED_UDID  || ''; // written by sim-boot.sh

  const base: Caps = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': deviceName,

    // Prefer targeting the specific booted device to avoid duplicates
    ...(udid ? { 'appium:udid': udid } : {}),

    // App under test (path or bundle id)
    ...resolveAppCaps(),

    // Inject config so the app can reach your backend
    'appium:processArguments': {
      // Launch args show up in ProcessInfo.arguments and UserDefaults
      args: [
        '-API_BASE_URL', apiBaseUrl,
        '-X_API_KEY',    xApiKey,
      ],
      // Environment visible to the app process
      env: {
        API_BASE_URL: apiBaseUrl,
        X_API_KEY:    xApiKey,
      },
    },

    // Sensible stability defaults for CI
    'appium:newCommandTimeout': 300,
    'appium:waitForQuiescence': false,
    'appium:wdaStartupRetries': 2,
    'appium:wdaStartupRetryInterval': 2000,

    // Keep your previous behavior
    'appium:noReset': true,
  };

  // Allow tests to override anything if they pass in overrides
  return { ...base, ...overrides };
}

export async function createIosDriver(overrides: Caps = {}) {
  const capabilities = buildCaps(overrides);

  const driver = await wd.remote({
    protocol: 'http',
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: Number(process.env.APPIUM_PORT || 4723),
    path: process.env.APPIUM_BASE_PATH || '/',
    capabilities,
    logLevel: process.env.WDIO_LOG_LEVEL || 'info',
    connectionRetryCount: 3,
  });

  return driver;
}