import { Page, test } from '@playwright/test';
import { logger } from './logger';
import { captureScreenshot } from './screenshotHelper';

/**
 * Step wrapper:
 * - Adds Playwright step (for report)
 * - Logs start/end
 * - Measures duration
 * - Captures screenshot on failure
 * - Attaches screenshot to report
 */
export async function step(stepName: string,page: Page,action: () => Promise<void>) {
  await test.step(stepName, async () => {
    const start = Date.now();

    logger.info(`START: ${stepName}`);

    try {
      await action();
      logger.info(`END: ${stepName} (${Date.now() - start}ms)`);
    } catch (error) {
      logger.error(`FAILED: ${stepName}`);
      const filePath = await captureScreenshot(page, stepName);
      // Attach screenshot to Playwright report
      if (filePath) {
        await test.info().attach('Screenshot', {path: filePath,contentType: 'image/png',});
      }
      throw error;
    }
  });
}