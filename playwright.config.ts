import { defineConfig } from '@playwright/test';

// Generate unique report folder per run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 1 : 0,

  workers: process.env.CI ? 1 : undefined,

  timeout: 480000,
  expect: { timeout: 10000 },

  reporter: [
    // ['html', { outputFolder: `reports/report-${timestamp}`, open: 'on-failure' }]
    ['html', { outputFolder: `reports/report-${timestamp}`, open: 'never' }],
  ],

  // outputDir: `reports/report-${timestamp}/test-results`,

  use: {
    headless: process.env.CI ? true : false,
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
          args: process.env.CI ? [] : ['--start-maximized'],
        },
      },
    },
  ],
});