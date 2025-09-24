// tests/fixtures/appium.ts
import { test as base, expect } from '@playwright/test';
import { createIosDriver } from '../support/driver';

type Fixtures = { driver: WebdriverIO.Browser };

export const test = base.extend<Fixtures>({
  driver: async ({}, use, testInfo) => {
    const driver = await createIosDriver();
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