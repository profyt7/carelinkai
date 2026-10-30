/**
 * 10/29 provider pricing: free listing, Boost $39/mo, founding providers (25 × 90 days, no card).
 * These fail if:
 *   - with both flags off the homepage persona row changes (today's four cards, today's classes);
 *   - with the flags on the Providers card, the free listing or the $39 Boost copy is missing;
 *   - Boost grants, implies or displays "Verified", or its placement reads as anything but promotion;
 *   - a photo-limit perk shows up in Boost copy (galleries don't exist yet);
 *   - a founding Boost outlives day 90, stores a payment method, creates a Stripe object or can charge;
 *   - the founding-provider counter goes past 25 or a 26th claim succeeds;
 *   - any charge path runs while STRIPE_PRICE_PROVIDER_BOOST is unset;
 *   - a $99 provider price reference comes back.
 */
import fs from 'fs';
import path from 'path';
import { renderToString } from 'react-dom/server';
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const stripeCreate = jest.fn();
const customersCreate = jest.fn();
// Every Stripe call that could store a card or charge one; the founding offer must touch none.
const stripeAny = jest.fn();
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: (...a: unknown[]) => stripeCreate(...a) } },
    customers: { create: (...a: unknown[]) => customersCreate(...a) },
    paymentMethods: { attach: (...a: unknown[]) => stripeAny('paymentMethods.attach', ...a) },
    setupIntents: { create: (...a: unknown[]) => stripeAny('setupIntents.create', ...a) },
    paymentIntents: { create: (...a: unknown[]) => stripeAny('paymentIntents.create', ...a) },
    subscriptions: { create: (...a: unknown[]) => stripeAny('subscriptions.create', ...a) },
    invoices: { create: (...a: unknown[]) => stripeAny('invoices.create', ...a) },
  },
}));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
const db: { claimed: number; provider: Record<string, unknown> | null; updates: unknown[] } = { claimed: 0, provider: null, updates: [] };
jest.mock('@/lib/prisma', () => {
  const p: any = {
    user: { findUnique: jest.fn(async () => ({ id: 'u1', email: 'p@x.test', role: 'PROVIDER' })) },
    provider: {
      findUnique: jest.fn(async () => db.provider),
      count: jest.fn(async () => db.claimed),
      update: jest.fn(async (arg: unknown) => { db.updates.push(arg); db.claimed += 1; return {}; }),
    },
    $executeRaw: jest.fn(async () => 1),
  };
  p.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(p));
  return { prisma: p };
});

import HomePageClient from '@/app/HomePageClient';
import ProviderCard from '@/components/marketplace/ProviderCard';
import BoostedBadge from '@/components/providers/BoostedBadge';
import {
  BOOST_PERKS, BOOST_PRICE_LABEL, FOUNDER_BOOST_DAYS, FOUNDER_BOOST_SPOTS, founderSpotsLeft, founderWindow, isBoosted, photoLimit, PROVIDER_PHOTO_LIMIT, twoTierPage,
} from '@/lib/providers/boost';
import { getServerSession } from 'next-auth';

const session = getServerSession as unknown as jest.Mock;
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const personaRow = (html: string) => {
  const start = html.indexOf('data-testid="persona-row"');
  return html.slice(html.lastIndexOf('<div', start), html.indexOf('</section>', start));
};
const headings = (row: string) => Array.from(row.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)).map((m) => m[1]);

describe('homepage persona row', () => {
  it('flags off (default) → today\'s four cards with today\'s grid classes, no provider pricing anywhere', () => {
    const html = renderToString(<HomePageClient />);
    const row = personaRow(html);
    expect(row).toContain('class="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12"');
    expect(headings(row)).toEqual(['For Families', 'For Operators', 'For Healthcare Pros', 'For Caregivers']);
    expect(html).not.toContain('persona-providers');
    expect(html).not.toContain('For Providers');
    expect(html).not.toContain(BOOST_PRICE_LABEL);
    expect(html).not.toContain('Boosted');
    expect(renderToString(<HomePageClient providerListingOn={false} providerBoostOn={false} />)).toBe(html);
  });

  it('listing on → five cards incl. "For Providers" (free listing, service types, signup CTA); no Boost price yet', () => {
    const html = renderToString(<HomePageClient providerListingOn />);
    const row = personaRow(html);
    expect(headings(row)).toEqual(['For Families', 'For Operators', 'For Healthcare Pros', 'For Caregivers', 'For Providers']);
    expect(row).toContain('data-cards="5"');
    expect(row).toMatch(/List your services free/);
    expect(row).toContain('Home health care, personal care, therapy, medical transportation, meal delivery and medical equipment.');
    expect(row).toContain('href="/auth/register?role=provider"');
    expect(row).not.toContain(BOOST_PRICE_LABEL);
  });

  it('listing + Boost on → the card also shows Boost at $39/mo', () => {
    const row = personaRow(renderToString(<HomePageClient providerListingOn providerBoostOn />));
    expect(row).toContain('data-testid="persona-providers-boost"');
    expect(row).toContain('Optional Boost (promoted placement): $39/mo');
    expect(row).not.toMatch(/top placement|ranks? first|best|photo/i);
  });

  it('five cards lay out 3+2 centered (md/lg) and 5-up (xl), never one card stretched alone', () => {
    const row = personaRow(renderToString(<HomePageClient providerListingOn />));
    expect(row).toContain('flex flex-wrap justify-center');
    expect(row).toContain('md:[&amp;&gt;*]:w-[calc((100%-4rem)/3)]');
    expect(row).toContain('xl:[&amp;&gt;*]:w-[calc((100%-8rem)/5)]');
  });
});

describe('Boost never grants or displays "Verified"', () => {
  const base = { id: 'p1', businessName: 'Acme Rides', bio: null, city: 'Cleveland', state: 'OH', serviceTypes: ['transportation'], yearsInBusiness: 3 };

  it('a boosted, unverified provider shows "Boosted" and still "Verification Pending"', () => {
    const html = renderToString(<ProviderCard provider={{ ...base, isVerified: false, boosted: true }} />);
    expect(html).toContain('Boosted');
    expect(html).toContain('Verification Pending');
    expect(html).not.toContain('Verified Provider');
  });

  it('the badge reads as promotion: "Boosted", tooltip and screen-reader text "Promoted", never Verified or quality', () => {
    const html = renderToString(<BoostedBadge />);
    expect(html).toContain('>Boosted');
    expect(html).toContain('title="Promoted"');
    expect(html).toContain('<span class="sr-only"> (Promoted)</span>');
    expect(html).not.toMatch(/verif|top|best|quality|rated/i);
  });

  it('Boost perks: placement (labelled promoted), badge, instant alerts — no photo limit anywhere in the UI copy', () => {
    expect(BOOST_PERKS).toHaveLength(3);
    expect(BOOST_PERKS[0]).toMatch(/promoted/);
    expect(BOOST_PERKS.join(' ')).not.toMatch(/photo|top placement|rank first/i);
    for (const f of ['src/app/settings/provider/billing/page.tsx', 'src/app/learn/howto/content.ts', 'src/app/HomePageClient.tsx', 'src/components/providers/BoostedBadge.tsx']) {
      const src = read(f);
      expect(src).not.toMatch(/PROVIDER_PHOTO_LIMIT|photoLimit|photo limit|photo galler(y|ies) launch|top placement|rank first/i);
    }
    expect(read('src/lib/providers/boost.ts')).toContain('PROVIDER_PHOTO_LIMIT = { free: 3, boosted: 12 }');
  });

  it('no Boost code path writes isVerified', () => {
    for (const f of ['src/lib/providers/boost.ts', 'src/app/api/provider/billing/subscribe/route.ts', 'src/app/api/provider/boost/founder/route.ts']) {
      expect(read(f)).not.toMatch(/isVerified\s*:/);
    }
    const hook = read('src/app/api/webhooks/stripe/route.ts');
    const boostBlock = hook.slice(hook.indexOf('if (provider && isProviderBoostSubscription(sub))'), hook.indexOf('if (provider) {', hook.indexOf('if (provider && isProviderBoostSubscription(sub))')));
    expect(boostBlock).toContain('boostStatus: status');
    expect(boostBlock).not.toMatch(/isVerified\s*:/);
  });
});

describe('Boost state', () => {
  const now = new Date('2026-11-01T12:00:00Z');
  it('active paid Boost or an unexpired founding window counts; everything else does not', () => {
    expect(isBoosted({ boostStatus: 'ACTIVE' }, now)).toBe(true);
    expect(isBoosted({ boostStatus: 'TRIALING' }, now)).toBe(true);
    expect(isBoosted({ boostStatus: 'PAST_DUE' }, now)).toBe(false);
    expect(isBoosted({ boostStatus: 'CANCELED' }, now)).toBe(false);
    expect(isBoosted({}, now)).toBe(false);
  });

  it('the founding window is exactly 90 days and lapses on its own', () => {
    const { startedAt, endsAt } = founderWindow(now);
    expect((endsAt.getTime() - startedAt.getTime()) / 86_400_000).toBe(FOUNDER_BOOST_DAYS);
    expect(isBoosted({ founderBoostEndsAt: endsAt }, new Date(endsAt.getTime() - 1))).toBe(true);
    expect(isBoosted({ founderBoostEndsAt: endsAt }, endsAt)).toBe(false);
  });

  it('photo-limit constants stay in code (3/12), unused by any UI', () => {
    expect(photoLimit({ boostStatus: 'ACTIVE' }, true)).toBe(PROVIDER_PHOTO_LIMIT.boosted);
    expect(photoLimit({ boostStatus: 'ACTIVE' }, false)).toBe(PROVIDER_PHOTO_LIMIT.free);
    expect(photoLimit({}, true)).toBe(PROVIDER_PHOTO_LIMIT.free);
  });

  it('boosted providers fill pages first, then the rest (two-tier paging)', () => {
    expect(twoTierPage(0, 20, 3)).toEqual({ boostedSkip: 0, boostedTake: 3, restSkip: 0, restTake: 17 });
    expect(twoTierPage(20, 20, 3)).toEqual({ boostedSkip: 3, boostedTake: 0, restSkip: 17, restTake: 20 });
    expect(twoTierPage(0, 20, 50)).toEqual({ boostedSkip: 0, boostedTake: 20, restSkip: 0, restTake: 0 });
    expect(twoTierPage(40, 20, 50)).toEqual({ boostedSkip: 40, boostedTake: 10, restSkip: 0, restTake: 10 });
  });
});

describe('founding-provider counter', () => {
  const OLD = process.env;
  beforeEach(() => {
    process.env = { ...OLD, PROVIDER_BOOST_ENABLED: '1' };
    session.mockResolvedValue({ user: { id: 'u1', role: 'PROVIDER', email: 'p@x.test' } });
    db.updates = [];
  });
  afterAll(() => { process.env = OLD; });

  it('spots left never goes below 0 or above 25', () => {
    expect(founderSpotsLeft(0)).toBe(FOUNDER_BOOST_SPOTS);
    expect(founderSpotsLeft(24)).toBe(1);
    expect(founderSpotsLeft(25)).toBe(0);
    expect(founderSpotsLeft(40)).toBe(0);
    expect(founderSpotsLeft(-3)).toBe(FOUNDER_BOOST_SPOTS);
  });

  it('claim 25 is granted (no card, no Stripe); claim 26 is refused', async () => {
    const { POST } = await import('@/app/api/provider/boost/founder/route');
    db.claimed = 24;
    db.provider = { id: 'p1', founderBoostStartedAt: null };
    const ok = await POST();
    expect(ok.status).toBe(200);
    expect((await ok.json()).spotsLeft).toBe(0);
    expect(db.updates).toHaveLength(1);
    expect(stripeCreate).not.toHaveBeenCalled();
    expect(customersCreate).not.toHaveBeenCalled();

    db.provider = { id: 'p2', founderBoostStartedAt: null };
    const full = await POST();
    expect(full.status).toBe(409);
    expect(await full.json()).toMatchObject({ spotsLeft: 0 });
    expect(db.updates).toHaveLength(1);
  });

  it('founding benefit ends at day 90 (clock mocked), with nothing stored but the two dates', async () => {
    jest.useFakeTimers();
    const claimAt = new Date('2026-11-02T15:00:00Z');
    jest.setSystemTime(claimAt);
    try {
      const { POST } = await import('@/app/api/provider/boost/founder/route');
      db.claimed = 0;
      db.provider = { id: 'p9', founderBoostStartedAt: null };
      const res = await POST();
      expect(res.status).toBe(200);
      const upd = db.updates[0] as { data: Record<string, Date> };
      // Only the window: no card, customer, subscription or payment field is written.
      expect(Object.keys(upd.data).sort()).toEqual(['founderBoostEndsAt', 'founderBoostStartedAt']);
      expect(upd.data.founderBoostStartedAt.getTime()).toBe(claimAt.getTime());
      const ends = upd.data.founderBoostEndsAt;
      expect(ends.getTime() - claimAt.getTime()).toBe(90 * 86_400_000);
      const stored = { founderBoostEndsAt: ends };

      jest.setSystemTime(new Date(claimAt.getTime() + 89 * 86_400_000));
      expect(isBoosted(stored)).toBe(true); // day 89: still boosted
      jest.setSystemTime(new Date(ends.getTime() - 1));
      expect(isBoosted(stored)).toBe(true); // last millisecond of day 90
      jest.setSystemTime(ends);
      expect(isBoosted(stored)).toBe(false); // day 90 over
      jest.setSystemTime(new Date(claimAt.getTime() + 365 * 86_400_000));
      expect(isBoosted(stored)).toBe(false); // and it stays over: no renewal path
    } finally {
      jest.useRealTimers();
    }
  });

  it('no payment method, no Stripe object, no charge: the founding path never imports Stripe', async () => {
    const { POST } = await import('@/app/api/provider/boost/founder/route');
    db.claimed = 5;
    db.provider = { id: 'p10', founderBoostStartedAt: null };
    expect((await POST()).status).toBe(200);
    expect(stripeCreate).not.toHaveBeenCalled();
    expect(customersCreate).not.toHaveBeenCalled();
    expect(stripeAny).not.toHaveBeenCalled();
    const src = read('src/app/api/provider/boost/founder/route.ts');
    expect(src).not.toMatch(/@\/lib\/stripe|stripe\.|paymentMethod|setupIntent|stripeCustomerId|boostStripeSubscriptionId|boostStatus\s*:/);
    // Paid Boost state only ever comes from a Stripe subscription webhook, which a founder never has.
    expect(isBoosted({ boostStatus: null, founderBoostEndsAt: new Date(Date.now() - 1) })).toBe(false);
  });

  it('the counter reflects the real number of claimed spots (GET)', async () => {
    const { GET } = await import('@/app/api/provider/boost/founder/route');
    for (const [claimed, left] of [[0, 25], [7, 18], [24, 1], [25, 0], [31, 0]] as const) {
      db.claimed = claimed;
      db.provider = null;
      const body = await (await GET()).json();
      expect(body).toMatchObject({ total: 25, spotsLeft: left });
    }
    const prisma = (await import('@/lib/prisma')).prisma as any;
    expect(prisma.provider.count).toHaveBeenLastCalledWith({ where: { founderBoostStartedAt: { not: null } } });
  });

  it('a provider can claim only once', async () => {
    const { POST } = await import('@/app/api/provider/boost/founder/route');
    db.claimed = 3;
    db.provider = { id: 'p1', founderBoostStartedAt: new Date() };
    expect((await POST()).status).toBe(409);
    expect(db.updates).toHaveLength(0);
  });
});

describe('no charge path without the Boost price', () => {
  const OLD = process.env;
  afterAll(() => { process.env = OLD; });
  const post = () => new NextRequest('http://localhost/api/provider/billing/subscribe', { method: 'POST' });

  it('flag on + STRIPE_PRICE_PROVIDER_BOOST unset → 503, no Stripe call', async () => {
    process.env = { ...OLD, PROVIDER_BOOST_ENABLED: '1' };
    delete process.env.STRIPE_PRICE_PROVIDER_BOOST;
    session.mockResolvedValue({ user: { id: 'u1', role: 'PROVIDER', email: 'p@x.test' } });
    db.provider = { id: 'p1', businessName: 'Acme', stripeCustomerId: null };
    const { POST } = await import('@/app/api/provider/billing/subscribe/route');
    const res = await POST(post());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: 'price_not_configured' });
    expect(stripeCreate).not.toHaveBeenCalled();
    expect(customersCreate).not.toHaveBeenCalled();
  });

  it('flag off → 503 before auth or Stripe', async () => {
    process.env = { ...OLD };
    delete process.env.PROVIDER_BOOST_ENABLED;
    session.mockClear();
    const { POST } = await import('@/app/api/provider/billing/subscribe/route');
    expect((await POST(post())).status).toBe(503);
    expect(session).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });
});

describe('the $99 provider price is retired', () => {
  it.each([
    'src/app/HomePageClient.tsx',
    'src/app/settings/provider/billing/page.tsx',
    'src/app/provider/page.tsx',
    'src/app/learn/howto/content.ts',
    'src/app/admin/page.tsx',
    'src/lib/admin/stats.ts',
    'src/app/api/provider/billing/subscribe/route.ts',
    '.env.example',
  ])('%s has no provider $99', (f) => {
    const src = read(f).replace(/\{\/\*[^]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/Marketplace listing — \$99|Provider[^\n]{0,60}\$99|\$99\/mo[^\n]{0,40}(listing|provider)|providers\} active · \$99|\* 99;|STRIPE_PRICE_PROVIDER_LISTING/i);
  });
});
