import { test, expect } from '@playwright/test';
import { newIOSSession, endIOSSession, savePng } from '../helpers/appium';
import { test, expect } from './fixtures/appium';

async function waitForAnyVisibleCells(driver: any, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cells = await driver.$$("-ios predicate string:type == 'XCUIElementTypeCell' AND visible == 1");
    if (cells.length > 0) return cells;
    await driver.pause(300);
  }
  throw new Error('Timed out waiting for any visible cell');
}

test('Title shows Users', async ({}, testInfo) => {
  const driver = await newIOSSession({ name: testInfo.title });

  // start video
  await driver.startRecordingScreen();

  try {
    const title = await driver.$("-ios predicate string:name == 'Users'");
    await title.waitForExist({ timeout: 7000 });
    await savePng(driver, 'users_title');
  } finally {
    // stop + attach video (always)
    try {
      const b64 = await driver.stopRecordingScreen();
      if (b64) {
        await testInfo.attach('users_title.mp4', {
          body: Buffer.from(b64, 'base64'),
          contentType: 'video/mp4',
        });
      }
    } catch { /* ignore video errors */ }

    await endIOSSession(driver, testInfo.title);
  }
});

test('First three names are visible and non-empty', async ({}, testInfo) => {
  const driver = await newIOSSession({ name: testInfo.title });

  // start video
  await driver.startRecordingScreen();

  try {
    const cells = await waitForAnyVisibleCells(driver);
    const take = cells.slice(0, 3);

    for (const [i, cell] of take.entries()) {
      const labels = await cell.$$("-ios predicate string:type == 'XCUIElementTypeStaticText' AND visible == 1");
      const nameText = (labels.length ? await labels[0].getText() : '').trim();
      expect(nameText.length).toBeGreaterThan(0); // name not empty
    }

    await savePng(driver, 'first_three_names');
  } finally {
    // stop + attach video (always)
    try {
      const b64 = await driver.stopRecordingScreen();
      if (b64) {
        await testInfo.attach('first_three_names.mp4', {
          body: Buffer.from(b64, 'base64'),
          contentType: 'video/mp4',
        });
      }
    } catch { /* ignore video errors */ }

    await endIOSSession(driver, testInfo.title);
  }
});

test('Emails look valid (first and last)', async ({}, testInfo) => {
  const driver = await newIOSSession({ name: testInfo.title });

  // start video
  await driver.startRecordingScreen();

  try {
    // Grab all visible labels that look like emails
    const emailLabels = await driver.$$(
      "-ios predicate string:(type == 'XCUIElementTypeStaticText' AND visible == 1 AND (label CONTAINS '@' OR value CONTAINS '@'))"
    );
    expect(emailLabels.length).toBeGreaterThanOrEqual(2);

    const firstEmail = (await emailLabels[0].getText()).trim();
    const lastEmail = (await emailLabels[emailLabels.length - 1].getText()).trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRe.test(firstEmail)).toBeTruthy();
    expect(emailRe.test(lastEmail)).toBeTruthy();

    await savePng(driver, 'emails_validation');
  } finally {
    // stop + attach video (always)
    try {
      const b64 = await driver.stopRecordingScreen();
      if (b64) {
        await testInfo.attach('emails_validation.mp4', {
          body: Buffer.from(b64, 'base64'),
          contentType: 'video/mp4',
        });
      }
    } catch { /* ignore video errors */ }

    await endIOSSession(driver, testInfo.title);
  }
});