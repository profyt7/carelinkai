/**
 * Guards for src/lib/routing/public-routes.ts (middleware route classification).
 *
 *  - KNOWN_APP_SEGMENTS must match the real top-level directories under src/app.
 *    The middleware 404s anything outside the list, so a new route that is not
 *    added here would 404 for everyone (fail-closed) — this test turns that into
 *    a CI failure instead of a production surprise.
 *  - Every URL in src/app/sitemap.ts must be a public page.
 *  - Unknown / probe paths are classified as not-a-page (→ 404, not login).
 */

import fs from 'fs';
import path from 'path';

import {
  KNOWN_APP_SEGMENTS,
  PUBLIC_PAGE_PREFIXES,
  firstSegment,
  isKnownAppPath,
  isPublicPage,
} from '@/lib/routing/public-routes';
import sitemap from '@/app/sitemap';

const APP_DIR = path.join(__dirname, '..', 'src', 'app');

describe('KNOWN_APP_SEGMENTS mirrors src/app', () => {
  it('lists exactly the top-level route directories', () => {
    const onDisk = fs
      .readdirSync(APP_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      // route groups "(group)" and private "_folders" are not URL segments
      .filter((name) => !name.startsWith('(') && !name.startsWith('_'))
      .sort();

    expect([...KNOWN_APP_SEGMENTS].sort()).toEqual(onDisk);
  });

  it('is sorted and free of duplicates', () => {
    const sorted = [...KNOWN_APP_SEGMENTS].sort();
    expect([...KNOWN_APP_SEGMENTS]).toEqual(sorted);
    expect(new Set(KNOWN_APP_SEGMENTS).size).toBe(KNOWN_APP_SEGMENTS.length);
  });
});

describe('sitemap pages are public', () => {
  it('every sitemap URL is classified as a public page', () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(5);
    for (const { url } of entries) {
      const pathname = new URL(url).pathname;
      expect({ pathname, isPublic: isPublicPage(pathname) }).toEqual({ pathname, isPublic: true });
      expect(isKnownAppPath(pathname)).toBe(true);
    }
  });

  it('covers the five Cleveland landing pages explicitly', () => {
    for (const p of [
      '/cleveland',
      '/cleveland/assisted-living',
      '/cleveland/memory-care',
      '/cleveland/independent-living',
      '/cleveland/nursing-homes',
    ]) {
      expect(isPublicPage(p)).toBe(true);
    }
    expect(PUBLIC_PAGE_PREFIXES).toContain('/cleveland');
  });
});

describe('isPublicPage', () => {
  it('matches exact and nested public paths only', () => {
    expect(isPublicPage('/')).toBe(true);
    expect(isPublicPage('/search')).toBe(true);
    expect(isPublicPage('/learn/guides/anything')).toBe(true);
    expect(isPublicPage('/homes/abc123')).toBe(true);
    // prefix must be a whole segment
    expect(isPublicPage('/searchable')).toBe(false);
    expect(isPublicPage('/learning')).toBe(false);
  });

  it('keeps protected areas protected', () => {
    for (const p of ['/operator', '/operator/inquiries', '/admin', '/family', '/settings', '/dashboard', '/messages']) {
      expect(isPublicPage(p)).toBe(false);
      expect(isKnownAppPath(p)).toBe(true);
    }
  });
});

describe('isKnownAppPath (unknown → 404, not login)', () => {
  it('rejects made-up and probe paths', () => {
    for (const p of ['/zzz-nope', '/.env', '/.git/config', '/wp-admin', '/wp-login.php', '/phpinfo.php', '/xmlrpc.php', '/vendor/phpunit']) {
      expect({ p, known: isKnownAppPath(p) }).toEqual({ p, known: false });
    }
  });

  it('accepts the root, real segments and the Sentry tunnel', () => {
    expect(isKnownAppPath('/')).toBe(true);
    expect(isKnownAppPath('/cleveland/memory-care')).toBe(true);
    expect(isKnownAppPath('/monitoring')).toBe(true);
  });

  it('firstSegment handles leading slashes and nesting', () => {
    expect(firstSegment('/')).toBe('');
    expect(firstSegment('/a')).toBe('a');
    expect(firstSegment('/a/b/c')).toBe('a');
    expect(firstSegment('//a')).toBe('a');
  });
});
