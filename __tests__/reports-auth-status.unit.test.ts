/**
 * /api/reports/*: a caller without the report permission (e.g. a FAMILY account)
 * got 500 "Access denied…" because each route's catch-all turned the
 * UnauthorizedError from requireAnyPermission into a server error (found by the
 * production probe: family POST /api/reports/generate → 500). Refusals now map
 * to 401 / 403 through the existing handleAuthError.
 */
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

let mode: 'anon' | 'family' = 'family';
jest.mock('@/lib/auth-utils', () => {
  const actual = jest.requireActual('@/lib/auth-utils');
  return {
    ...actual,
    requireAuth: async () => {
      if (mode === 'anon') throw new actual.UnauthenticatedError();
      return { id: 'fam1', role: 'FAMILY' };
    },
    requireAnyPermission: async (perms: string[]) => {
      if (mode === 'anon') throw new actual.UnauthenticatedError();
      throw new actual.UnauthorizedError(`Access denied. Required permissions: ${perms.join(' or ')}`);
    },
  };
});
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn() }));
jest.mock('@/lib/services/reports', () => ({ generateReport: jest.fn() }));
jest.mock('@/lib/utils/pdf-generator', () => ({ generatePDF: jest.fn() }));
jest.mock('@/lib/utils/excel-generator', () => ({ generateExcel: jest.fn() }));
jest.mock('@/lib/utils/csv-generator', () => ({ generateCSV: jest.fn() }));

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/reports/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('POST /api/reports/generate refusals', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

  it('FAMILY (no report permission) → 403, not 500', async () => {
    mode = 'family';
    const { POST } = await import('@/app/api/reports/generate/route');
    const res = await POST(post({ type: 'RESIDENT_CENSUS', title: 't', format: 'CSV', homeIds: [] }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Access denied/);
  });

  it('not signed in → 401', async () => {
    mode = 'anon';
    const { POST } = await import('@/app/api/reports/generate/route');
    const res = await POST(post({ type: 'RESIDENT_CENSUS', title: 't' }));
    expect(res.status).toBe(401);
  });
});

describe('every permission-gated API route maps auth errors to 401/403', () => {
  const ROOT = path.join(__dirname, '..');
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? walk(p) : e.name === 'route.ts' ? [p] : [];
    });
  const gated = walk(path.join(ROOT, 'src/app/api')).filter((f) =>
    /require(Any|All)?Permission(s)?\(/.test(fs.readFileSync(f, 'utf8')),
  );

  it('finds the gated routes', () => expect(gated.length).toBeGreaterThan(10));

  it.each(gated.map((f) => [path.relative(ROOT, f), f]))('%s', (_rel, f) => {
    const src = fs.readFileSync(f as string, 'utf8');
    expect(/handleAuthError|instanceof Unauth/.test(src)).toBe(true);
  });
});
