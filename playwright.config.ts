import { defineConfig, devices } from '@playwright/test'

// Allow overriding the base URL and server-launch behaviour via env vars
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000'
const webServer =
  process.env.PLAYWRIGHT_WEB_SERVER === 'false'
    ? undefined
    : {
        command: 'npx next start -p 5001',
        port: 5001,
        reuseExistingServer: true,
        timeout: 120000,
      }

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  ...(webServer ? { webServer } : {}),
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
