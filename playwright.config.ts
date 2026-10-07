import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5211',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    trace: 'on-first-retry',
    // Reduce flake in visuals
    colorScheme: 'light',
  },
  webServer: process.env.BASE_URL ? undefined : {
    command: 'pnpm dev --host 127.0.0.1 --port 5211 --strictPort',
    url: 'http://127.0.0.1:5211',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'iphone-webkit',
      testMatch: /(?:pipeline|private-poems)\.spec\.ts/,
      use: { ...devices['iPhone 13'] }
    }
  ]
});
