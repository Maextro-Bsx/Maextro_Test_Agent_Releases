import { defineConfig } from '@playwright/test';

// Generate unique report folder per run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const baseReportsPath = process.env.USER_DATA_PATH || process.cwd();
export default defineConfig({
  testDir: './tests',

  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 1 : 0,

  timeout: 480000,
  expect: { timeout: 10000 },

  reporter: [
    ['html', { 
      outputFolder: `${baseReportsPath}/reports/report-${timestamp}`, 
      open: 'never' 
    }],
  ],
  use: {
    // headless: process.env.CI ? true : false,
    headless: false,
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        viewport: null,
        launchOptions: {
          args: ['--start-maximized', '--start-fullscreen'],
        },
      },
    },
  ],
});