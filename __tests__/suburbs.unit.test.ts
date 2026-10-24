/**
 * Sprint W3 item 3 — suburb registry guards: unique slugs / titles / H1s /
 * descriptions, lookup is case-insensitive and fail-closed, every suburb is
 * in the sitemap and classified public.
 */

import { SUBURBS, findSuburb, suburbPath } from '@/lib/directory/suburbs';
import sitemap from '@/app/sitemap';
import { isKnownAppPath, isPublicPage } from '@/lib/routing/public-routes';

describe('SUBURBS registry', () => {
  it('ships the original five Cuyahoga suburbs first, then the OL-172 ten (next ten by roster count), then the five east-side additions', () => {
    expect(SUBURBS.map((s) => s.slug)).toEqual([
      'westlake', 'strongsville', 'parma', 'beachwood', 'lakewood',
      'mentor', 'cuyahoga-falls', 'rocky-river', 'medina', 'hudson', 'north-olmsted', 'avon', 'twinsburg', 'chardon', 'stow',
      'lyndhurst', 'mayfield-heights', 'shaker-heights', 'euclid', 'solon',
    ]);
  });

  it('has unique slugs, titles, H1s and meta descriptions (≤ 160 chars)', () => {
    for (const key of ['slug', 'title', 'h1', 'description'] as const) {
      const values = SUBURBS.map((s) => s[key]);
      expect(new Set(values).size).toBe(values.length);
    }
    for (const s of SUBURBS) {
      expect(s.description.length).toBeLessThanOrEqual(160);
      expect(s.title).toContain(s.name);
      expect(s.h1).toBe(`Assisted Living in ${s.name}, OH`);
      expect(s.cities.length).toBeGreaterThan(0);
      expect(s.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('findSuburb is case-insensitive and fail-closed', () => {
    expect(findSuburb('Parma')?.slug).toBe('parma');
    expect(findSuburb('westlake')?.cities).toEqual(['Westlake']);
    expect(findSuburb('nowhere')).toBeNull();
    expect(findSuburb('')).toBeNull();
    expect(findSuburb(undefined)).toBeNull();
  });

  it('every suburb page is in the sitemap and public', () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    for (const s of SUBURBS) {
      const p = suburbPath(s);
      expect(urls).toContain(p);
      expect(isPublicPage(p)).toBe(true);
      expect(isKnownAppPath(p)).toBe(true);
    }
  });
});
