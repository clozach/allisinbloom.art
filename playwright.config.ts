import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** .env holds the local owner credentials for poem editing; CI sets them in its environment. */
function dotenv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync('.env', 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
    );
  } catch {
    return {};
  }
}
const env = { ...dotenv(), ...process.env };
const credentials =
  env.POEM_EDIT_USER && env.POEM_EDIT_PASSWORD
    ? { username: env.POEM_EDIT_USER, password: env.POEM_EDIT_PASSWORD }
    : undefined;

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
    // The editor's cases sign in as the owner; the site asks for Basic credentials on ⌥⌘E.
    httpCredentials: credentials,
  },
  webServer: process.env.BASE_URL ? undefined : {
    command: 'pnpm dev --host 127.0.0.1 --port 5211 --strictPort',
    env: credentials ? { POEM_EDIT_USER: credentials.username, POEM_EDIT_PASSWORD: credentials.password } : {},
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
      testMatch: /(?:pipeline|private-poems|inline-edit)\.spec\.ts/,
      use: { ...devices['iPhone 13'] }
    }
  ]
});
