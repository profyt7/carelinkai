/**
 * ProductTour assets live in /public/demo/, but "demo" is also an app route (/demo), so the
 * middleware would send /demo/01.png through auth (login redirect). Flat image / JSON files under
 * /demo/ pass; the /demo page and anything routed under it are still gated.
 */
import { NextRequest } from 'next/server';
import middleware from '@/middleware';

const run = (p: string) => middleware(new NextRequest(`http://localhost${p}`) as any, {} as any) as Promise<Response> | Response;
const passes = (r: Response) => r.headers.get('x-middleware-next') === '1';

it.each(['/demo/tour.json', '/demo/01-search.png', '/demo/02.webp', '/demo/a.JPG'])('%s passes straight through', async (p) => {
  expect(passes(await run(p))).toBe(true);
});

it.each(['/demo/nested/x.png', '/demo/x.html', '/demo/admin'])('%s is not bypassed', async (p) => {
  expect(passes(await run(p))).toBe(false);
});
