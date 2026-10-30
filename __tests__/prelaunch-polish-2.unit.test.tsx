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
import { chooseMenuSpot, HIDE_DELAY_MS, overlapsPrimaryContent, SHOW_DELAY_MS, SUPPORT_AVOID_SELECTOR } from '@/components/support/SupportDock';
import { isSupportSlotPath } from '@/components/support/support-slot';

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

  it('the hero says it as it is: one labeled-facts headline; the subhead covers in-home and service providers too', () => {
    const home = read('src/app/HomePageClient.tsx');
    const h1 = home.slice(home.indexOf('data-testid="home-hero-headline"'), home.indexOf('</h1>'));
    expect(h1).toContain('Cleveland assisted living, with every fact clearly labeled.');
    expect(h1).not.toMatch(/Verified|Free for families/);
    const sub = home.slice(home.indexOf('data-testid="home-hero-subhead"'), home.indexOf('</p>', home.indexOf('data-testid="home-hero-subhead"')));
    expect(sub).toContain('plus in-home care and service providers for seniors living at home');
    expect(sub).toContain('We&apos;re confirming open beds, starting prices and Medicaid waiver status directly with communities, and we show you exactly what&apos;s verified and when.');
    expect(sub).toContain('Free for families.');
    const meta = read('src/app/page.tsx');
    expect(meta).toContain("'Cleveland Assisted Living, Every Fact Labeled | CareLinkAI'");
    expect(meta).toContain('plus in-home care and service providers');
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

  // jsdom has no layout: give elements a rect and answer elementsFromPoint with the topmost element.
  const place = (el: Element, r: { left: number; top: number; width: number; height: number }) => {
    (el as HTMLElement).getBoundingClientRect = () => ({ ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON: () => ({}) }) as DOMRect;
    return el;
  };
  const launcherBox = { left: 300, right: 348, top: 760, bottom: 808 };
  const setup = (target: Element, topmost: Element = target) => {
    document.body.innerHTML = '';
    const self = document.createElement('div');
    document.body.append(self);
    const holder = target.parentElement ?? target;
    document.body.append(holder);
    const doc = Object.assign(Object.create(document), {
      querySelectorAll: (sel: string) => document.querySelectorAll(sel),
      elementsFromPoint: () => [self, topmost],
    }) as Document;
    return { self, doc };
  };

  it.each([
    ['a link', () => Object.assign(document.createElement('a'), { href: '/x' })],
    ['a button', () => document.createElement('button')],
    ['an input', () => document.createElement('input')],
    ['a heading', () => document.createElement('h2')],
    ['a [data-support-avoid] region', () => { const d = document.createElement('div'); d.setAttribute('data-support-avoid', ''); return d; }],
  ])('yields over %s (rect overlap + topmost hit)', (_n, make) => {
    const el = place(make(), { left: 320, top: 770, width: 200, height: 40 });
    const { self, doc } = setup(el);
    expect(overlapsPrimaryContent(launcherBox, self, doc)).toBe(true);
  });

  it('catches a small target (36px heart) that sits between point probes', () => {
    const heart = place(document.createElement('button'), { left: 338, top: 764, width: 36, height: 36 });
    const { self, doc } = setup(heart);
    expect(overlapsPrimaryContent(launcherBox, self, doc)).toBe(true);
  });

  it('text inside a labelled region (inquiry panel) counts', () => {
    const region = document.createElement('div');
    region.setAttribute('role', 'region');
    const p = document.createElement('p');
    region.append(p);
    place(region, { left: 250, top: 600, width: 300, height: 400 });
    const { self, doc } = setup(region, p);
    expect(overlapsPrimaryContent(launcherBox, self, doc)).toBe(true);
  });

  it('stays when the element is not under it, is covered by something else, or is its own', () => {
    const away = place(document.createElement('button'), { left: 10, top: 10, width: 100, height: 40 });
    expect(overlapsPrimaryContent(launcherBox, setup(away).self, setup(away).doc)).toBe(false);
    const under = place(document.createElement('button'), { left: 320, top: 770, width: 100, height: 40 });
    const cover = document.createElement('div');
    const s2 = setup(under, cover);
    expect(overlapsPrimaryContent(launcherBox, s2.self, s2.doc)).toBe(false);
    const s3 = setup(document.createElement('div'));
    const own = place(document.createElement('button'), { left: 300, top: 760, width: 48, height: 48 });
    s3.self.append(own);
    expect(overlapsPrimaryContent(launcherBox, s3.self, s3.doc)).toBe(false);
    expect(SUPPORT_AVOID_SELECTOR).toContain('button');
  });

  it('the menu opens at the nearest clear spot, or reports none', () => {
    const sliver = place(document.createElement('div'), { left: 0, top: 0, width: 1, height: 1 });
    const { self, doc } = setup(sliver);
    expect(chooseMenuSpot(launcherBox, self, { width: 390, height: 844, top: 64 }, doc)).toEqual({ left: 124, top: 648 });
    const wall = place(Object.assign(document.createElement('a'), { href: '/x' }), { left: 0, top: 0, width: 390, height: 844 });
    const s2 = setup(wall);
    expect(chooseMenuSpot(launcherBox, s2.self, { width: 390, height: 844, top: 64 }, s2.doc)).toBeNull();
  });

  it('no polling: checks are event-driven (rAF-throttled scroll/resize, ResizeObserver, MutationObserver, load) with hide/show delays', () => {
    const src = read('src/components/support/SupportDock.tsx');
    expect(src).not.toMatch(/setInterval/);
    for (const s of ['requestAnimationFrame', 'new ResizeObserver(schedule)', 'new MutationObserver(', "addEventListener('load', schedule", "{ capture: true, passive: true }", 'HIDE_DELAY_MS', 'SHOW_DELAY_MS']) expect(src).toContain(s);
    expect(HIDE_DELAY_MS).toBeGreaterThan(0);
    expect(SHOW_DELAY_MS).toBeGreaterThan(HIDE_DELAY_MS);
  });

  it('result-heavy pages put the launcher in the header (menu in flow), not floating', () => {
    expect(isSupportSlotPath('/search')).toBe(true);
    expect(isSupportSlotPath('/marketplace/providers')).toBe(true);
    expect(isSupportSlotPath('/marketplace/providers/abc')).toBe(false);
    expect(isSupportSlotPath('/')).toBe(false);
    expect(read('src/components/site/SiteHeader.tsx')).toContain('{supportSlot && <div data-support-slot-panel />}');
    expect(read('src/components/layout/DashboardLayout.tsx')).toContain('{isSupportSlotPath(pathname) && <div data-support-slot-panel />}');
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
