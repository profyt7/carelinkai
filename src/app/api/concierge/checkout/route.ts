/**
 * POST /api/concierge/checkout — "Book the concierge — $399" (sprint W5-3, G1).
 *
 * Behind CONCIERGE_CHECKOUT_ENABLED. Same intake body as /api/concierge/request.
 *   - flag unset → 409 { fallback: 'request' } (the UI shows "Request the concierge")
 *   - monthly cap reached → creates the WAITLIST request + order (no Stripe) and
 *     returns { waitlisted: true }
 *   - otherwise → PlacementSearch (conciergeStatus PENDING_PAYMENT) + ConciergeOrder
 *     (PENDING_PAYMENT) + a one-time Stripe Checkout Session from the existing
 *     Price STRIPE_PRICE_FAMILY_CONCIERGE → { url } for the redirect.
 * The webhook (checkout.session.completed) promotes the row to SUBMITTED / PAID.
 * Medicaid / Medicare / VA → 400 (never a price for the free lane).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { captureError } from '@/lib/sentry';
import { prisma } from '@/lib/prisma';
import type { PayerSource } from '@/lib/payer/payer-source';
import { createConciergePageRequest, FreeLaneRefused, mayRequestConcierge } from '@/lib/concierge/intake';
import { freeHelpPathFor } from '@/lib/concierge/screener';
import { capStatus, createOrder, createCheckoutSession, CheckoutUnavailable } from '@/lib/concierge/orders';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { clientIp, conciergeIntakeSchema, sessionUserId } from '@/lib/concierge/intake-schema';

const RATE_LIMIT_PER_10_MIN = 10;
const limiter = rateLimit({ interval: 10 * 60 * 1000, limit: RATE_LIMIT_PER_10_MIN });

export async function POST(request: NextRequest) {
  try {
    await limiter.check(RATE_LIMIT_PER_10_MIN, `concierge-checkout:${clientIp(request)}`);
  } catch {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const parsed = conciergeIntakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the form — your name, a valid email and the care needs are required.' }, { status: 400 });
  }
  const body = parsed.data;
  if (body.company_url) return NextResponse.json({ ok: true, id: null }, { status: 201 });

  const payerSource = body.payerSource as PayerSource;
  if (!mayRequestConcierge(payerSource)) {
    return NextResponse.json({ error: new FreeLaneRefused().message, freeHelp: freeHelpPathFor(payerSource) }, { status: 400 });
  }

  const cap = await capStatus();
  if (!cap.checkoutEnabled) {
    return NextResponse.json({ error: 'Online booking is not open yet — use "Request the concierge".', fallback: 'request' }, { status: 409 });
  }

  const intake = {
    payerSource,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    location: body.location,
    careNeeds: body.careNeeds,
    timeline: body.timeline,
    notes: body.notes,
  };
  const familyUserId = await sessionUserId();

  try {
    if (cap.capReached) {
      const row = await createConciergePageRequest(intake, { queueStatus: 'WAITLIST' });
      const order = await createOrder({ placementSearchId: row.id, familyUserId, email: body.contactEmail, status: 'WAITLIST' });
      return NextResponse.json({ ok: true, waitlisted: true, id: row.id, orderId: order.id, orderStatus: order.status }, { status: 201 });
    }

    const row = await createConciergePageRequest(intake, { queueStatus: 'PENDING_PAYMENT' });
    const order = await createOrder({ placementSearchId: row.id, familyUserId, email: body.contactEmail, status: 'PENDING_PAYMENT', amountCents: CONCIERGE_OFFER.priceCents });
    const session = await createCheckoutSession({ orderId: order.id, placementSearchId: row.id, email: body.contactEmail });
    await prisma.conciergeOrder.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });
    return NextResponse.json({ ok: true, id: row.id, orderId: order.id, orderStatus: order.status, url: session.url }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutUnavailable) {
      captureError(error, { tags: { feature: 'concierge-checkout' } });
      return NextResponse.json({ error: 'Online booking is temporarily unavailable — use "Request the concierge".', fallback: 'request' }, { status: 503 });
    }
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'concierge-checkout' }, extra: { payerSource } });
    return NextResponse.json({ error: 'We could not start the checkout. Please try again in a moment.' }, { status: 500 });
  }
}
