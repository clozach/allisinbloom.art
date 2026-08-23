import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    trace: 'on-first-retry',
    // Reduce flake in visuals
    colorScheme: 'light',
  },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 120 * 1000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      // Phone project for the signature nav only: a real touch device profile
      // (hasTouch, coarse pointer, no hover). Runs in the installed chromium —
      // iPhone 13 defaults to webkit, which is not installed here.
      name: 'iphone',
      testMatch: /sig-nav\.spec\.ts$/,
      use: { ...devices['iPhone 13'], browserName: 'chromium' }
    }
  ]
});
