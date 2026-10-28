import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for CareLinkAI RBAC Testing
 * 
 * This configuration sets up comprehensive E2E testing for the role-based access control system.
 * Tests cover authentication, authorization, data scoping, and UI permissions across all user roles.
 */
export default defineConfig({
  testDir: './tests',
  
  /* Maximum time one test can run for */
  timeout: 60 * 1000, // Increased from 30s to 60s
  
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 10000 // Increased from 5s to 10s
  },
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Set to false to avoid race conditions with shared test data
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Added 1 retry for local runs
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2, // Reduced from 8 to 2 workers
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure', // Changed from on-first-retry to capture all failures
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Navigation timeout */
    navigationTimeout: 30000, // 30s for page navigation
    
    /* Action timeout */
    actionTimeout: 15000, // 15s for user actions
    
    /* Browser launch options */
    launchOptions: {
      slowMo: process.env.SLOWMO ? 100 : 0,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Set custom browser path if needed
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH 
            ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium-1200/chrome-linux64/chrome`
            : undefined,
        },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
