/**
 * Provider pricing (10/29 decision; Revenue_Strategy §7, Supply_Growth_Plan_2026_10_29):
 *  - The provider LISTING is free (PROVIDER_LISTING_ENABLED). Nothing to buy.
 *  - Provider BOOST is $39/mo (PROVIDER_BOOST_ENABLED + STRIPE_PRICE_PROVIDER_BOOST): top placement
 *    in provider search, a "Boosted" badge, a higher photo limit and instant lead alerts.
 *    Boost buys visibility only. It never sets, implies or displays "Verified"; that stays
 *    `Provider.isVerified`, earned through credentials.
 *  - Founding providers: the first 25 get Boost free for 90 days. No card is captured and nothing
 *    auto-charges; on day 90 it lapses unless they subscribe.
 *  - PROVIDER_COMMISSION_ENABLED is a stub (see PAID_FEATURES): no code path reads it yet.
 * Pure helpers; no I/O.
 */
import type { Prisma, SubscriptionStatus } from '@prisma/client';

export const BOOST_PRICE_CENTS = 3900;
export const BOOST_PRICE_LABEL = '$39/mo';
export const FOUNDER_BOOST_SPOTS = 25;
export const FOUNDER_BOOST_DAYS = 90;

/** Photo limits. No provider photo gallery exists yet; this is the entitlement it will read. */
export const PROVIDER_PHOTO_LIMIT = { free: 3, boosted: 12 } as const;

export const BOOST_PERKS = [
  'Top placement in provider search',
  'A "Boosted" badge on your listing',
  'Instant email alert for every new family inquiry',
  `Up to ${PROVIDER_PHOTO_LIMIT.boosted} photos (free listings: ${PROVIDER_PHOTO_LIMIT.free}) when photo galleries launch`,
] as const;

/** The service types a free listing covers (existing Provider.serviceTypes values + labels). */
export const PROVIDER_SERVICE_SUMMARY = 'Rides & NEMT, home care, companionship, housekeeping, meals, home health and therapy';

const ACTIVE: SubscriptionStatus[] = ['ACTIVE', 'TRIALING'];

export type BoostFields = {
  boostStatus?: SubscriptionStatus | null;
  founderBoostEndsAt?: Date | string | null;
};

/** True while a paid Boost is active or a founding-provider Boost hasn't lapsed. */
export function isBoosted(p: BoostFields, now: Date = new Date()): boolean {
  if (p.boostStatus && ACTIVE.includes(p.boostStatus)) return true;
  if (p.founderBoostEndsAt && new Date(p.founderBoostEndsAt).getTime() > now.getTime()) return true;
  return false;
}

/** Prisma filters for "boosted now" and its exact complement (NULL-safe: NULL NOT IN … is NULL). */
export function boostedWhere(now: Date = new Date()): Prisma.ProviderWhereInput {
  return { OR: [{ boostStatus: { in: ACTIVE } }, { founderBoostEndsAt: { gt: now } }] };
}
export function notBoostedWhere(now: Date = new Date()): Prisma.ProviderWhereInput {
  return {
    AND: [
      { OR: [{ boostStatus: null }, { boostStatus: { notIn: ACTIVE } }] },
      { OR: [{ founderBoostEndsAt: null }, { founderBoostEndsAt: { lte: now } }] },
    ],
  };
}

/** Spots left in the founding-provider offer (never below 0, never above 25). */
export function founderSpotsLeft(claimed: number): number {
  return Math.max(0, Math.min(FOUNDER_BOOST_SPOTS, FOUNDER_BOOST_SPOTS - claimed));
}

/** The founding-provider window for a claim made at `now`. */
export function founderWindow(now: Date = new Date()): { startedAt: Date; endsAt: Date } {
  return { startedAt: now, endsAt: new Date(now.getTime() + FOUNDER_BOOST_DAYS * 24 * 60 * 60 * 1000) };
}

/**
 * Split one page of a "boosted first" list into the two DB reads it needs: boosted rows fill the
 * page first (in their own order), then the rest.
 */
export function twoTierPage(skip: number, take: number, boostedTotal: number) {
  const boostedSkip = Math.min(skip, boostedTotal);
  const boostedTake = Math.max(0, Math.min(take, boostedTotal - skip));
  const restSkip = Math.max(0, skip - boostedTotal);
  const restTake = take - boostedTake;
  return { boostedSkip, boostedTake, restSkip, restTake };
}

export function photoLimit(p: BoostFields, boostEnabled: boolean, now: Date = new Date()): number {
  return boostEnabled && isBoosted(p, now) ? PROVIDER_PHOTO_LIMIT.boosted : PROVIDER_PHOTO_LIMIT.free;
}
