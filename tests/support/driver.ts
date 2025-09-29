import 'dotenv/config';
import { remote, type RemoteOptions } from 'webdriverio';

function buildEnvForApp(): Record<string, string> {
  const env: Record<string, string> = {};

  // Accept either name, prefer API_BASE_URL; set BOTH for the app
  const base = (process.env.API_BASE_URL ?? process.env.API_URL ?? '').trim();
  const key  = (process.env.X_API_KEY ?? '').trim();

  if (base) { env.API_BASE_URL = base; env.API_URL = base; }
  if (key)  { env.X_API_KEY = key; }

  // Fail fast so you see a clear error in CI instead of an empty table.
  if (!env.API_URL)  throw new Error('Missing API_URL / API_BASE_URL (check .env or CI exports)');
  if (!env.X_API_KEY) throw new Error('Missing X_API_KEY (check .env or CI exports)');

  // Helpful (redacted) log
  const logged = { ...env, X_API_KEY: env.X_API_KEY ? '***redacted***' : undefined };
  console.log('[caps] processArguments.env =', logged);

  return env;
}

export function buildCaps() {
  const env = buildEnvForApp();
  const udid = process.env.UDID || process.env.BOOTED_UDID; // fallback to CI-provided UDID

  return {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': process.env.DEVICE_NAME || 'iPhone 16 Pro',
    'appium:udid': udid,                         // optional
    'appium:app': process.env.APP_PATH,          // or bundleId
    'appium:newCommandTimeout': 300,
    'appium:processArguments': { args: [], env }, // <-- populated with API env
    'appium:autoAcceptAlerts': true,
    'appium:waitForQuiescence': false,
    'appium:wdaStartupRetries': 2,
    'appium:wdaStartupRetryInterval': 2000,
  } as const;
}

export async function createIosDriver() {
  const caps = buildCaps();
  console.log('[caps] sending to Appium:', JSON.stringify(caps, null, 2));

  const opts: RemoteOptions = {
    protocol: 'http',
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: Number(process.env.APPIUM_PORT || 4723),
    path: process.env.APPIUM_BASE_PATH || '/',
    capabilities: caps as any,
  };

  return remote(opts);
}