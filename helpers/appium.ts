// helpers/appium.ts
import fs from 'node:fs';
import path from 'node:path';
import { remote, type RemoteOptions } from 'webdriverio';
import dotenv from 'dotenv';

// Load .env early (optional DOTENV_PATH override)
dotenv.config({ path: process.env.DOTENV_PATH || '.env' });

export type IOSSessionOptions = {
  name: string;
  env?: Record<string, string>;
  artifactsDir?: string;
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactsPath(name: string, artifactsDir: string, ext: string) {
  const safe = name.replace(/[^a-z0-9-_]/gi, '_');
  return path.join(artifactsDir, `${safe}.${ext}`);
}

function readSimUdidFromArtifacts(artifactsDir: string) {
  try {
    const p = path.join(artifactsDir, 'sim-udid.txt');
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : undefined;
  } catch {
    return undefined;
  }
}

export async function newIOSSession(opts: IOSSessionOptions): Promise<WebdriverIO.Browser> {
  const artifactsDir = opts.artifactsDir ?? path.resolve('artifacts');
  ensureDir(artifactsDir);

  // Allow either a direct .app path or a bundle id
  const appPath =
    process.env.IOS_APP_DIR ??
    path.resolve('build/Build/Products/Debug-iphonesimulator/SimpleAPIAppanish.app');
  const bundleId = process.env.IOS_BUNDLE_ID; // e.g. com.yourco.SimpleAPIAppanish

  // If launching via .app, fail fast if it doesn't exist
  if (!bundleId && !fs.existsSync(appPath)) {
    throw new Error(
      `[helpers/appium] iOS .app not found at: ${appPath}\n` +
        `Set IOS_APP_DIR to the Simulator .app path (or set IOS_BUNDLE_ID to launch an installed app).`
    );
  }

  const artifactsUdid = readSimUdidFromArtifacts(artifactsDir);
  const deviceName = process.env.SIM_NAME ?? 'iPhone 16 Pro';
  const udid = process.env.SIM_UDID ?? artifactsUdid; // prefer explicit, fall back to file
  const port = Number(process.env.APPIUM_PORT ?? 4723);

  // ======================================================
  // Env that will be injected into the iOS app process
  // (your requested approach)
  // ======================================================
  const base = (process.env.API_BASE_URL ?? process.env.API_URL ?? '').trim(); // <<< CHANGED
  const envForApp = {                                                            // <<< CHANGED
    API_BASE_URL: base,
    API_URL: base,              // <-- ✨ NEW/IMPORTANT
    X_API_KEY: (process.env.X_API_KEY ?? '').trim(),
    NODE_ENV: process.env.NODE_ENV ?? 'test',
    // allow per-test overrides to win
    ...(opts.env ?? {})
  };

  // Helpful redacted log
  const redacted = { ...envForApp, X_API_KEY: envForApp.X_API_KEY ? '***redacted***' : '' }; // <<< CHANGED
  console.log('[helpers/appium] processArguments.env =', redacted);                           // <<< CHANGED

  const caps: RemoteOptions = {
    hostname: '127.0.0.1',
    port,
    path: '/', // matches --base-path / in start-appium.sh
    logLevel: 'info',
    capabilities: {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': deviceName,
      ...(udid ? { 'appium:udid': udid } : {}),
      ...(bundleId ? { 'appium:bundleId': bundleId } : { 'appium:app': appPath }),
      'appium:app': process.env.IOS_APP_DIR, 
      'appium:newCommandTimeout': 300,
      'appium:autoAcceptAlerts': true,
      // <<< CHANGED: explicitly include args: [] and your env object
      'appium:processArguments': { args: [], env: envForApp },
      // stability tweaks
      'appium:waitForQuiescence': false,
      'appium:showXcodeLog': true,
      'appium:wdaLaunchTimeout': 180000,
      'appium:wdaConnectionTimeout': 180000,
      'appium:wdaStartupRetries': 2,
      'appium:wdaStartupRetryInterval': 2000
    }
  };

  // Ensure no platformVersion is pinned
  // @ts-ignore
  delete (caps.capabilities as any)['appium:platformVersion'];
  // @ts-ignore
  delete (caps.capabilities as any).platformVersion;

  console.log(
    `[helpers/appium] Starting session => deviceName=${deviceName}, udid=${udid ?? '<auto>'}, ` +
      (bundleId ? `bundleId=${bundleId}` : `app=${appPath}`)
  );

  const driver = await remote(caps);

  // Best-effort screen recording
  try {
    // @ts-ignore
    await (driver as any).startRecordingScreen();
  } catch {
    try {
      // @ts-ignore
      await (driver as any).execute('mobile: startRecordingScreen');
    } catch {}
  }

  return driver;
}

export async function endIOSSession(
  driver: WebdriverIO.Browser,
  testName: string,
  artifactsDir = 'artifacts'
) {
  try {
    // @ts-ignore
    const base64 = await (driver as any).stopRecordingScreen();
    if (base64) {
      const videoPath = artifactsPath(`${testName}-run-video`, artifactsDir, 'mp4');
      fs.writeFileSync(videoPath, Buffer.from(base64, 'base64'));
    }
  } catch {}

  await driver.deleteSession();
}

export async function savePng(
  driver: WebdriverIO.Browser,
  name: string,
  artifactsDir = 'artifacts'
) {
  const pngPath = artifactsPath(name, artifactsDir, 'png');
  try {
    // @ts-ignore
    await (driver as any).saveScreenshot(pngPath);
  } catch {
    // Fallback via base64
    // @ts-ignore
    const base64 = await (driver as any).takeScreenshot();
    fs.writeFileSync(pngPath, Buffer.from(base64, 'base64'));
  }
  return pngPath;
}

// ⬇️ dump the current page source to artifacts
export async function saveSource(
  driver: WebdriverIO.Browser,
  name: string,
  artifactsDir = 'artifacts'
) {
  // @ts-ignore - provided by Appium/WebDriver
  const xml: string = await (driver as any).getPageSource();
  const file = artifactsPath(name, artifactsDir, 'xml');
  fs.writeFileSync(file, xml, 'utf8');
  return file;
}
