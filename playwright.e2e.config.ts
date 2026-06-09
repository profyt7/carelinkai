import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the `e2e/` directory.
 *
 * The default playwright.config.ts uses `testDir: './tests'`, so specs that live
 * under `./e2e/` are never discovered by it (a bare `playwright test e2e/foo.spec.ts`
 * matches nothing). This config points testDir at `./e2e` so those specs actually
 * run. Used by the `e2e-operator-claim` CI job.
 *
 * Timeouts are intentionally generous: the webServer runs `npm run dev`, so the
 * first navigation to each route pays an on-demand compilation cost.
 */
export default defineConfig({
  testDir: './e2e',

  timeout: 120 * 1000,
  expect: { timeout: 15000 },

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,

  reporter: [['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60000,
    actionTimeout: 20000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
