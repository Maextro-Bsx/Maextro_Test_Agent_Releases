import { defineConfig } from '@playwright/test';

// Generate unique report folder per run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  timeout: 240000,
  expect: { timeout: 10000 },

  reporter: [
    ['html', { outputFolder: `reports/report-${timestamp}`, open: 'on-failure' }]
  ],

  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        viewport: null,
        launchOptions: {
          headless: false,
          args: ['--start-maximized'],
        },
      },
    },
  ],
});