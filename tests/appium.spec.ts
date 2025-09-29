import { test, expect } from '@playwright/test';
import { newIOSSession, endIOSSession, savePng, saveSource } from '../helpers/appium';

async function waitForAnyVisibleCells(driver: any, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Cells appear even if the container is Table/CollectionView/ScrollView
    const cells = await driver.$$(
      "-ios predicate string:type == 'XCUIElementTypeCell' AND visible == 1"
    );
    if (cells.length > 0) return cells;
    await driver.pause(300);
  }
  throw new Error('Timed out waiting for any visible cell');
}

test.describe('SimpleAPIAppanish iOS UI (Appium via Playwright)', () => {
  test('1) Basic UI exists (nav title + list has cells)', async ({}, testInfo) => {
    const driver = await newIOSSession({ name: testInfo.title });

    // --- start video recording
    await driver.startRecordingScreen();

    try {
      const title = await driver.$("-ios predicate string:name == 'Users'");
      await title.waitForExist({ timeout: 7000 });

      const cells = await waitForAnyVisibleCells(driver); // ← robust
      expect(cells.length).toBeGreaterThan(0);

      const shot = await savePng(driver, '01_basicUI');
      await testInfo.attach('01_basicUI.png', { path: shot, contentType: 'image/png' });
    } finally {
      // --- stop + attach video (always)
      try {
        const b64 = await driver.stopRecordingScreen();
        if (b64) {
          await testInfo.attach('01_basicUI.mp4', {
            body: Buffer.from(b64, 'base64'),
            contentType: 'video/mp4',
          });
        }
      } catch {
        /* ignore video errors */
      }

      await endIOSSession(driver, testInfo.title);
    }
  });

  test('2) Load users and assert a cell', async ({}, testInfo) => {
    const driver = await newIOSSession({
      name: testInfo.title,
      env: { UITESTS_MOCK_API: '1' },
    });

    // --- start video recording
    await driver.startRecordingScreen();

    try {
      // Tap the single visible nav button (reload). SwiftUI often labels it generically.
      const reload = await driver.$(
        "-ios predicate string:type == 'XCUIElementTypeButton' AND visible == 1"
      );
      if (await reload.isExisting()) await reload.click();

      const cells = await waitForAnyVisibleCells(driver);
      const first = cells[0];

      // First static text in a cell is the name; ensure non-empty
      const labels = await first.$$(
        "-ios predicate string:type == 'XCUIElementTypeStaticText' AND visible == 1"
      );
      const nameText = (labels.length ? await labels[0].getText() : '').trim();
      expect(nameText.length).toBeGreaterThan(0);

      /* 
      test('3) Error banner when API fails (after reload)', async ({}, testInfo) => {
        const driver = await newIOSSession({
          name: testInfo.title,
          env: { API_FAIL: '1' }, // keep your fail flag
        });

        // keyword + alert catch-all
        const ERROR_PREDICATE =
          "-ios predicate string:(" +
            "type == 'XCUIElementTypeAlert' OR " +
            "(type == 'XCUIElementTypeStaticText' AND (" +
              "name CONTAINS[c] 'error' OR label CONTAINS[c] 'error' OR value CONTAINS[c] 'error' OR " +
              "name CONTAINS[c] 'failed' OR label CONTAINS[c] 'failed' OR value CONTAINS[c] 'failed' OR " +
              "name CONTAINS[c] 'network' OR label CONTAINS[c] 'network' OR value CONTAINS[c] 'network'" +
            "))" +
          ")";

        try {
          // tap reload
          await (await driver.$('~reloadButton')).click();

          // wait for either an alert or any error-ish static text
          const maybeError = await driver.$(ERROR_PREDICATE);
          await maybeError.waitForExist({ timeout: 20_000 });
        } catch (e) {
          // debug artifacts on failure
          const png = await savePng(driver, '03_error_debug');
          await testInfo.attach('03_error_debug.png', { path: png, contentType: 'image/png' });
          const src = await saveSource(driver, '03_error_debug');
          await testInfo.attach('03_error_debug.xml', { path: src, contentType: 'application/xml' });
          throw e;
        } finally {
          await endIOSSession(driver, testInfo.title);
        }
      });
      */

      const shot = await savePng(driver, '02_loadedUsers');
      await testInfo.attach('02_loadedUsers.png', { path: shot, contentType: 'image/png' });
    } finally {
      // --- stop + attach video (always)
      try {
        const b64 = await driver.stopRecordingScreen();
        if (b64) {
          await testInfo.attach('02_loadedUsers.mp4', {
            body: Buffer.from(b64, 'base64'),
            contentType: 'video/mp4',
          });
        }
      } catch {
        /* ignore video errors */
      }

      await endIOSSession(driver, testInfo.title);
    }
  });
});
