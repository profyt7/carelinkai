import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000',
    extraHTTPHeaders: { 'x-e2e-bypass': '1' },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env['PLAYWRIGHT_WEB_SERVER_CMD'] || 'cross-env NEXT_PUBLIC_E2E_AUTH_BYPASS=1 npm run dev',
    url: process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
