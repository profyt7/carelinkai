/**
 * @jest-environment jsdom
 *
 * Pre-launch polish 2. These fail if:
 *   1. homepage / meta / OG / JSON-LD / /cleveland copy claims availability is already confirmed
 *      ("each week", "confirmed by the home", "open beds confirmed", "real-time" beds);
 *   2. the homepage header can wrap at 390 (CTA wraps, menu button under 44px, fixed-width logo);
 *   3. more than one floating support control is mounted, or the launcher stops stepping aside
 *      over links, buttons, fields and headings;
 *   4/5. (API: provider-search-and.unit.test.ts) the "Rating" sort comes back in the page, or cards
 *      show stars before a provider has a real review;
 *   6. a long provider name can run under the favourite heart.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';

import ProviderCard from '@/components/marketplace/ProviderCard';
import { overlapsPrimaryContent, SUPPORT_AVOID_SELECTOR } from '@/components/support/SupportDock';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('1. copy says what is true today', () => {
  const files = [
    'src/app/HomePageClient.tsx',
    'src/app/page.tsx',
    'src/lib/seo/page-meta.ts',
    'src/lib/seo/jsonld.ts',
    'src/lib/directory/suburbs.ts',
    'src/app/cleveland/assisted-living/opengraph-image.tsx',
    'src/app/cleveland/assisted-living/twitter-image.tsx',
    'src/app/cleveland/assisted-living/[suburb]/opengraph-image.tsx',
    'src/app/cleveland/assisted-living/[suburb]/twitter-image.tsx',
  ];
  it.each(files)('%s has no "already confirmed" overclaim', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/each week|every week|this week|confirmed by (the|each) home|open beds confirmed|beds confirmed with|availability confirmed\.|real-time bed|Real-Time Availability|beds available right now|Verified Cleveland/i);
  });

  it('the hero says it as it is: confirming, and showing what is verified and when', () => {
    const home = read('src/app/HomePageClient.tsx');
    expect(home).toContain('We&apos;re confirming open beds, starting prices and Medicaid waiver status directly with Greater Cleveland communities, and we show you exactly what&apos;s verified and when.');
    expect(home).toContain('Cleveland senior living, honestly labeled.');
  });
});

describe('2. homepage header is one row at 390', () => {
  const home = read('src/app/HomePageClient.tsx');
  const header = home.slice(home.indexOf('data-testid="home-header-row"'), home.indexOf('{/* Mobile menu panel */}'));
  it('logo shrinks below sm; CTA never wraps; menu button is a 44px target that never shrinks', () => {
    expect(header).toContain('relative h-12 w-40 sm:h-16 sm:w-64');
    expect(header).toMatch(/className="whitespace-nowrap [^"]*px-3 py-2\.5 sm:px-5/);
    expect(header).toContain('lg:hidden flex h-11 w-11 shrink-0 items-center justify-center');
    expect(header).toContain('flex shrink-0 items-center gap-2 sm:gap-3');
  });
});

describe('3. one floating support control, and it steps aside', () => {
  it('the root layout mounts SupportDock only; the old floating buttons are gone', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toContain('<SupportDock />');
    expect(layout).not.toMatch(/<CareConcierge|<BugReportButton/);
    expect(fs.existsSync(path.join(process.cwd(), 'src/components/bug-report/BugReportButton.tsx'))).toBe(false);
    expect(read('src/components/CareConcierge.tsx')).not.toContain('data-floating-widget');
  });

  const dock = () => { const d = document.createElement('div'); document.body.appendChild(d); return d; };
  const rect = { left: 300, right: 348, top: 760, bottom: 808, width: 48, height: 48, x: 300, y: 760 } as DOMRect;
  const withUnder = (el: Element, self: Element) => ({ elementsFromPoint: () => [self, el] } as unknown as Document);

  it.each([
    ['a link', () => Object.assign(document.createElement('a'), { href: '/x' })],
    ['a button label span', () => { const b = document.createElement('button'); const s = document.createElement('span'); b.appendChild(s); return s; }],
    ['an input', () => document.createElement('input')],
    ['a heading', () => document.createElement('h2')],
    ['a [data-support-avoid] region', () => { const d = document.createElement('div'); d.setAttribute('data-support-avoid', ''); return d; }],
    ['text inside a labelled region (inquiry panel)', () => { const r = document.createElement('div'); r.setAttribute('role', 'region'); const p = document.createElement('p'); r.appendChild(p); return p; }],
  ])('yields over %s', (_n, make) => {
    const self = dock();
    expect(overlapsPrimaryContent(rect, self, withUnder(make(), self))).toBe(true);
  });

  it('stays over plain background and never counts itself', () => {
    const self = dock();
    expect(overlapsPrimaryContent(rect, self, withUnder(document.createElement('div'), self))).toBe(false);
    const inner = document.createElement('button');
    self.appendChild(inner);
    expect(overlapsPrimaryContent(rect, self, { elementsFromPoint: () => [inner, self] } as unknown as Document)).toBe(false);
    expect(SUPPORT_AVOID_SELECTOR).toContain('button');
  });
});

describe('5. sort options on the page', () => {
  it('the page offers no Rating sort and defaults to verified-first', () => {
    const page = read('src/app/marketplace/providers/page.tsx');
    expect(page).not.toMatch(/Rating: High to Low|"ratingDesc"/);
    expect(page).toContain('<option value="verified">Verified first, then name</option>');
    expect(page).toContain('useState<"verified" | "rateAsc" | "rateDesc" | "distanceAsc" | "recency">("verified")');
  });
});

describe('5/6. provider card', () => {
  const base = { id: 'p1', businessName: 'Greater Cleveland Comprehensive Home Health and Rehabilitation Services Cooperative', bio: null, city: 'Cleveland', state: 'OH', serviceTypes: ['home-health'], yearsInBusiness: 2, isVerified: false };

  it('no stars or "0.0 (0)" until there is a real review', () => {
    const { container, rerender } = render(<ProviderCard provider={{ ...base, ratingAverage: 0, reviewCount: 0 }} />);
    expect(screen.queryByTestId('provider-rating')).toBeNull();
    expect(container.textContent).not.toMatch(/0\.0 \(0\)/);
    rerender(<ProviderCard provider={{ ...base, ratingAverage: 4.33, reviewCount: 3 }} />);
    expect(screen.getByTestId('provider-rating').textContent).toContain('4.3 (3)');
  });

  it('the name keeps clear of the heart and carries its full text as a tooltip', () => {
    render(<ProviderCard provider={base} onToggleFavorite={() => undefined} />);
    const h = screen.getByRole('heading', { level: 3 });
    expect(h.getAttribute('title')).toBe(base.businessName);
    expect(h.className).toContain('line-clamp-2');
    expect(h.parentElement!.className).toContain('min-w-0');
    expect(h.parentElement!.parentElement!.className).toContain('pr-10');
  });
});
