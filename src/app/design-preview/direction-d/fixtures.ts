/**
 * OL-202 — Direction D fixtures. SERVER-ONLY: the views below come from the
 * real availabilityView() / pricingView() / medicaidWaiverPublicView() helpers
 * (availability + pricing import Prisma), so page.tsx builds them and passes
 * plain JSON to the client preview. Every value here is a labeled preview
 * fixture — the point is to show each real data STATE the rollout must handle,
 * with the placeholder-majority case (no photo, no price, unverified) at least
 * half of every grid.
 */
import { availabilityView } from '@/lib/availability/availability';
import { pricingView } from '@/lib/pricing/pricing';
import { medicaidWaiverPublicView } from '@/lib/medicaid/waiver';
import type { SearchResultHome } from '@/components/search/SearchResultCard';

const DAY = 86_400_000;

type RawHome = {
  id: string;
  name: string;
  city: string;
  careLevel: string[];
  photo: string | null;
  claimed: boolean;
  featured?: boolean;
  verifiedDaysAgo?: number;
  availabilityCount?: number;
  availabilitySource?: 'OPERATOR' | 'PING' | 'AI_CALL';
  priceSource?: 'OPERATOR' | 'DP_ESTIMATE';
  startingPriceMonthly?: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  googleRating?: number;
  googleRatingCount?: number;
  medicaidWaiverStatus?: 'ACCEPTING_NEW' | 'CURRENT_RESIDENTS_ONLY';
  /** Preview-only caption naming the state the card demonstrates. */
  state: string;
};

// The five required states, plus one more typical unclaimed listing so the
// no-photo / no-price cards are exactly half the grid.
const RAW: RawHome[] = [
  {
    id: 'd-maple-grove',
    name: 'Maple Grove Senior Living',
    city: 'Westlake',
    careLevel: ['ASSISTED', 'MEMORY_CARE'],
    photo: '/images/homes/2.jpg',
    claimed: true,
    verifiedDaysAgo: 2,
    availabilityCount: 3,
    availabilitySource: 'AI_CALL',
    priceSource: 'OPERATOR',
    startingPriceMonthly: 3200,
    priceRangeLow: 3200,
    priceRangeHigh: 4800,
    googleRating: 4.6,
    googleRatingCount: 52,
    state: 'Claimed · photo · verified 2 days ago by AI call (3 open) · operator price range',
  },
  {
    id: 'd-cedar-ridge',
    name: 'Cedar Ridge Assisted Living',
    city: 'Parma',
    careLevel: ['ASSISTED'],
    photo: null,
    claimed: false,
    state: 'Unclaimed · no photo · no price · never verified',
  },
  {
    id: 'd-lakeshore',
    name: 'Lakeshore Commons',
    city: 'Lakewood',
    careLevel: ['ASSISTED', 'INDEPENDENT'],
    photo: '/images/homes/1.jpg',
    claimed: true,
    verifiedDaysAgo: 14,
    availabilityCount: 2,
    availabilitySource: 'PING',
    priceSource: 'DP_ESTIMATE',
    priceRangeLow: 3500,
    googleRating: 4.3,
    googleRatingCount: 27,
    state: 'Claimed · photo · verification 14 days old (stale) · DP-estimated price',
  },
  {
    id: 'd-brookside',
    name: 'Brookside Manor',
    city: 'Euclid',
    careLevel: ['ASSISTED'],
    photo: null,
    claimed: false,
    googleRating: 4.2,
    googleRatingCount: 18,
    medicaidWaiverStatus: 'ACCEPTING_NEW',
    state: 'Unclaimed · Google rating only · Medicaid waiver line · no photo, no price',
  },
  {
    id: 'd-willow-creek',
    name: 'Willow Creek Memory Care',
    city: 'Beachwood',
    careLevel: ['MEMORY_CARE'],
    photo: '/images/homes/2.jpg',
    claimed: true,
    featured: true,
    verifiedDaysAgo: 1,
    availabilityCount: 1,
    availabilitySource: 'OPERATOR',
    priceSource: 'OPERATOR',
    startingPriceMonthly: 5200,
    googleRating: 4.8,
    googleRatingCount: 41,
    state: 'Featured · verified yesterday by the operator (1 open) · operator price',
  },
  {
    id: 'd-parkview',
    name: 'Parkview Residence',
    city: 'Strongsville',
    careLevel: ['ASSISTED', 'MEMORY_CARE'],
    photo: null,
    claimed: false,
    state: 'Unclaimed · no photo · no price · never verified (the typical listing)',
  },
];

export type DirectionDCard = SearchResultHome & { state: string };

export type DirectionDData = {
  /** Every card in the family search grid (the result count is this length). */
  grid: DirectionDCard[];
  /** Dashboard "featured" row — half no-photo/no-price. */
  featured: DirectionDCard[];
  /** The facility shown on the profile preview. */
  profile: DirectionDCard;
  generatedAt: string;
};

function toCard(h: RawHome, now: number): DirectionDCard {
  const verifiedAt = h.verifiedDaysAgo == null ? null : new Date(now - h.verifiedDaysAgo * DAY);
  return {
    id: h.id,
    name: h.name,
    address: { city: h.city, state: 'OH' },
    careLevel: h.careLevel,
    imageUrl: h.photo,
    photoIsPlaceholder: h.photo == null,
    isUnclaimed: !h.claimed,
    isFeatured: !!h.featured,
    googleRating: h.googleRating ?? null,
    googleRatingCount: h.googleRatingCount ?? null,
    availabilityFreshness: availabilityView(
      {
        availabilityCount: h.availabilityCount ?? null,
        availabilityVerifiedAt: verifiedAt,
        availabilitySource: verifiedAt ? h.availabilitySource ?? 'OPERATOR' : null,
      },
      now,
    ),
    pricing: pricingView(
      {
        startingPriceMonthly: h.startingPriceMonthly ?? null,
        priceRangeLow: h.priceRangeLow ?? null,
        priceRangeHigh: h.priceRangeHigh ?? null,
        priceSource: h.priceSource ?? null,
        priceUpdatedAt: h.priceSource ? new Date(now - 5 * DAY) : null,
      },
      undefined,
      now,
    ),
    medicaidWaiver: medicaidWaiverPublicView({ medicaidWaiverStatus: h.medicaidWaiverStatus ?? null }),
    state: h.state,
  } as DirectionDCard;
}

export function buildDirectionDData(now: number = Date.now()): DirectionDData {
  const cards = RAW.map((h) => toCard(h, now));
  const byId = (id: string) => cards.find((c) => c.id === id)!;
  const data: DirectionDData = {
    grid: cards,
    featured: ['d-willow-creek', 'd-cedar-ridge', 'd-maple-grove', 'd-brookside'].map(byId),
    profile: byId('d-maple-grove'),
    generatedAt: new Date(now).toISOString(),
  };
  // Plain JSON across the server → client boundary (Dates become ISO strings,
  // exactly as /api/search delivers them).
  return JSON.parse(JSON.stringify(data));
}
