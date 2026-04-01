import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Capture screenshot with safe name + timestamp
 * Returns file path (for report attachment)
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
    console.log(`[INFO] Screenshot saved: ${filePath}`);
    return filePath;
  } catch (err) {
    console.warn(`[WARN] Failed to capture screenshot: ${err}`);
    return null;
  }
}