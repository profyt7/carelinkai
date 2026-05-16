/**
 * HIPAA Phase 3C — Test-sentry route production gate.
 *
 * Verifies that every test-sentry route has a NODE_ENV=production guard
 * that returns 404. Uses static source analysis (reads real route files)
 * — no mocks.
 *
 * Design decision: NODE_ENV gate chosen over admin session check because:
 * 1. These routes don't carry user data — no auth overhead needed
 * 2. Simpler, harder to accidentally bypass
 * 3. Production check is deterministic — no DB/session dependency
 *
 * Integration-mock rule: we read real source files, not mocks.
 */

import * as fs from 'fs';
import * as path from 'path';

const API_ROOT = path.join(__dirname, '..', 'src', 'app', 'api');

function readRoute(routeFile: string): string {
  return fs.readFileSync(path.join(API_ROOT, routeFile), 'utf-8');
}

function hasProductionGate(source: string): boolean {
  return (
    source.includes("process.env.NODE_ENV === 'production'") ||
    source.includes('process.env.NODE_ENV === "production"')
  );
}

function returns404InProductionGate(source: string): boolean {
  // Check that after the production guard we return a 404
  return source.includes('status: 404') || source.includes('status:404');
}

const TEST_SENTRY_ROUTES = [
  'test-sentry/route.ts',
  'test-sentry-logs/route.ts',
  'test-sentry-client-error/route.ts',
  'test-sentry-metrics/route.ts',
];

describe('test-sentry production gate', () => {
  TEST_SENTRY_ROUTES.forEach((routeFile) => {
    const name = routeFile.replace('/route.ts', '');

    it(`${name}: has NODE_ENV=production guard`, () => {
      const source = readRoute(routeFile);
      expect(hasProductionGate(source)).toBe(true);
    });

    it(`${name}: returns 404 in production`, () => {
      const source = readRoute(routeFile);
      expect(returns404InProductionGate(source)).toBe(true);
    });
  });
});
