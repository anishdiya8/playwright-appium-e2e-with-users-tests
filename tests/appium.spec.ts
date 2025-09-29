// tests/appium.spec.ts
import { test, expect } from '../fixtures/appium'; // <-- use the fixture with app-path launch
import { savePng, saveSource } from '../helpers/appium';

async function waitForAnyVisibleCells(driver: any, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Works for Table/Collection/Scroll views
    const cells = await driver.$$("-ios predicate string:type == 'XCUIElementTypeCell' AND visible == 1");
    if (cells.length > 0) return cells;
    await driver.pause(300);
  }
  throw new Error('Timed out waiting for any visible cell');
}

test.describe('SimpleAPIAppanish iOS UI (Appium via Playwright)', () => {
  test('1) Basic UI exists (nav title + list has cells)', async ({ driver }, testInfo) => {
    // Title should be visible
    const title = await driver.$("-ios predicate string:name == 'Users'");
    await title.waitForExist({ timeout: 7000 });

    // List should have at least one cell
    const cells = await waitForAnyVisibleCells(driver);
    expect(cells.length).toBeGreaterThan(0);

    const shot = await savePng(driver, '01_basicUI');
    await testInfo.attach('01_basicUI.png', { path: shot, contentType: 'image/png' });
  });

  test('2) Load users and assert a cell', async ({ driver }, testInfo) => {
    // Tap the single visible nav button (reload)
    const reload = await driver.$("-ios predicate string:type == 'XCUIElementTypeButton' AND visible == 1");
    if (await reload.isExisting()) await reload.click();

    const cells = await waitForAnyVisibleCells(driver);
    const first = cells[0];

    // First static text in a cell is the name; ensure non-empty
    const labels = await first.$$("-ios predicate string:type == 'XCUIElementTypeStaticText' AND visible == 1");
    const nameText = (labels.length ? await labels[0].getText() : '').trim();
    expect(nameText.length).toBeGreaterThan(0);

    const shot = await savePng(driver, '02_loadedUsers');
    await testInfo.attach('02_loadedUsers.png', { path: shot, contentType: 'image/png' });
  });

  // Optional: uncomment to capture UI tree on failures
  test.afterEach(async ({ driver }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const src = await saveSource(driver, 'debug_ui');
      await testInfo.attach('debug_ui.xml', { path: src, contentType: 'application/xml' });
      const png = await savePng(driver, 'debug_screen');
      await testInfo.attach('debug_screen.png', { path: png, contentType: 'image/png' });
    }
  });
});