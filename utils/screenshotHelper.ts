import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

/**
 * Captures a full-page screenshot using Playwright and saves it to disk.
 *
 * This utility function is used for debugging, reporting, and test failure analysis.
 *
 * Steps:
 * 1. Ensure the screenshots directory exists (creates it if missing).
 * 2. Sanitize the screenshot name to make it file-system safe.
 * 3. Generate a timestamped filename to avoid overwriting existing files.
 * 4. Capture a full-page screenshot using Playwright.
 * 5. Save the screenshot in PNG format inside the screenshots directory.
 * 6. Log the saved file path on success.
 * 7. Handle and log errors gracefully without breaking execution.
 *
 * @param page Playwright Page instance used for capturing the screenshot.
 * @param name Logical name for the screenshot (used in filename).
 *
 * @returns Promise<string | null>
 *          - Returns file path if screenshot is successfully saved.
 *          - Returns null if screenshot capture fails.
 *
 * Example:
 * const path = await captureScreenshot(page, 'login_failure');
 */
export async function captureScreenshot(page: Page,name: string): Promise<string | null> {
  try {
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    const safeName = name.replace(/[^\w\-]+/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(screenshotsDir,`${safeName}_${timestamp}.png`);
    await page.screenshot({path: filePath,fullPage: true,});
    logger.info(`[INFO] Screenshot saved: ${filePath}`);
    return filePath;
  } catch (err) {
    logger.warn(`[WARN] Failed to capture screenshot: ${err}`);
    return null;
  }
}