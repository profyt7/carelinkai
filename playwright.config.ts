import { defineConfig, devices } from '@playwright/test';

// Loosen project typing to avoid Next.js type-checker conflicts during app build
const projects: any[] = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
];

// Only include the non-bypass credentials project for local/dev runs, not in CI
if (!process.env['CI']) {
  projects.push({
    name: 'chromium-no-bypass',
    use: ({
      ...devices['Desktop Chrome'],
      // Override default bypass header in this project
      extraHTTPHeaders: {},
    } as any),
    grep: /\[non-bypass\]/,
  } as any);
}

// For non-bypass (local only), optionally run against built server to improve stability
const webCommand = process.env['PW_USE_START'] === '1'
  ? 'npm run start:e2e'
  : (process.env['PLAYWRIGHT_WEB_SERVER_CMD'] ||
     'cross-env NEXTAUTH_URL=http://localhost:3000 NEXTAUTH_SECRET=devsecret DATABASE_URL=postgresql://postgres:postgres@localhost:5434/carelinkai_marketplace?schema=public npm run dev');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : 1,
  reporter: 'list',
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000',
    extraHTTPHeaders: { 'x-e2e-bypass': '1' },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects,
  webServer: {
    command: webCommand,
    url: process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
