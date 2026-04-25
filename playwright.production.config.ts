import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Production Smoke Test Config
 *
 * Runs tests/smoke.spec.ts against the live production environment.
 * Does NOT start a dev server — tests run against getcarelinkai.com directly.
 *
 * Usage:
 *   npm run test:e2e:prod
 *   PROD_URL=https://staging.example.com npm run test:e2e:prod
 *
 * Requirements:
 *   - Demo accounts must be seeded in production (see context/CARELINKAI_TECH_OPEN_LOOPS.md OL-001)
 *   - Playwright browsers must be installed: npx playwright install chromium
 */
export default defineConfig({
  testDir: './tests',
  testMatch: ['**/smoke.spec.ts'],

  timeout: 90 * 1000,

  expect: {
    timeout: 15000,
  },

  fullyParallel: false,
  forbidOnly: true,

  // More retries for production — network latency can cause flakiness
  retries: 2,

  // Sequential — avoids hammering production with concurrent logins
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report-prod', open: 'never' }],
    ['json', { outputFile: 'test-results/prod-results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PROD_URL || 'https://getcarelinkai.com',

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Longer timeouts for production (real network round-trips)
    navigationTimeout: 45000,
    actionTimeout: 20000,
  },

  projects: [
    {
      name: 'chromium-prod',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH
            ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium-1200/chrome-linux64/chrome`
            : undefined,
        },
      },
    },
  ],

  // No webServer — tests run against live production
});
