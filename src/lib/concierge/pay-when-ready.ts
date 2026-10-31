/**
 * Family Concierge, pay when ready (10/31) — the admin's three order actions.
 *
 *   1. "Shortlist ready — send payment link": the admin pastes a Stripe Payment Link (Phase 1: made by hand
 *      in the Stripe dashboard; no checkout flag, no Stripe API call). Allowed once the request's shortlist is
 *      saved (conciergeStatus SHORTLIST_READY) and the order is still REQUESTED_UNPAID. Stores the link and
 *      emails it to the family. Sending again replaces the link and re-sends.
 *   2. "Mark paid": REQUESTED_UNPAID → PAID (paidAt). The admin confirms the payment in Stripe first.
 *   3. "Release shortlist": PAID only. Stamps shortlistReleasedAt and emails the family a signed link to
 *      /concierge/shortlist/<token>. That page renders nothing until the order is PAID and released.
 *
 * Every change writes an EntityEvent (source ADMIN) with statuses and timestamps only — never the link,
 * the family's email or anything they told us.
 */

import type { ConciergeOrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent, type EventActor } from '@/lib/events/record-event';
import { captureError } from '@/lib/sentry';
import { sendConciergeFamilyEmail } from '@/lib/email';
import { conciergePaymentLinkEmail, conciergeShortlistReleasedEmail } from '@/lib/concierge/family-emails';
import { signShortlistToken, SHORTLIST_PATH_PREFIX } from '@/lib/concierge/shortlist-token';

/** Stripe Payment Links live on buy.stripe.com (live and test mode). Anything else is refused. */
export function isStripePaymentLinkUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' && u.hostname === 'buy.stripe.com' && u.pathname.length > 1 && !u.username && !u.password;
  } catch {
    return false;
  }
}

export type OrderActionResult = { ok: true; status: ConciergeOrderStatus; emailed?: boolean } | { ok: false; error: string; code: 400 | 404 | 409 | 500 };

type OrderRow = {
  id: string;
  status: ConciergeOrderStatus;
  email: string;
  amountCents: number;
  paymentLinkSentAt: Date | null;
  shortlistReleasedAt: Date | null;
  placementSearch: { id: string; conciergeStatus: string | null; curatedHomes: unknown } | null;
};

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  return prisma.conciergeOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, email: true, amountCents: true, paymentLinkSentAt: true, shortlistReleasedAt: true,
      placementSearch: { select: { id: true, conciergeStatus: true, curatedHomes: true } },
    },
  });
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

export async function sendPaymentLink(args: { orderId: string; paymentLinkUrl: string; actor: EventActor }): Promise<OrderActionResult> {
  const url = args.paymentLinkUrl.trim();
  if (!isStripePaymentLinkUrl(url)) return { ok: false, code: 400, error: 'Paste a Stripe Payment Link (https://buy.stripe.com/…).' };
  const order = await loadOrder(args.orderId);
  if (!order) return { ok: false, code: 404, error: 'Order not found' };
  if (order.status !== 'REQUESTED_UNPAID') return { ok: false, code: 409, error: `A payment link can only be sent for an unpaid request (this order is ${order.status}).` };
  if (!shortlistReady(order)) return { ok: false, code: 409, error: 'Save the shortlist first — the payment link goes out only when it is ready.' };
  const sentAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.conciergeOrder.update({ where: { id: order.id }, data: { paymentLinkUrl: url, paymentLinkSentAt: sentAt } });
    await recordEvent(tx, {
      entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.payment_link_sent', field: 'paymentLinkSentAt',
      oldValue: order.paymentLinkSentAt ? { sentAt: order.paymentLinkSentAt.toISOString() } : null,
      newValue: { status: order.status, sentAt: sentAt.toISOString(), count: curatedCount(order.placementSearch?.curatedHomes) },
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
  if (order.status !== 'REQUESTED_UNPAID') return { ok: false, code: 409, error: `Only an unpaid request can be marked paid (this order is ${order.status}).` };
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

export async function releaseShortlist(args: { orderId: string; actor: EventActor }): Promise<OrderActionResult> {
  const order = await loadOrder(args.orderId);
  if (!order) return { ok: false, code: 404, error: 'Order not found' };
  if (order.status !== 'PAID') return { ok: false, code: 409, error: 'Mark the order paid before releasing the shortlist.' };
  if (!shortlistReady(order)) return { ok: false, code: 409, error: 'There is no saved shortlist to release.' };
  const link = shortlistUrlFor(order.id);
  if (!link) {
    captureError(new Error('NEXTAUTH_SECRET missing: cannot sign a concierge shortlist link'), { tags: { feature: 'concierge-pay-when-ready' } });
    return { ok: false, code: 500, error: 'Could not create the shortlist link.' };
  }
  const releasedAt = order.shortlistReleasedAt ?? new Date();
  await prisma.$transaction(async (tx) => {
    if (!order.shortlistReleasedAt) await tx.conciergeOrder.update({ where: { id: order.id }, data: { shortlistReleasedAt: releasedAt } });
    await recordEvent(tx, {
      entityType: 'CONCIERGE_ORDER', entityId: order.id, eventType: 'order.shortlist_released', field: 'shortlistReleasedAt',
      oldValue: order.shortlistReleasedAt ? { sentAt: order.shortlistReleasedAt.toISOString() } : null,
      newValue: { status: 'PAID', sentAt: new Date().toISOString(), count: curatedCount(order.placementSearch?.curatedHomes) },
      source: 'ADMIN', actor: args.actor,
    });
  });
  const emailed = await sendConciergeFamilyEmail({ toEmail: order.email, email: conciergeShortlistReleasedEmail({ shortlistUrl: link }), kind: 'shortlist_released' });
  return { ok: true, status: 'PAID', emailed };
}
