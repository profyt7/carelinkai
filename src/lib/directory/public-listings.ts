/**
 * Public directory listings — ONE server-side query shape for every logged-out
 * SEO page that shows real homes (sprint W3 items 3 + 4: /cleveland/assisted-living
 * and the suburb pages under it).
 *
 * Rules (the same ones /api/search and /api/homes/search enforce):
 *   - status ACTIVE, isDemo false (OL-112) — demo/tutorial fixtures never render;
 *   - business data only: name, address, care types, availability freshness,
 *     published pricing, Google aggregate rating, ODH inspection FACTS. No PHI,
 *     no family data, no operator contact email (phone only once claimed);
 *   - "top verified" ordering: freshly verified availability first, then rating,
 *     then name — never a paid position.
 *
 * `toPublicListing` / `inspectionSummary` are pure so they can be unit-tested;
 * `fetchPublicListings` is the only thing that touches Prisma and it never
 * throws (a DB hiccup must not 500 an SEO page — the page renders without
 * listings and the error goes to Sentry).
 */

import type { CareLevel, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import { availabilityView, type AvailabilityView } from '@/lib/availability/availability';
import { pricingView, type PricingView } from '@/lib/pricing/pricing';
import { placeholderImageFor } from '@/lib/placeholder-images';
import { medicaidWaiverPublicView, type MedicaidWaiverPublicView } from '@/lib/medicaid/waiver';

/** Sentinel operator that owns every unclaimed directory-seeded home. */
export const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

export const CARE_LEVEL_LABEL: Record<CareLevel, string> = {
  INDEPENDENT: 'Independent living',
  ASSISTED: 'Assisted living',
  MEMORY_CARE: 'Memory care',
  SKILLED_NURSING: 'Skilled nursing',
};

export type InspectionRecordLike = {
  surveyDate: Date | string;
  surveyType?: string | null;
  citationCount?: number | null;
};

export type InspectionSummary = {
  /** Number of ODH surveys on file. 0 → "No ODH survey on file". */
  surveyCount: number;
  /** Most recent survey (ISO date, YYYY-MM-DD) or null. */
  latestSurveyDate: string | null;
  latestSurveyType: string | null;
  /** Citations on the most recent survey. */
  latestCitationCount: number | null;
  /** Citations across every survey on file. */
  totalCitations: number;
  /** One factual line, e.g. "ODH survey Mar 4, 2026 · 2 citations · 3 surveys on file". */
  line: string;
};

function isoDate(d: Date | string): string | null {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

export function formatSurveyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Facts only — counts and dates, no grades, no adjectives. */
export function inspectionSummary(records: readonly InspectionRecordLike[]): InspectionSummary {
  const sorted = [...records]
    .map((r) => ({ ...r, iso: isoDate(r.surveyDate) }))
    .filter((r): r is typeof r & { iso: string } => !!r.iso)
    .sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0));
  const latest = sorted[0];
  const totalCitations = sorted.reduce((n, r) => n + (r.citationCount ?? 0), 0);
  if (!latest) {
    return {
      surveyCount: 0,
      latestSurveyDate: null,
      latestSurveyType: null,
      latestCitationCount: null,
      totalCitations: 0,
      line: 'No ODH survey on file',
    };
  }
  const c = latest.citationCount ?? 0;
  const parts = [
    `ODH survey ${formatSurveyDate(latest.iso)}`,
    `${c} citation${c === 1 ? '' : 's'}`,
  ];
  if (sorted.length > 1) parts.push(`${sorted.length} surveys on file`);
  return {
    surveyCount: sorted.length,
    latestSurveyDate: latest.iso,
    latestSurveyType: latest.surveyType ?? null,
    latestCitationCount: c,
    totalCitations,
    line: parts.join(' · '),
  };
}

/** The DB row shape the mapper needs (a subset of AssistedLivingHome + relations). */
export type PublicListingRow = {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  careLevel: CareLevel[];
  capacity?: number | null;
  phone?: string | null;
  websiteUrl?: string | null;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  availabilityCount?: number | null;
  availabilityVerifiedAt?: Date | string | null;
  availabilitySource?: AvailabilityView['source'];
  startingPriceMonthly?: number | null;
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
  priceSource?: PricingView['source'];
  priceUpdatedAt?: Date | string | null;
  priceMin?: unknown;
  priceMax?: unknown;
  odhLicenseNumber?: string | null;
  medicaidWaiverStatus?: MedicaidWaiverPublicView['status'] | null;
  medicaidPendingAccepted?: boolean | null;
  medicaidPendingAcceptedVerifiedAt?: Date | string | null;
  address?: {
    street?: string | null;
    city: string;
    state: string;
    zipCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  photos?: Array<{ url: string }> | null;
  facilityInspections?: InspectionRecordLike[] | null;
  operator?: { user?: { email?: string | null } | null } | null;
};

export type PublicListing = {
  id: string;
  href: string;
  name: string;
  description: string | null;
  careLevels: CareLevel[];
  careLevelLabels: string[];
  capacity: number | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  street: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Shown only once an operator has claimed the listing. */
  phone: string | null;
  websiteUrl: string | null;
  claimed: boolean;
  photoUrl: string;
  photoIsPlaceholder: boolean;
  rating: number | null;
  ratingCount: number | null;
  availability: AvailabilityView;
  pricing: PricingView;
  odhLicenseNumber: string | null;
  inspections: InspectionSummary;
  /** Medicaid Assisted Living Waiver line (sprint W5-2) — `line` null → render nothing. */
  medicaidWaiver: MedicaidWaiverPublicView;
};

export function isUnclaimedOperatorEmail(email: string | null | undefined): boolean {
  return (email || '').toLowerCase() === DIRECTORY_UNCLAIMED_EMAIL;
}

/** Pure mapper: DB row → presentation-ready, serializable listing. */
export function toPublicListing(row: PublicListingRow, now: number = Date.now()): PublicListing {
  const claimed = !isUnclaimedOperatorEmail(row.operator?.user?.email ?? null);
  const photo = row.photos?.[0]?.url || null;
  return {
    id: row.id,
    href: `/homes/${row.id}`,
    name: row.name,
    description: row.description ?? null,
    careLevels: row.careLevel ?? [],
    careLevelLabels: (row.careLevel ?? []).map((c) => CARE_LEVEL_LABEL[c] ?? c),
    capacity: row.capacity ?? null,
    city: row.address?.city ?? null,
    state: row.address?.state ?? null,
    zipCode: row.address?.zipCode ?? null,
    street: row.address?.street ?? null,
    latitude: row.address?.latitude ?? null,
    longitude: row.address?.longitude ?? null,
    phone: claimed ? row.phone ?? null : null,
    websiteUrl: row.websiteUrl ?? null,
    claimed,
    photoUrl: photo ?? placeholderImageFor(row.id),
    photoIsPlaceholder: !photo,
    rating: row.googleRating ?? null,
    ratingCount: row.googleRatingCount ?? null,
    availability: availabilityView(row, now),
    pricing: pricingView(row, undefined, now),
    odhLicenseNumber: row.odhLicenseNumber ?? null,
    inspections: inspectionSummary(row.facilityInspections ?? []),
    medicaidWaiver: medicaidWaiverPublicView(row),
  };
}

export type PublicListingsQuery = {
  /** Match address.city case-insensitively against any of these. */
  cities?: readonly string[];
  /** Restrict to homes offering this care level. */
  careLevel?: CareLevel;
  /** "Accepts Medicaid waiver" filter (sprint W5-2): ACCEPTING_NEW only. */
  medicaidWaiver?: boolean;
  /** Max rows (default 12). */
  take?: number;
};

/** The query-string flag every directory page reads for the waiver filter. */
export const WAIVER_FILTER_PARAM = 'waiver';
export function waiverFilterFromSearchParams(sp: Record<string, string | string[] | undefined> | undefined | null): boolean {
  const v = sp?.[WAIVER_FILTER_PARAM];
  const s = Array.isArray(v) ? v[0] : v;
  return s === '1' || s === 'true';
}

export const PUBLIC_LISTING_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  careLevel: true,
  capacity: true,
  phone: true,
  websiteUrl: true,
  googleRating: true,
  googleRatingCount: true,
  availabilityCount: true,
  availabilityVerifiedAt: true,
  availabilitySource: true,
  startingPriceMonthly: true,
  priceRangeLow: true,
  priceRangeHigh: true,
  priceSource: true,
  priceUpdatedAt: true,
  priceMin: true,
  priceMax: true,
  odhLicenseNumber: true,
  medicaidWaiverStatus: true,
  medicaidPendingAccepted: true,
  medicaidPendingAcceptedVerifiedAt: true,
  address: { select: { street: true, city: true, state: true, zipCode: true, latitude: true, longitude: true } },
  photos: {
    select: { url: true },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    take: 1,
  },
  facilityInspections: {
    select: { surveyDate: true, surveyType: true, citationCount: true },
    orderBy: { surveyDate: 'desc' },
    take: 10,
  },
  operator: { select: { user: { select: { email: true } } } },
} satisfies Prisma.AssistedLivingHomeSelect;

/**
 * The ONE filter every public listings page uses (and the one the suburb
 * empty-state guard reports): ACTIVE, non-demo, optional care level, optional
 * case-insensitive city allow-list.
 */
export function publicListingsWhere(q: PublicListingsQuery = {}): Prisma.AssistedLivingHomeWhereInput {
  return {
    status: 'ACTIVE',
    isDemo: false,
    ...(q.careLevel ? { careLevel: { has: q.careLevel } } : {}),
    ...(q.medicaidWaiver ? { medicaidWaiverStatus: 'ACCEPTING_NEW' as const } : {}),
    ...(q.cities && q.cities.length
      ? { address: { is: { OR: q.cities.map((c) => ({ city: { equals: c, mode: 'insensitive' as const } })) } } }
      : {}),
  };
}

/** Live count for the same filter. Throws on a DB error (callers decide). */
export async function countPublicListings(q: PublicListingsQuery = {}): Promise<number> {
  return prisma.assistedLivingHome.count({ where: publicListingsWhere(q) });
}

/**
 * Top verified, non-demo, ACTIVE homes for a public page. Never throws.
 */
export async function fetchPublicListings(q: PublicListingsQuery = {}): Promise<PublicListing[]> {
  const take = Math.min(Math.max(q.take ?? 12, 1), 48);
  try {
    const rows = await prisma.assistedLivingHome.findMany({
      where: publicListingsWhere(q),
      select: PUBLIC_LISTING_SELECT,
      orderBy: [
        { availabilityVerifiedAt: { sort: 'desc', nulls: 'last' } },
        { googleRating: { sort: 'desc', nulls: 'last' } },
        { name: 'asc' },
      ],
      take,
    });
    const now = Date.now();
    return rows.map((r) => toPublicListing(r as unknown as PublicListingRow, now));
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'public-listings' },
      extra: { cities: q.cities ?? null, careLevel: q.careLevel ?? null, medicaidWaiver: q.medicaidWaiver ?? false },
    });
    return [];
  }
}
