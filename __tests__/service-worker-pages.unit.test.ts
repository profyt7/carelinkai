/**
 * public/sw.js: page navigations (HTML) always come from the network — never from a cache, which can hold
 * a weeks-old build (11/2026: the hub footer flipped to a pre-move build). Offline → /offline.html.
 * Cache names are v3, so `activate` deletes every v2 cache (and the stale pages in it). '/' is not pre-cached.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

function loadSw(fetchImpl: (req: any) => Promise<any>) {
  const listeners: Record<string, (e: any) => void> = {};
  const deleted: string[] = [];
  const put = jest.fn();
  const matched: string[] = [];
  const caches = {
    keys: async () => ['carelink-pages-v2', 'carelink-static-v2', 'carelink-pages-v3'],
    delete: async (n: string) => { deleted.push(n); return true; },
    open: async () => ({ put, addAll: jest.fn(async () => undefined), keys: async () => [] }),
    match: async (r: any) => { matched.push(typeof r === 'string' ? r : r.url); return { offline: true }; },
  };
  const self: any = { location: { origin: 'https://getcarelinkai.com' }, addEventListener: (t: string, f: any) => { listeners[t] = f; }, clients: { claim: async () => undefined }, skipWaiting: async () => undefined, registration: {} };
  const src = fs.readFileSync(path.join(process.cwd(), 'public/sw.js'), 'utf8');
  vm.runInNewContext(src, { self, caches, fetch: fetchImpl, console: { log() {}, error() {}, warn() {} }, URL, Response: class { constructor(public body: unknown, public init: unknown) {} }, Date, Promise, setTimeout, clearTimeout });
  return { listeners, deleted, put, matched, src };
}

const nav = (url: string) => ({ url, method: 'GET', mode: 'navigate', headers: { get: (h: string) => (h === 'Accept' ? 'text/html' : null) }, clone() { return this; } });

async function respond(listeners: Record<string, (e: any) => void>, req: any) {
  let p: Promise<any> | undefined;
  listeners['fetch']({ request: req, respondWith: (x: Promise<any>) => { p = x; } });
  return p ? await p : undefined;
}

it('a page navigation is served from the network and not stored', async () => {
  const fresh = { fresh: true, clone() { return this; } };
  const { listeners, put, matched } = loadSw(async () => fresh);
  expect(await respond(listeners, nav('https://getcarelinkai.com/cleveland/assisted-living'))).toBe(fresh);
  expect(put).not.toHaveBeenCalled();
  expect(matched).toEqual([]); // no cache lookup for pages
});

it('offline navigation → the offline page, never a cached copy of the page', async () => {
  const { listeners, matched } = loadSw(async () => { throw new TypeError('offline'); });
  expect(await respond(listeners, nav('https://getcarelinkai.com/search'))).toEqual({ offline: true });
  expect(matched).toEqual(['/offline.html']);
});

it('activate deletes the v2 caches (stale pages from older builds); "/" is not pre-cached', async () => {
  const { listeners, deleted, src } = loadSw(async () => ({}));
  let p: Promise<unknown> | undefined;
  listeners['activate']({ waitUntil: (x: Promise<unknown>) => { p = x; } });
  await p;
  expect(deleted.sort()).toEqual(['carelink-pages-v2', 'carelink-static-v2']);
  const core = src.slice(src.indexOf('const CORE_ASSETS'), src.indexOf('];', src.indexOf('const CORE_ASSETS')));
  expect(core).not.toMatch(/^\s*'\/',/m);
});
