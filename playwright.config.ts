import { defineConfig, devices } from '@playwright/test';

// Resolve baseURL and whether it's a remote (non-local) target
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000';
const isRemoteTarget = (() => {
  try {
    const u = new URL(baseURL);
    const host = u.hostname || '';
    return !/^(localhost|127\.0\.0\.1)$/i.test(host);
  } catch {
    return false;
  }
})();

// Loosen project typing to avoid Next.js type-checker conflicts during app build
const projects: any[] = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
];

// Only include the non-bypass credentials project for local/dev runs, not in CI
// Also useful for staging/remote runs to ensure no bypass headers are sent.
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

// For local runs, optionally run against built server to improve stability
const webCommand = process.env['PW_USE_START'] === '1'
  ? 'npm run start:e2e'
  : (process.env['PLAYWRIGHT_WEB_SERVER_CMD'] ||
     'cross-env NEXTAUTH_URL=http://localhost:3000 NEXTAUTH_SECRET=devsecret ALLOW_DEV_ENDPOINTS=1 ALLOW_INSECURE_AUTH_COOKIE=1 DATABASE_URL=postgresql://postgres:postgres@localhost:5434/carelinkai_marketplace?schema=public npm run dev');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : 1,
  reporter: 'list',
  use: {
    baseURL,
    extraHTTPHeaders: { 'x-e2e-bypass': '1' },
    trace: process.env['CI'] ? 'retain-on-failure' : 'on-first-retry',
    screenshot: process.env['CI'] ? 'only-on-failure' : 'only-on-failure',
    video: process.env['CI'] ? 'retain-on-failure' : 'retain-on-failure',
  },
  projects,
  // If targeting a remote/staging URL, do NOT start a local dev server.
  webServer: isRemoteTarget ? undefined : {
    command: webCommand,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
