/**
 * OL-159 — hub revalidation:
 *  - the purge list covers every /cleveland/* page, the five suburbs, the
 *    agency page, llms.txt and the sitemap; arbitrary paths are refused;
 *  - every static hub page + llms.txt + sitemap re-renders within an hour;
 *  - POST /api/admin/revalidate: 401 without an admin session or the
 *    CRON_SECRET bearer; purges the list (or the allowed subset) and reports
 *    ignored paths.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const revalidatePath = jest.fn();
jest.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
const requireRole = jest.fn();
jest.mock('@/lib/auth-utils', () => ({ requireRole: (...a: unknown[]) => requireRole(...a) }));

import { HUB_REVALIDATE_SECONDS, hubRevalidatePaths, isRevalidatablePath } from '@/lib/seo/revalidate-paths';
import { POST } from '@/app/api/admin/revalidate/route';

const SECRET = 'cron_secret_for_tests';
const root = path.join(__dirname, '..');

describe('hubRevalidatePaths', () => {
  it('covers the hub, every care-type page, the five suburbs, agencies, llms.txt and the sitemap', () => {
    const p = hubRevalidatePaths();
    for (const must of ['/cleveland', '/cleveland/assisted-living', '/cleveland/assisted-living/westlake', '/cleveland/assisted-living/lakewood', '/cleveland/memory-care', '/cleveland/independent-living', '/cleveland/nursing-homes', '/cleveland/home-care-agencies', '/llms.txt', '/sitemap.xml']) {
      expect(p).toContain(must);
    }
    expect(isRevalidatablePath('/homes/cmql0xbp9000gr7jcpmm4c9ps')).toBe(true);
    expect(isRevalidatablePath('/admin')).toBe(false);
    expect(isRevalidatablePath('/homes/../etc')).toBe(false);
  });
  it('every static hub page + llms.txt + sitemap revalidates within an hour', () => {
    expect(HUB_REVALIDATE_SECONDS).toBeLessThanOrEqual(3600);
    for (const f of ['src/app/cleveland/page.tsx', 'src/app/cleveland/memory-care/page.tsx', 'src/app/cleveland/independent-living/page.tsx', 'src/app/cleveland/nursing-homes/page.tsx', 'src/app/llms.txt/route.ts', 'src/app/sitemap.ts']) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      const m = /export const revalidate = (\d+);/.exec(src);
      expect({ file: f, revalidate: m ? Number(m[1]) : null }).toEqual({ file: f, revalidate: expect.any(Number) });
      expect(Number(m![1])).toBeLessThanOrEqual(3600);
    }
    // The listing pages are rendered per request (never cached).
    for (const f of ['src/app/cleveland/assisted-living/page.tsx', 'src/app/cleveland/assisted-living/[suburb]/page.tsx']) {
      expect(fs.readFileSync(path.join(root, f), 'utf8')).toContain("export const dynamic = 'force-dynamic'");
    }
  });
});

describe('POST /api/admin/revalidate', () => {
  const ORIGINAL = process.env['CRON_SECRET'];
  beforeEach(() => { jest.clearAllMocks(); process.env['CRON_SECRET'] = SECRET; requireRole.mockRejectedValue(new Error('no session')); });
  afterAll(() => { if (ORIGINAL === undefined) delete process.env['CRON_SECRET']; else process.env['CRON_SECRET'] = ORIGINAL; });
  const post = (headers: Record<string, string>, body?: unknown) =>
    POST(new NextRequest('http://localhost/api/admin/revalidate', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? '{}' : JSON.stringify(body) }));

  it('401 without an admin session or the cron bearer; nothing purged', async () => {
    expect((await post({})).status).toBe(401);
    expect((await post({ authorization: 'Bearer wrong' })).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it('cron bearer → purges every hub path', async () => {
    const res = await post({ authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.by).toBe('cron');
    expect(j.revalidated).toEqual(hubRevalidatePaths());
    expect(revalidatePath).toHaveBeenCalledTimes(hubRevalidatePaths().length);
    expect(revalidatePath).toHaveBeenCalledWith('/cleveland/assisted-living');
  });
  it('admin session → purges only the allowed subset; unknown paths reported as ignored', async () => {
    requireRole.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
    const res = await post({}, { paths: ['/cleveland', '/homes/abc123', '/admin/secret', 'https://evil'] });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ by: 'admin', revalidated: ['/cleveland', '/homes/abc123'], ignored: ['/admin/secret', 'https://evil'] });
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });
});
