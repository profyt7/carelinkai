/**
 * Crawler surface guards: the sitemap must enumerate the public SEO routes
 * (Education Hub + every Senior Care Guide + Cleveland landing pages + search),
 * and robots must allow public crawling + point at the sitemap. Also keeps the
 * sitemap in sync as guides are added.
 */

import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { GUIDES } from '@/app/learn/guides/content';

const SITE = 'https://getcarelinkai.com';

describe('sitemap', () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it('includes the homepage, the Education Hub, public search, and Cleveland landing pages', () => {
    for (const path of ['/', '/learn', '/search', '/cleveland', '/cleveland/assisted-living', '/cleveland/memory-care']) {
      expect(urls).toContain(`${SITE}${path}`);
    }
  });

  it('lists every Senior Care Guide', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(15);
    for (const g of GUIDES) {
      expect(urls).toContain(`${SITE}/learn/guides/${g.slug}`);
    }
  });

  it('uses absolute https URLs with no duplicates', () => {
    expect(urls.every((u) => u.startsWith('https://'))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe('robots', () => {
  const r = robots();
  const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;

  it('allows crawling and points at the sitemap', () => {
    expect(rule?.allow).toBe('/');
    expect(r.sitemap).toBe(`${SITE}/sitemap.xml`);
  });

  it('keeps private/app areas out of the index but NOT the public SEO routes', () => {
    const disallow = ([] as string[]).concat((rule?.disallow as any) ?? []);
    for (const p of ['/admin/', '/api/', '/auth/']) expect(disallow).toContain(p);
    // Public SEO routes must not be disallowed.
    for (const pub of ['/learn', '/cleveland', '/search']) {
      expect(disallow.some((d) => pub === d || pub.startsWith(d))).toBe(false);
    }
  });
});
