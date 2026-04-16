import { Page, test } from '@playwright/test';
import { logger } from './logger';
import { captureScreenshot } from './screenshotHelper';

/**
 * Wraps a Playwright test step with logging, execution timing, and failure handling.
 *
 * This utility enhances test readability and debugging by:
 * - Logging step start and end
 * - Measuring execution time for each step
 * - Capturing screenshots on failure
 * - Attaching screenshots to Playwright test reports
 * - Re-throwing errors to ensure test failure is preserved
 *
 * Steps:
 * 1. Executes the given step inside `test.step` for Playwright reporting.
 * 2. Logs the start of the step with its name.
 * 3. Measures execution time using a timestamp.
 * 4. Executes the provided async action.
 * 5. On success, logs completion and duration.
 * 6. On failure:
 *    - Logs failure message
 *    - Captures a screenshot of the current page state
 *    - Attaches screenshot to Playwright test report
 *    - Re-throws the error to fail the test
 *
 * @param stepName Name/description of the test step.
 * @param page Playwright Page instance used for screenshot capture.
 * @param action Async function representing the test step logic.
 *
 * @returns Promise<void>
 *
 * Example:
 * await step('Login to application', page, async () => {
 *   await loginPage.login('user', 'pass');
 * });
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
      if (filePath) {
        await test.info().attach('Screenshot', {path: filePath,contentType: 'image/png',});
      }
      throw error;
    }
  });
}