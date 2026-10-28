/**
 * Sprint W3 items 3 + 4 — pure mappers behind the public directory pages:
 *  - inspectionSummary: facts only (latest survey date, citation counts), no grades;
 *  - toPublicListing: business data only — phone hidden until claimed, no
 *    operator email, placeholder photo when none, availability + pricing views.
 */

jest.mock('@/lib/prisma', () => ({ prisma: { assistedLivingHome: { findMany: jest.fn() } } }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import {
  DIRECTORY_UNCLAIMED_EMAIL,
  fetchPublicListings,
  inspectionSummary,
  toPublicListing,
  type PublicListingRow,
} from '@/lib/directory/public-listings';
import { prisma } from '@/lib/prisma';

const NOW = new Date('2026-10-13T12:00:00Z').getTime();

describe('inspectionSummary', () => {
  it('reports "no survey" when nothing is on file', () => {
    const s = inspectionSummary([]);
    expect(s).toMatchObject({ surveyCount: 0, latestSurveyDate: null, latestCitationCount: null, totalCitations: 0 });
    expect(s.line).toBe('No ODH survey on file');
  });

  it('picks the most recent survey and counts citations across all of them', () => {
    const s = inspectionSummary([
      { surveyDate: '2025-02-10', surveyType: 'Standard', citationCount: 3 },
      { surveyDate: new Date('2026-03-04T00:00:00Z'), surveyType: 'Complaint', citationCount: 1 },
      { surveyDate: '2024-11-20', surveyType: 'Standard', citationCount: 0 },
    ]);
    expect(s.surveyCount).toBe(3);
    expect(s.latestSurveyDate).toBe('2026-03-04');
    expect(s.latestSurveyType).toBe('Complaint');
    expect(s.latestCitationCount).toBe(1);
    expect(s.totalCitations).toBe(4);
    expect(s.line).toBe('ODH survey Mar 4, 2026 · 1 citation · 3 surveys on file');
  });

  it('never grades or editorialises', () => {
    const s = inspectionSummary([{ surveyDate: '2026-01-01', citationCount: 9 }]);
    expect(s.line).toBe('ODH survey Jan 1, 2026 · 9 citations');
    expect(s.line.toLowerCase()).not.toMatch(/grade|poor|excellent|safe|bad/);
  });

  it('ignores records with an unparseable date', () => {
    expect(inspectionSummary([{ surveyDate: 'not-a-date', citationCount: 5 }]).surveyCount).toBe(0);
  });
});

const row = (overrides: Partial<PublicListingRow> = {}): PublicListingRow => ({
  id: 'home-1',
  name: 'Maple Grove Assisted Living',
  description: 'A 16-bed home.',
  careLevel: ['ASSISTED', 'MEMORY_CARE'],
  capacity: 16,
  phone: '+12165550100',
  websiteUrl: 'https://maplegrove.example',
  googleRating: 4.6,
  googleRatingCount: 23,
  availabilityCount: 2,
  availabilityVerifiedAt: new Date(NOW - 2 * 86_400_000),
  availabilitySource: 'SMS' as never,
  startingPriceMonthly: 4800,
  priceSource: 'OPERATOR' as never,
  priceUpdatedAt: new Date(NOW - 10 * 86_400_000),
  odhLicenseNumber: '2406R',
  address: { street: '1 Main St', city: 'Westlake', state: 'OH', zipCode: '44145', latitude: 41.45, longitude: -81.92 },
  photos: [{ url: 'https://res.cloudinary.com/x/photo.jpg' }],
  facilityInspections: [{ surveyDate: '2026-03-04', surveyType: 'Standard', citationCount: 2 }],
  operator: { user: { email: 'owner@maplegrove.example' } },
  ...overrides,
});

describe('toPublicListing', () => {
  it('maps a claimed home with business facts only', () => {
    const l = toPublicListing(row(), NOW);
    expect(l).toMatchObject({
      id: 'home-1',
      href: '/homes/home-1',
      name: 'Maple Grove Assisted Living',
      careLevelLabels: ['Assisted living', 'Memory care'],
      city: 'Westlake',
      state: 'OH',
      claimed: true,
      phone: '+12165550100',
      photoUrl: 'https://res.cloudinary.com/x/photo.jpg',
      photoIsPlaceholder: false,
      rating: 4.6,
      ratingCount: 23,
      odhLicenseNumber: '2406R',
    });
    expect(l.availability.badge).toBe(true);
    expect(l.availability.count).toBe(2);
    expect(l.pricing.display).toBe('Starting around $4,800/mo · operator-provided');
    expect(l.inspections.line).toBe('ODH survey Mar 4, 2026 · 2 citations');
    // never serialised
    expect(JSON.stringify(l)).not.toContain('owner@maplegrove.example');
  });

  it('hides the phone (and nothing else) for an unclaimed directory-seeded home', () => {
    const l = toPublicListing(row({ operator: { user: { email: DIRECTORY_UNCLAIMED_EMAIL } } }), NOW);
    expect(l.claimed).toBe(false);
    expect(l.phone).toBeNull();
    expect(l.name).toBe('Maple Grove Assisted Living');
    expect(JSON.stringify(l)).not.toContain(DIRECTORY_UNCLAIMED_EMAIL);
  });

  it('falls back to a placeholder photo, "Contact to confirm" and "Contact for pricing"', () => {
    const l = toPublicListing(
      row({
        photos: [],
        availabilityVerifiedAt: new Date(NOW - 40 * 86_400_000),
        startingPriceMonthly: null,
        priceRangeLow: null,
        priceMin: null,
        facilityInspections: [],
        odhLicenseNumber: null,
      }),
      NOW
    );
    expect(l.photoIsPlaceholder).toBe(true);
    expect(l.photoUrl).toMatch(/^https?:\/\/|^\//);
    expect(l.availability.badge).toBe(false);
    expect(l.availability.count).toBeNull();
    expect(l.pricing.display).toBe('Contact for pricing');
    expect(l.inspections.line).toBe('No ODH survey on file');
    expect(l.odhLicenseNumber).toBeNull();
  });
});

describe('fetchPublicListings', () => {
  const findMany = prisma.assistedLivingHome.findMany as jest.Mock;
  afterEach(() => jest.clearAllMocks());

  it('queries ACTIVE, non-demo homes for the given cities / care level, verified-first', async () => {
    findMany.mockResolvedValue([row()]);
    const out = await fetchPublicListings({ cities: ['Westlake', 'Bay Village'], careLevel: 'ASSISTED', take: 5 });
    expect(out).toHaveLength(1);
    const args = findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ status: 'ACTIVE', isDemo: false, careLevel: { has: 'ASSISTED' } });
    expect(args.where.address.is.OR).toEqual([
      { city: { equals: 'Westlake', mode: 'insensitive' } },
      { city: { equals: 'Bay Village', mode: 'insensitive' } },
    ]);
    expect(args.take).toBe(5);
    expect(args.orderBy[0]).toEqual({ availabilityVerifiedAt: { sort: 'desc', nulls: 'last' } });
    // the select never pulls the operator's name or any family data
    expect(JSON.stringify(args.select)).not.toMatch(/firstName|lastName|inquir|resident|family/i);
  });

  it('defaults to 12 and caps at 48', async () => {
    findMany.mockResolvedValue([]);
    await fetchPublicListings();
    expect(findMany.mock.calls[0][0].take).toBe(12);
    await fetchPublicListings({ take: 500 });
    // two queries per fetch (page rows + active featured rows, OL-191) → the second fetch's page query is call 2
    expect(findMany.mock.calls[2][0].take).toBe(48);
  });

  it('returns [] instead of throwing when the DB fails', async () => {
    findMany.mockRejectedValue(new Error('db down'));
    await expect(fetchPublicListings({ cities: ['Parma'] })).resolves.toEqual([]);
  });
});
