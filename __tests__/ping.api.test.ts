/**
 * GET/HEAD /api/ping — the poller endpoint must be dependency-free: no Prisma,
 * no session, 200 JSON {ok:true}, no-store, noindex.
 */

jest.mock('@/lib/prisma', () => {
  throw new Error('/api/ping must not import the Prisma client');
});

import { GET, HEAD } from '@/app/api/ping/route';

describe('/api/ping', () => {
  it('GET returns 200 {ok:true} with no-store + noindex headers', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.uptimeSec).toBe('number');
  });

  it('HEAD returns 200 with an empty body', async () => {
    const res = HEAD();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });
});
