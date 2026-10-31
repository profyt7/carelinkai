/**
 * Family Concierge, pay when ready — the only path (phase 1 10/31, phase 2 OL-248).
 *
 *   1. "Shortlist ready — send payment link": allowed once the shortlist is saved (conciergeStatus
 *      SHORTLIST_READY) and the order is REQUESTED_UNPAID. The link is CONCIERGE_PAYMENT_LINK_URL (a Stripe
 *      Payment Link Chris sets in Render) — or, only when that env var is unset, a buy.stripe.com link the
 *      admin pastes — with ?client_reference_id=<orderId>&prefilled_email=<email> appended so the payment
 *      comes back to this order. Stores it, emails it, starts the reminder / expiry clock.
 *   2. Payment: the Stripe webhook's checkout.session.completed whose client_reference_id is a concierge
 *      order marks it PAID (session id stored), releases the shortlist and emails the family their private
 *      link, and emails the admin "Paid" (`handlePaymentLinkCheckoutCompleted`). Idempotent on the Stripe
 *      event id; unknown or missing ids are ignored. "Mark paid" + "Release shortlist" stay as manual fallbacks.
 *   3. Sweep (hourly, via scripts/run-cron.js → /api/cron/concierge-orders): one reminder email to the
 *      family 3 days after the link went out if still unpaid; still unpaid at 14 days → EXPIRED + an admin
 *      email, no more family emails. "Reopen" puts an EXPIRED order back to REQUESTED_UNPAID (the admin then
 *      sends the link again, which restarts the 14-day clock; the one reminder is not repeated).
 *
 * Every change writes an EntityEvent with statuses and timestamps only — never the link, the family's email
 * or anything they told us.
 */

import type Stripe from 'stripe';
import type { ConciergeOrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent, type EventActor } from '@/lib/events/record-event';
import { captureError } from '@/lib/sentry';
import { logger } from '@/lib/logger';
import { sendConciergeAdminNotice, sendConciergeFamilyEmail, sendConciergePaidNotification } from '@/lib/email';
import { conciergePaymentLinkEmail, conciergePaymentReminderEmail, conciergeShortlistReleasedEmail } from '@/lib/concierge/family-emails';
import { signShortlistToken, SHORTLIST_PATH_PREFIX } from '@/lib/concierge/shortlist-token';
import { createInAppNotification } from '@/lib/services/notifications';

export const REMINDER_AFTER_DAYS = 3;
export const EXPIRE_AFTER_DAYS = 14;
const DAY = 24 * 3600 * 1000;

/** Stripe Payment Links live on buy.stripe.com (live and test mode). Anything else is refused. */
export function isStripePaymentLinkUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' && u.hostname === 'buy.stripe.com' && u.pathname.length > 1 && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** The configured Payment Link (CONCIERGE_PAYMENT_LINK_URL), or null when unset / not a buy.stripe.com link. */
export function configuredPaymentLink(env: NodeJS.ProcessEnv = process.env): string | null {
  const v = (env['CONCIERGE_PAYMENT_LINK_URL'] ?? '').trim();
  return v && isStripePaymentLinkUrl(v) ? v : null;
}

/** {URL}?client_reference_id={orderId}&prefilled_email={email} — keeps any params the link already has. */
export function paymentLinkFor(base: string, orderId: string, email: string): string {
  const u = new URL(base.trim());
  u.searchParams.set('client_reference_id', orderId);
  u.searchParams.set('prefilled_email', email);
  return u.toString();
}

export type OrderActionResult = { ok: true; status: ConciergeOrderStatus; emailed?: boolean } | { ok: false; error: string; code: 400 | 404 | 409 | 500 };

type OrderRow = {
  id: string;
  status: ConciergeOrderStatus;
  email: string;
  amountCents: number;
  paymentLinkUrl: string | null;
  paymentLinkSentAt: Date | null;
  shortlistReleasedAt: Date | null;
  paymentReminderSentAt: Date | null;
  expiredAt: Date | null;
  placementSearch: { id: string; conciergeStatus: string | null; curatedHomes: unknown } | null;
};

const ORDER_SELECT = {
  id: true, status: true, email: true, amountCents: true, paymentLinkUrl: true, paymentLinkSentAt: true,
  shortlistReleasedAt: true, paymentReminderSentAt: true, expiredAt: true,
  placementSearch: { select: { id: true, conciergeStatus: true, curatedHomes: true } },
} as const;

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  return prisma.conciergeOrder.findUnique({ where: { id: orderId }, select: ORDER_SELECT });
}

export function curatedCount(curatedHomes: unknown): number {
  return Array.isArray(curatedHomes) ? curatedHomes.length : 0;
}

function shortlistReady(o: OrderRow): boolean {
  return o.placementSearch?.conciergeStatus === 'SHORTLIST_READY' && curatedCount(o.placementSearch.curatedHomes) > 0;
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

export function shortlistUrlFor(orderId: string): string | null {
  const secret = process.env['NEXTAUTH_SECRET'];
  if (!secret) return null;
  return `${appUrl()}${SHORTLIST_PATH_PREFIX}${signShortlistToken(orderId, secret)}`;
}

/* ------------------------------ admin actions ----------------------------- */

export async function sendPaymentLink(args: { orderId: string; paymentLinkUrl?: string; actor: EventActor }): Promise<OrderActionResult> {
  const configured = configuredPaymentLink();
  const pasted = args.paymentLinkUrl?.trim() ?? '';
  const base = configured ?? pasted;
  if (!base || !isStripePaymentLinkUrl(base)) {
    return { ok: false, code: 400, error: 'Set CONCIERGE_PAYMENT_LINK_URL in Render, or paste a Stripe Payment Link (https://buy.stripe.com/…).' };
  }
  const order = await loadOrder(args.orderId);
  if (!order) return { ok: false, code: 404, error: 'Order not found' };
  if (order.status !== 'REQUESTED_UNPAID') return { ok: false, code: 409, error: `A payment link can only be sent for an unpaid request (this order is ${order.status}).` };
  if (!shortlistReady(order)) return { ok: false, code: 409, error: 'Save the shortlist first — the payment link goes out only when it is ready.' };
  const url = paymentLinkFor(base, order.id, order.email);
  const sentAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.conciergeOrder.update({ where: { id: order.id }, data: { paymentLinkUrl: url, paymentLinkSentAt: sentAt } });
    await recordEvent(tx, {
      entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.payment_link_sent', field: 'paymentLinkSentAt',
      oldValue: order.paymentLinkSentAt ? { sentAt: order.paymentLinkSentAt.toISOString() } : null,
      newValue: { status: order.status, sentAt: sentAt.toISOString(), count: curatedCount(order.placementSearch?.curatedHomes), source: configured ? 'env' : 'pasted' },
      source: 'ADMIN', actor: args.actor,
    });
  });
  const emailed = await sendConciergeFamilyEmail({ toEmail: order.email, email: conciergePaymentLinkEmail({ paymentLinkUrl: url }), kind: 'payment_link' });
  return { ok: true, status: order.status, emailed };
}

export async function markPaid(args: { orderId: string; actor: EventActor }): Promise<OrderActionResult> {
  const order = await loadOrder(args.orderId);
  if (!order) return { ok: false, code: 404, error: 'Order not found' };
  if (order.status === 'PAID') return { ok: true, status: 'PAID' };
  if (order.status !== 'REQUESTED_UNPAID' && order.status !== 'EXPIRED') {
    return { ok: false, code: 409, error: `Only an unpaid or expired request can be marked paid (this order is ${order.status}).` };
  }
  const paidAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.conciergeOrder.update({ where: { id: order.id }, data: { status: 'PAID', paidAt } });
    await recordEvent(tx, {
      entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.paid', field: 'status',
      oldValue: { status: order.status }, newValue: { status: 'PAID', amountCents: order.amountCents, occurredAt: paidAt.toISOString() },
      source: 'ADMIN', actor: args.actor, occurredAt: paidAt,
    });
  });
  return { ok: true, status: 'PAID' };
}

/** Stamp the release + email the family their private link. Shared by the admin action and the webhook. */
async function release(order: OrderRow, actor: EventActor | null, source: 'ADMIN' | 'STRIPE'): Promise<{ ok: boolean; emailed: boolean }> {
  const link = shortlistUrlFor(order.id);
  if (!link) {
    captureError(new Error('NEXTAUTH_SECRET missing: cannot sign a concierge shortlist link'), { tags: { feature: 'concierge-pay-when-ready' } });
    return { ok: false, emailed: false };
  }
  const releasedAt = order.shortlistReleasedAt ?? new Date();
  await prisma.$transaction(async (tx) => {
    if (!order.shortlistReleasedAt) await tx.conciergeOrder.update({ where: { id: order.id }, data: { shortlistReleasedAt: releasedAt } });
    await recordEvent(tx, {
      entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.shortlist_released', field: 'shortlistReleasedAt',
      oldValue: order.shortlistReleasedAt ? { sentAt: order.shortlistReleasedAt.toISOString() } : null,
      newValue: { status: 'PAID', sentAt: new Date().toISOString(), count: curatedCount(order.placementSearch?.curatedHomes) },
      source, actor,
    });
  });
  const emailed = await sendConciergeFamilyEmail({ toEmail: order.email, email: conciergeShortlistReleasedEmail({ shortlistUrl: link }), kind: 'shortlist_released' });
  return { ok: true, emailed };
}

export async function releaseShortlist(args: { orderId: string; actor: EventActor }): Promise<OrderActionResult> {
  const order = await loadOrder(args.orderId);
  if (!order) return { ok: false, code: 404, error: 'Order not found' };
  if (order.status !== 'PAID') return { ok: false, code: 409, error: 'Mark the order paid before releasing the shortlist.' };
  if (!shortlistReady(order)) return { ok: false, code: 409, error: 'There is no saved shortlist to release.' };
  const r = await release(order, args.actor, 'ADMIN');
  if (!r.ok) return { ok: false, code: 500, error: 'Could not create the shortlist link.' };
  return { ok: true, status: 'PAID', emailed: r.emailed };
}

/** EXPIRED → REQUESTED_UNPAID. Clears the expiry and the link timestamp; the admin re-sends the link. */
export async function reopenOrder(args: { orderId: string; actor: EventActor }): Promise<OrderActionResult> {
  const order = await loadOrder(args.orderId);
  if (!order) return { ok: false, code: 404, error: 'Order not found' };
  if (order.status !== 'EXPIRED') return { ok: false, code: 409, error: `Only an expired order can be reopened (this order is ${order.status}).` };
  await prisma.$transaction(async (tx) => {
    await tx.conciergeOrder.update({ where: { id: order.id }, data: { status: 'REQUESTED_UNPAID', expiredAt: null, paymentLinkSentAt: null } });
    await recordEvent(tx, {
      entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.reopened', field: 'status',
      oldValue: { status: 'EXPIRED' }, newValue: { status: 'REQUESTED_UNPAID' }, source: 'ADMIN', actor: args.actor,
    });
  });
  return { ok: true, status: 'REQUESTED_UNPAID' };
}

/* --------------------------------- webhook -------------------------------- */

async function claimEvent(event: Stripe.Event): Promise<boolean> {
  try {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
    return true;
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2002') return false;
    throw e;
  }
}

export type PaymentLinkWebhookResult = { handled: false } | { handled: true; orderId: string; status: ConciergeOrderStatus; duplicate?: boolean; released?: boolean };

/**
 * checkout.session.completed from the concierge Payment Link. `handled: false` (falls through to the other
 * handlers) unless client_reference_id is an existing concierge order. Duplicate deliveries and already-paid
 * orders change nothing.
 */
export async function handlePaymentLinkCheckoutCompleted(event: Stripe.Event): Promise<PaymentLinkWebhookResult> {
  if (event.type !== 'checkout.session.completed') return { handled: false };
  const cs = event.data.object as Stripe.Checkout.Session;
  const ref = typeof cs.client_reference_id === 'string' ? cs.client_reference_id.trim() : '';
  if (!ref || !/^[a-z0-9]{10,40}$/i.test(ref)) return { handled: false };
  const order = await loadOrder(ref);
  if (!order) return { handled: false };
  if (!(await claimEvent(event))) return { handled: true, orderId: order.id, status: order.status, duplicate: true };
  if (order.status === 'PAID' || order.status === 'REFUNDED' || order.status === 'CANCELED') {
    return { handled: true, orderId: order.id, status: order.status, duplicate: order.status === 'PAID' };
  }
  // A live acceptance test pays $0 with a one-time 100%-off promo code: Stripe reports
  // payment_status 'no_payment_required'. Accept that only when the discount covers the whole subtotal.
  const testPayment = isFullDiscountTestSession(cs);
  if (testPayment) logger.info('Concierge payment link: $0 test checkout (100% discount)', { orderId: order.id, sessionId: cs.id });
  if (!testPayment && cs.payment_status && cs.payment_status !== 'paid') {
    captureError(new Error('Concierge payment link session completed but not paid'), { tags: { feature: 'concierge-pay-when-ready' }, extra: { orderId: order.id, paymentStatus: cs.payment_status } });
    return { handled: true, orderId: order.id, status: order.status };
  }
  const paidAt = new Date();
  const pi = typeof cs.payment_intent === 'string' ? cs.payment_intent : cs.payment_intent?.id ?? null;
  const amountCents = typeof cs.amount_total === 'number' ? cs.amount_total : order.amountCents;
  await prisma.$transaction(async (tx) => {
    await tx.conciergeOrder.update({ where: { id: order.id }, data: { status: 'PAID', paidAt, stripeCheckoutSessionId: cs.id, stripePaymentIntentId: pi, amountCents } });
    await recordEvent(tx, {
      entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.paid', field: 'status',
      oldValue: { status: order.status }, newValue: { status: 'PAID', amountCents, source: testPayment ? 'payment_link_test' : 'payment_link' },
      source: 'STRIPE', occurredAt: paidAt,
    });
  });
  const paid: OrderRow = { ...order, status: 'PAID' };
  let released = false;
  if (shortlistReady(paid)) released = (await release(paid, null, 'STRIPE')).ok;
  void notifyAdminPaid({ orderId: order.id, placementSearchId: order.placementSearch?.id ?? null, amountCents, released }).catch((e) =>
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'concierge-pay-when-ready' }, extra: { orderId: order.id } }),
  );
  return { handled: true, orderId: order.id, status: 'PAID', released };
}

/** $0 because a discount covered the full (non-zero) subtotal — e.g. a one-time 100%-off test code. */
export function isFullDiscountTestSession(cs: Stripe.Checkout.Session): boolean {
  const subtotal = typeof cs.amount_subtotal === 'number' ? cs.amount_subtotal : 0;
  const discount = cs.total_details?.amount_discount ?? 0;
  return cs.amount_total === 0 && subtotal > 0 && discount >= subtotal && cs.payment_status === 'no_payment_required';
}

async function notifyAdminPaid(args: { orderId: string; placementSearchId: string | null; amountCents: number; released: boolean }): Promise<void> {
  const link = args.placementSearchId ? `/admin/concierge/${args.placementSearchId}` : '/admin/concierge';
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      createInAppNotification({
        userId: a.id,
        type: 'PAYMENT',
        title: `Family Concierge paid — $${(args.amountCents / 100).toFixed(0)}`,
        message: args.released ? 'Paid through the payment link. The shortlist was released to the family automatically.' : 'Paid through the payment link. Release the shortlist from the order panel.',
        link,
        data: { orderId: args.orderId, placementSearchId: args.placementSearchId, amountCents: args.amountCents },
      }),
    ),
  );
  await sendConciergePaidNotification({ requestId: args.placementSearchId, orderId: args.orderId, amountCents: args.amountCents });
}

/* ---------------------------------- sweep --------------------------------- */

export type SweepResult = { reminded: number; expired: number };

/** Hourly: the single reminder at 3 days, expiry at 14 days. Safe to run any number of times. */
export async function runConciergeOrderSweep(now: Date = new Date()): Promise<SweepResult> {
  const result: SweepResult = { reminded: 0, expired: 0 };

  // Expiry first, so an order past 14 days never gets a late reminder.
  const toExpire = await prisma.conciergeOrder.findMany({
    where: { status: 'REQUESTED_UNPAID', paymentLinkSentAt: { lte: new Date(now.getTime() - EXPIRE_AFTER_DAYS * DAY) } },
    select: { id: true, placementSearchId: true },
  });
  for (const o of toExpire) {
    const changed = await prisma.conciergeOrder.updateMany({ where: { id: o.id, status: 'REQUESTED_UNPAID' }, data: { status: 'EXPIRED', expiredAt: now } });
    if (changed.count !== 1) continue;
    await recordEvent(prisma, {
      entityType: 'CONCIERGE_ORDER', entityId: o.id, eventType: 'order.expired', field: 'status',
      oldValue: { status: 'REQUESTED_UNPAID' }, newValue: { status: 'EXPIRED', occurredAt: now.toISOString() }, source: 'SYSTEM', occurredAt: now,
    });
    result.expired++;
    void sendConciergeAdminNotice({
      subject: 'Family Concierge order expired (unpaid 14 days)',
      text: `A Family Concierge order was still unpaid ${EXPIRE_AFTER_DAYS} days after its payment link went out, so it is now EXPIRED. No more emails go to the family. You can reopen it from the order panel.`,
      requestId: o.placementSearchId,
    }).catch((e) => captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'concierge-pay-when-ready' } }));
  }

  const toRemind = await prisma.conciergeOrder.findMany({
    where: {
      status: 'REQUESTED_UNPAID',
      paymentReminderSentAt: null,
      paymentLinkUrl: { not: null },
      paymentLinkSentAt: { lte: new Date(now.getTime() - REMINDER_AFTER_DAYS * DAY), gt: new Date(now.getTime() - EXPIRE_AFTER_DAYS * DAY) },
    },
    select: { id: true, email: true, paymentLinkUrl: true },
  });
  for (const o of toRemind) {
    // Claim the reminder first (conditional update) so a concurrent run can never send it twice.
    const claimed = await prisma.conciergeOrder.updateMany({ where: { id: o.id, status: 'REQUESTED_UNPAID', paymentReminderSentAt: null }, data: { paymentReminderSentAt: now } });
    if (claimed.count !== 1) continue;
    await recordEvent(prisma, {
      entityType: 'CONCIERGE_ORDER', entityId: o.id, eventType: 'order.payment_reminder_sent', field: 'paymentReminderSentAt',
      oldValue: null, newValue: { status: 'REQUESTED_UNPAID', sentAt: now.toISOString() }, source: 'SYSTEM', occurredAt: now,
    });
    await sendConciergeFamilyEmail({ toEmail: o.email, email: conciergePaymentReminderEmail({ paymentLinkUrl: o.paymentLinkUrl! }), kind: 'payment_reminder' });
    result.reminded++;
  }
  return result;
}
