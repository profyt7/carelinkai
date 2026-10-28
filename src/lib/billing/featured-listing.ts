/**
 * OL-190 — featured listing ($79 / 30 days) as a standalone purchase.
 *
 * Two ways to pay:
 * - Operators with an ACTIVE subscription: the fee is queued as an invoice
 *   item on their next invoice (the original path).
 * - Everyone else (no subscription, trialing founder cohort, past due, …):
 *   a one-off Stripe Checkout. The home is featured only once the webhook sees
 *   checkout.session.completed with payment_status "paid".
 */
import type Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { featuredListingFeeCents } from '@/lib/billing/fees';

export const FEATURED_LISTING_METADATA_TYPE = 'FEATURED_LISTING';

export function featuredListingDays(): number {
  const n = Number(process.env['FEATURED_LISTING_DAYS'] ?? '30');
  return Number.isInteger(n) && n > 0 ? n : 30;
}

/** Invoice-item billing only for operators paying now; a trialing founder would not be billed for months. */
export function billsFeaturedOnInvoice(operator: {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
}): boolean {
  return !!operator.stripeCustomerId && !!operator.stripeSubscriptionId && operator.subscriptionStatus === 'ACTIVE';
}

// One definition of "active featured", shared with search / hub ranking (OL-191).
export { isFeaturedActive } from '@/lib/directory/featured-rank';

/** A purchase extends from the later of now and the current expiry, so buying early never loses days. */
export function extendFeaturedUntil(current: Date | null, now = new Date(), days = featuredListingDays()): Date {
  const base = current && current > now ? current : now;
  return new Date(base.getTime() + days * 86_400_000);
}

export function isFeaturedListingCheckout(cs: Stripe.Checkout.Session): boolean {
  return cs.metadata?.['type'] === FEATURED_LISTING_METADATA_TYPE;
}

export type FeaturedFulfilResult = 'fulfilled' | 'duplicate' | 'unpaid' | 'invalid';

/**
 * Fulfil a paid featured-listing Checkout. Idempotent on the session id: the
 * Payment row (unique stripePaymentId) is written in the same transaction as
 * the home update, so a replayed or concurrent delivery cannot extend twice.
 */
export async function fulfilFeaturedListingCheckout(cs: Stripe.Checkout.Session): Promise<FeaturedFulfilResult> {
  const homeId = cs.metadata?.['homeId'];
  const operatorId = cs.metadata?.['operatorId'];
  if (!homeId || !operatorId) {
    logger.warn('featured_listing_checkout_invalid', { sessionId: cs.id });
    return 'invalid';
  }
  if (cs.payment_status !== 'paid') {
    logger.info('featured_listing_checkout_unpaid', { sessionId: cs.id, paymentStatus: cs.payment_status });
    return 'unpaid';
  }

  const existing = await prisma.payment.findUnique({ where: { stripePaymentId: cs.id }, select: { id: true } });
  if (existing) return 'duplicate';

  try {
    await prisma.$transaction(async (tx) => {
      const home = await tx.assistedLivingHome.findUnique({
        where: { id: homeId },
        select: { id: true, name: true, featuredUntil: true, operator: { select: { id: true, userId: true } } },
      });
      if (!home || home.operator.id !== operatorId) throw new FeaturedInvalid();

      const amountCents = cs.amount_total ?? featuredListingFeeCents();
      await tx.payment.create({
        data: {
          userId: home.operator.userId,
          amount: amountCents / 100,
          status: 'COMPLETED',
          type: 'FEATURED_LISTING_FEE',
          stripePaymentId: cs.id,
          description: `Featured listing — ${home.name} (${featuredListingDays()} days, Checkout)`,
        },
      });
      const featuredUntil = extendFeaturedUntil(home.featuredUntil);
      await tx.assistedLivingHome.update({
        where: { id: home.id },
        data: { isFeatured: true, featuredUntil },
      });
      logger.info('featured_listing_checkout_fulfilled', { sessionId: cs.id, homeId, operatorId, featuredUntil: featuredUntil.toISOString() });
    });
    return 'fulfilled';
  } catch (err) {
    if (err instanceof FeaturedInvalid) {
      logger.warn('featured_listing_checkout_home_mismatch', { sessionId: cs.id, homeId, operatorId });
      return 'invalid';
    }
    // A concurrent delivery won the unique stripePaymentId; its transaction did the work.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return 'duplicate';
    throw err;
  }
}

class FeaturedInvalid extends Error {}
