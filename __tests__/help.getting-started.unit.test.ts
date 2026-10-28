import fs from 'fs';
import path from 'path';
import { ROLE_GUIDES } from '@/lib/help/getting-started';

/**
 * Guards the /help "Getting Started" checklists: every step href must resolve
 * to a real app route. This catches the class of bug where a link pointed at
 * a non-existent path (e.g. /marketplace/aides) or a role-gated portal a user
 * can't reach (e.g. a FAMILY step pointing at /discharge-planner).
 */

const APP_DIR = path.join(process.cwd(), 'src', 'app');

/** True if `src/app/<pathname>/page.tsx` (or .ts/.jsx/.js) exists. */
function routeExists(pathname: string): boolean {
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const dir = path.join(APP_DIR, ...segments);
  return ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some((f) =>
    fs.existsSync(path.join(dir, f))
  );
}

const allSteps = Object.entries(ROLE_GUIDES).flatMap(([role, guide]) =>
  guide.steps.map((step) => ({ role, ...step }))
);

describe('help /getting-started link targets', () => {
  it.each(allSteps)('$role → "$label" ($href) resolves to a real route', ({ href }) => {
    const pathname = href.split(/[?#]/)[0];
    expect(routeExists(pathname)).toBe(true);
  });

  it('covers every primary customer-facing role', () => {
    for (const role of ['FAMILY', 'OPERATOR', 'CAREGIVER', 'PROVIDER', 'DISCHARGE_PLANNER']) {
      expect(ROLE_GUIDES[role]).toBeDefined();
      expect(ROLE_GUIDES[role].steps.length).toBeGreaterThan(0);
    }
  });

  it('never points a FAMILY step at a role-gated portal', () => {
    const gated = ['/operator', '/discharge-planner', '/caregiver', '/affiliate', '/admin'];
    for (const step of ROLE_GUIDES.FAMILY.steps) {
      const pathname = step.href.split(/[?#]/)[0];
      expect(gated.some((g) => pathname === g || pathname.startsWith(g + '/'))).toBe(false);
    }
  });
});
