/**
 * Family Concierge orders (sprint W5-3, G1): capacity, Stripe Checkout, webhooks.
 *
 *  - `monthlyCommittedCount` → how many slots this calendar month are taken
 *    (PAID + REQUESTED_UNPAID); `capStatus` compares against CONCIERGE_MONTHLY_CAP.
 *  - `createOrder` writes a ConciergeOrder + its EntityEvent in one transaction.
 *  - `createCheckoutSession` builds a one-time Stripe Checkout Session from
 *    STRIPE_PRICE_FAMILY_CONCIERGE (never creates products/prices).
 *  - `handleConciergeStripeEvent` processes checkout.session.completed /
 *    checkout.session.expired / charge.refunded, idempotent on the Stripe event
 *    id (StripeWebhookEvent primary key). On PAID: the queue row becomes
 *    SUBMITTED and admins get one in-app notification + one email (admin
 *    address only, never the family's details).
 *
 * No PHI anywhere here — orders carry an email, ids, statuses and cents.
 */

import type Stripe from 'stripe';
import type { ConciergeOrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent, type EventActor } from '@/lib/events/record-event';
import { captureError } from '@/lib/sentry';
import { sendConciergePaidNotification } from '@/lib/email';
import { createInAppNotification } from '@/lib/services/notifications';
import {
  CONCIERGE_OFFER,
  CONCIERGE_THANKS_PATH,
  COMMITTED_ORDER_STATUSES,
  isCapReached,
  isCheckoutEnabled,
  monthlyCap,
  monthStart,
  conciergeCtaMode,
  type ConciergeCtaMode,
} from '@/lib/concierge/offer';

export const CONCIERGE_CHECKOUT_METADATA_TYPE = 'FAMILY_CONCIERGE';

export async function monthlyCommittedCount(now: Date = new Date()): Promise<number> {
  return prisma.conciergeOrder.count({
    where: { status: { in: [...COMMITTED_ORDER_STATUSES] }, createdAt: { gte: monthStart(now) } },
  });
}

export type CapStatus = { checkoutEnabled: boolean; cap: number; committed: number; capReached: boolean; mode: ConciergeCtaMode };

export async function capStatus(now: Date = new Date()): Promise<CapStatus> {
  const cap = monthlyCap();
  const committed = await monthlyCommittedCount(now);
  const capReached = isCapReached(committed, cap);
  const checkoutEnabled = isCheckoutEnabled();
  return { checkoutEnabled, cap, committed, capReached, mode: conciergeCtaMode({ checkoutEnabled, capReached }) };
}

export type CreateOrderInput = {
  placementSearchId: string | null;
  familyUserId?: string | null;
  email: string;
  status: ConciergeOrderStatus;
  stripeCheckoutSessionId?: string | null;
  amountCents?: number;
  actor?: EventActor | null;
};

/** Create the order and its `order.created` history row together. */
export async function createOrder(input: CreateOrderInput, tx?: Prisma.TransactionClient): Promise<{ id: string; status: ConciergeOrderStatus }> {
  const run = async (t: Prisma.TransactionClient) => {
    const order = await t.conciergeOrder.create({
      data: {
        placementSearchId: input.placementSearchId,
        familyUserId: input.familyUserId ?? null,
        email: input.email.trim().toLowerCase(),
        status: input.status,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
        amountCents: input.amountCents ?? CONCIERGE_OFFER.priceCents,
      },
      select: { id: true, status: true },
    });
    await recordEvent(t, {
      entityType: 'CONCIERGE_ORDER',
      entityId: order.id,
      eventType: 'order.created',
      field: 'status',
      oldValue: null,
      newValue: { status: order.status, searchId: input.placementSearchId, amountCents: input.amountCents ?? CONCIERGE_OFFER.priceCents },
      source: 'FAMILY',
      actor: input.actor ?? null,
    });
    return order;
  };
  return tx ? run(tx) : prisma.$transaction(run);
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

export class CheckoutUnavailable extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'CheckoutUnavailable';
  }
}

/**
 * One-time Stripe Checkout Session for the $399 concierge. Uses the existing
 * Price (env STRIPE_PRICE_FAMILY_CONCIERGE); never creates products or prices.
 */
export async function createCheckoutSession(args: { orderId: string; placementSearchId: string; email: string }): Promise<{ id: string; url: string }> {
  const price = process.env['STRIPE_PRICE_FAMILY_CONCIERGE'];
  if (!price) throw new CheckoutUnavailable('STRIPE_PRICE_FAMILY_CONCIERGE is not set');
  const { stripe } = await import('@/lib/stripe');
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price, quantity: 1 }],
    customer_email: args.email,
    client_reference_id: args.orderId,
    success_url: `${appUrl()}${CONCIERGE_THANKS_PATH}?order=${encodeURIComponent(args.orderId)}`,
    cancel_url: `${appUrl()}/concierge?canceled=1`,
    metadata: { type: CONCIERGE_CHECKOUT_METADATA_TYPE, orderId: args.orderId, placementSearchId: args.placementSearchId },
    payment_intent_data: { metadata: { type: CONCIERGE_CHECKOUT_METADATA_TYPE, orderId: args.orderId } },
  });
  if (!session.url) throw new CheckoutUnavailable('Stripe returned no checkout URL');
  return { id: session.id, url: session.url };
}

/* ------------------------------- webhooks -------------------------------- */

export type ConciergeWebhookResult = { handled: boolean; duplicate?: boolean; orderId?: string; status?: ConciergeOrderStatus };

/** Does this Stripe event belong to the concierge? (Decided before idempotency so other handlers are untouched.) */
export function isConciergeStripeEvent(event: Stripe.Event): boolean {
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.expired') {
    const cs = event.data.object as Stripe.Checkout.Session;
    return cs.metadata?.['type'] === CONCIERGE_CHECKOUT_METADATA_TYPE;
  }
  if (event.type === 'charge.refunded') {
    const ch = event.data.object as Stripe.Charge;
    return ch.metadata?.['type'] === CONCIERGE_CHECKOUT_METADATA_TYPE || !!ch.payment_intent;
  }
  return false;
}

/**
 * Record the event id first; a duplicate delivery (same evt_ id) is a no-op.
 * Returns false when the id was already processed.
 */
async function claimEvent(event: Stripe.Event): Promise<boolean> {
  try {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
    return true;
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2002') return false;
    throw e;
  }
}

export async function handleConciergeStripeEvent(event: Stripe.Event): Promise<ConciergeWebhookResult> {
  if (!isConciergeStripeEvent(event)) return { handled: false };

  if (event.type === 'charge.refunded') {
    const ch = event.data.object as Stripe.Charge;
    const pi = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id ?? null;
    const orderId = ch.metadata?.['orderId'] ?? null;
    const order = orderId
      ? await prisma.conciergeOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true } })
      : pi
        ? await prisma.conciergeOrder.findFirst({ where: { stripePaymentIntentId: pi }, select: { id: true, status: true } })
        : null;
    if (!order) return { handled: false }; // not ours (e.g. a wallet / ride charge)
    if (!(await claimEvent(event))) return { handled: true, duplicate: true, orderId: order.id, status: order.status };
    if (order.status === 'REFUNDED') return { handled: true, orderId: order.id, status: 'REFUNDED' };
    const refundedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.conciergeOrder.update({ where: { id: order.id }, data: { status: 'REFUNDED', refundedAt } });
      await recordEvent(tx, {
        entityType: 'CONCIERGE_ORDER',
        entityId: order.id,
        eventType: 'order.refunded',
        field: 'status',
        oldValue: { status: order.status },
        newValue: { status: 'REFUNDED', amountCents: ch.amount_refunded ?? null },
        source: 'STRIPE',
        occurredAt: refundedAt,
      });
    });
    return { handled: true, orderId: order.id, status: 'REFUNDED' };
  }

  const cs = event.data.object as Stripe.Checkout.Session;
  const orderId = cs.metadata?.['orderId'] ?? cs.client_reference_id ?? null;
  const order = orderId
    ? await prisma.conciergeOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, placementSearchId: true, familyUserId: true } })
    : await prisma.conciergeOrder.findUnique({ where: { stripeCheckoutSessionId: cs.id }, select: { id: true, status: true, placementSearchId: true, familyUserId: true } });
  if (!order) {
    captureError(new Error('Concierge checkout event for unknown order'), { tags: { feature: 'concierge-checkout' }, extra: { sessionId: cs.id, eventType: event.type } });
    return { handled: true };
  }
  if (!(await claimEvent(event))) return { handled: true, duplicate: true, orderId: order.id, status: order.status };

  if (event.type === 'checkout.session.expired') {
    if (order.status !== 'PENDING_PAYMENT') return { handled: true, orderId: order.id, status: order.status };
    await prisma.$transaction(async (tx) => {
      await tx.conciergeOrder.update({ where: { id: order.id }, data: { status: 'CANCELED' } });
      await recordEvent(tx, {
        entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.canceled', field: 'status',
        oldValue: { status: order.status }, newValue: { status: 'CANCELED' }, source: 'STRIPE',
      });
    });
    return { handled: true, orderId: order.id, status: 'CANCELED' };
  }

  // checkout.session.completed → PAID
  if (order.status === 'PAID' || order.status === 'REFUNDED') return { handled: true, orderId: order.id, status: order.status };
  const paidAt = new Date();
  const pi = typeof cs.payment_intent === 'string' ? cs.payment_intent : cs.payment_intent?.id ?? null;
  const amountCents = typeof cs.amount_total === 'number' ? cs.amount_total : CONCIERGE_OFFER.priceCents;
  await prisma.$transaction(async (tx) => {
    await tx.conciergeOrder.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt, stripePaymentIntentId: pi, stripeCheckoutSessionId: cs.id, amountCents },
    });
    await recordEvent(tx, {
      entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.paid', field: 'status',
      oldValue: { status: order.status }, newValue: { status: 'PAID', amountCents, searchId: order.placementSearchId },
      source: 'STRIPE', occurredAt: paidAt,
    });
    if (order.placementSearchId) {
      const ps = await tx.placementSearch.findUnique({ where: { id: order.placementSearchId }, select: { conciergeStatus: true } });
      if (ps && ps.conciergeStatus !== 'SUBMITTED' && ps.conciergeStatus !== 'MATCHING' && ps.conciergeStatus !== 'SHORTLIST_READY') {
        await tx.placementSearch.update({ where: { id: order.placementSearchId }, data: { conciergeStatus: 'SUBMITTED', conciergeSubmittedAt: paidAt } });
        await recordEvent(tx, {
          entityType: 'PLACEMENT_SEARCH', entityId: order.placementSearchId, eventType: 'status.changed', field: 'conciergeStatus',
          oldValue: { status: ps.conciergeStatus }, newValue: { status: 'SUBMITTED', orderId: order.id }, source: 'STRIPE', occurredAt: paidAt,
        });
      }
    }
  });

  // Admin notification: in-app for every admin + ONE email to the admin address. Never the family's details.
  void notifyAdminsConciergePaid({ orderId: order.id, placementSearchId: order.placementSearchId, amountCents }).catch((e) =>
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'concierge-checkout' }, extra: { orderId: order.id } }),
  );
  return { handled: true, orderId: order.id, status: 'PAID' };
}

export async function notifyAdminsConciergePaid(args: { orderId: string; placementSearchId: string | null; amountCents: number }): Promise<void> {
  const link = args.placementSearchId ? `/admin/concierge/${args.placementSearchId}` : '/admin/concierge';
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      createInAppNotification({
        userId: a.id,
        type: 'PAYMENT',
        title: `Family Concierge paid — $${(args.amountCents / 100).toFixed(0)}`,
        message: 'A family paid for the concierge. Open the request and start the intake call within one business day.',
        link,
        data: { orderId: args.orderId, placementSearchId: args.placementSearchId, amountCents: args.amountCents },
      }),
    ),
  );
  await sendConciergePaidNotification({ requestId: args.placementSearchId, orderId: args.orderId, amountCents: args.amountCents });
}
