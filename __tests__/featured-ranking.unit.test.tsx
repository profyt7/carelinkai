/**
 * @jest-environment jsdom
 *
 * OL-191 — featured is a bounded tie-break: it reorders homes only inside a
 * score band (/api/search) or a freshness tier (/cleveland hubs), never across
 * one, and only while the featured window is open. The "Featured" badge shows
 * only for an active window.
 */

jest.mock('@/lib/prisma', () => ({ prisma: { assistedLivingHome: { findMany: jest.fn() } } }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { render, screen } from '@testing-library/react';
import {
  SEARCH_SCORE_BAND_WIDTH,
  compareSearchRank,
  hubFreshnessBand,
  isFeaturedActive,
  rankHubRows,
  searchScoreBand,
} from '@/lib/directory/featured-rank';
import { fetchPublicListings, toPublicListing, type PublicListingRow } from '@/lib/directory/public-listings';
import ListingCard from '@/components/directory/ListingCard';
import { prisma } from '@/lib/prisma';

const NOW = new Date('2026-10-25T12:00:00Z').getTime();
const DAY = 86_400_000;
const future = new Date(NOW + 10 * DAY);
const past = new Date(NOW - DAY);

type R = { id: string; rankScore: number; featured?: boolean };
const rank = (rows: R[]) => [...rows].sort(compareSearchRank).map((r) => r.id);

describe('isFeaturedActive', () => {
  it('is true only while the window is open', () => {
    expect(isFeaturedActive({ isFeatured: true, featuredUntil: future }, NOW)).toBe(true);
    expect(isFeaturedActive({ isFeatured: true, featuredUntil: null }, NOW)).toBe(true);
    expect(isFeaturedActive({ isFeatured: true, featuredUntil: past }, NOW)).toBe(false);
    expect(isFeaturedActive({ isFeatured: false, featuredUntil: future }, NOW)).toBe(false);
    expect(isFeaturedActive({}, NOW)).toBe(false);
  });
});

describe('/api/search relevance order (compareSearchRank)', () => {
  it('bands are SEARCH_SCORE_BAND_WIDTH points wide', () => {
    expect(SEARCH_SCORE_BAND_WIDTH).toBe(5);
    expect(searchScoreBand(80)).toBe(searchScoreBand(84.9));
    expect(searchScoreBand(85)).toBe(searchScoreBand(80) + 1);
  });

  it('(1) featured never outranks a home in a higher band', () => {
    expect(rank([
      { id: 'featured-80', rankScore: 80, featured: true },
      { id: 'plain-85', rankScore: 85 },
      { id: 'plain-100', rankScore: 100 },
    ])).toEqual(['plain-100', 'plain-85', 'featured-80']);
    // a featured 0 stays last however many featured homes there are
    expect(rank([
      { id: 'f0', rankScore: 0, featured: true },
      { id: 'p5', rankScore: 5 },
    ])).toEqual(['p5', 'f0']);
  });

  it('(2) featured wins the tie within its band; otherwise score order is unchanged', () => {
    expect(rank([
      { id: 'plain-84', rankScore: 84 },
      { id: 'featured-81', rankScore: 81, featured: true },
      { id: 'plain-82', rankScore: 82 },
    ])).toEqual(['featured-81', 'plain-84', 'plain-82']);
    // two featured in a band keep score order between them
    expect(rank([
      { id: 'f-80', rankScore: 80, featured: true },
      { id: 'f-83', rankScore: 83, featured: true },
    ])).toEqual(['f-83', 'f-80']);
  });

  it('(3) an expired window gets no boost', () => {
    const expired = isFeaturedActive({ isFeatured: true, featuredUntil: past }, NOW);
    expect(rank([
      { id: 'plain-84', rankScore: 84 },
      { id: 'expired-81', rankScore: 81, featured: expired },
    ])).toEqual(['plain-84', 'expired-81']);
  });
});

describe('/cleveland hub order (rankHubRows)', () => {
  const row = (id: string, verifiedDaysAgo: number | null, featured?: 'active' | 'expired') => ({
    id,
    availabilityVerifiedAt: verifiedDaysAgo == null ? null : new Date(NOW - verifiedDaysAgo * DAY),
    isFeatured: !!featured,
    featuredUntil: featured === 'expired' ? past : featured === 'active' ? future : null,
  });

  it('tiers: verified within the fresh window, older, never verified', () => {
    expect(hubFreshnessBand(new Date(NOW - 2 * DAY), NOW)).toBe(0);
    expect(hubFreshnessBand(new Date(NOW - 40 * DAY), NOW)).toBe(1);
    expect(hubFreshnessBand(null, NOW)).toBe(2);
  });

  it('(4) featured leads its freshness tier but never jumps into a fresher one', () => {
    const page = [row('fresh-today', 0), row('fresh-5d', 5), row('stale-30d', 30), row('never', null)];
    const featured = [row('featured-fresh-9d', 9, 'active'), row('featured-stale-60d', 60, 'active'), row('featured-never', null, 'active')];
    expect(rankHubRows([...page, ...featured], 10, NOW).map((r) => r.id)).toEqual([
      'featured-fresh-9d', 'fresh-today', 'fresh-5d',
      'featured-stale-60d', 'stale-30d',
      'featured-never', 'never',
    ]);
  });

  it('an expired window keeps its normal place; duplicates are dropped; take is honoured', () => {
    const rows = [row('fresh-today', 0), row('fresh-3d-expired', 3, 'expired'), row('fresh-today', 0)];
    expect(rankHubRows(rows, 10, NOW).map((r) => r.id)).toEqual(['fresh-today', 'fresh-3d-expired']);
    expect(rankHubRows([row('a', 0), row('b', 1), row('c', 2)], 2, NOW).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('fetchPublicListings merges active featured homes from outside the top rows', async () => {
    const findMany = prisma.assistedLivingHome.findMany as jest.Mock;
    const base = { name: 'X', careLevel: ['ASSISTED'], address: { city: 'Parma', state: 'OH' }, operator: { user: { email: 'op@example.com' } } };
    const top = [{ ...base, ...row('fresh-today', 0), name: 'Fresh' }];
    const feat = [{ ...base, ...row('featured-fresh-8d', 8, 'active'), name: 'Featured' }];
    findMany.mockResolvedValueOnce(top).mockResolvedValueOnce(feat);
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    try {
      const out = await fetchPublicListings({ take: 12 });
      expect(out.map((l) => [l.id, l.featured])).toEqual([['featured-fresh-8d', true], ['fresh-today', false]]);
      const featuredQuery = findMany.mock.calls[1][0];
      expect(JSON.stringify(featuredQuery.where)).toContain('"isFeatured":true');
    } finally {
      (Date.now as jest.Mock).mockRestore();
    }
  });
});

describe('(5) Featured badge', () => {
  const listingRow = (extra: Partial<PublicListingRow>): PublicListingRow => ({
    id: 'h1',
    name: 'Maple House',
    careLevel: ['ASSISTED'],
    address: { city: 'Parma', state: 'OH' },
    operator: { user: { email: 'op@example.com' } },
    ...extra,
  });

  it('shows on a hub card only while featured is active', () => {
    const { unmount } = render(<ListingCard listing={toPublicListing(listingRow({ isFeatured: true, featuredUntil: future }), NOW)} />);
    expect(screen.getByTestId('featured-badge').textContent).toContain('Featured');
    unmount();
    render(<ListingCard listing={toPublicListing(listingRow({ isFeatured: true, featuredUntil: past }), NOW)} />);
    expect(screen.queryByTestId('featured-badge')).toBeNull();
  });

  it('is absent for a home that was never featured', () => {
    render(<ListingCard listing={toPublicListing(listingRow({}), NOW)} />);
    expect(screen.queryByTestId('featured-badge')).toBeNull();
  });
});
