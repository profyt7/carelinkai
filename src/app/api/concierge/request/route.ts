/**
 * POST /api/concierge/request — "Request the concierge" from /concierge
 * (sprint W4 0a, W5-3). Public (the family may have no account). Creates a
 * request in the EXISTING DP concierge queue tagged source=concierge_page,
 * carrying the screener answer (payer lane), plus a ConciergeOrder:
 *   - REQUESTED_UNPAID — the unpaid path (CONCIERGE_CHECKOUT_ENABLED unset, or a
 *     family who chose to request rather than pay);
 *   - WAITLIST — monthly capacity (CONCIERGE_MONTHLY_CAP) is reached.
 * Medicaid / Medicare / VA answers are refused (400) — the page never shows them
 * the CTA. Paying happens in /api/concierge/checkout, not here.
 *
 * Guards: zod, honeypot, per-IP limiter (10 / 10 min). No Stripe in this file.
 */

export const dynamic = 'force-dynamic';

import { sendConciergeFamilyEmail } from '@/lib/email';
import { conciergeConfirmationEmail } from '@/lib/concierge/family-emails';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { captureError } from '@/lib/sentry';
import type { PayerSource } from '@/lib/payer/payer-source';
import { createConciergePageRequest, FreeLaneRefused } from '@/lib/concierge/intake';
import { freeHelpPathFor } from '@/lib/concierge/screener';
import { capStatus, createOrder } from '@/lib/concierge/orders';
import { clientIp, conciergeIntakeSchema, sessionUserId } from '@/lib/concierge/intake-schema';
import { recordSmsConsent } from '@/lib/consent/sms-consent-server';
import { SMS_CONSENT_FORMS } from '@/lib/consent/sms-consent';

const RATE_LIMIT_PER_10_MIN = 10;
const limiter = rateLimit({ interval: 10 * 60 * 1000, limit: RATE_LIMIT_PER_10_MIN });

export async function POST(request: NextRequest) {
  try {
    await limiter.check(RATE_LIMIT_PER_10_MIN, `concierge-request:${clientIp(request)}`);
  } catch {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const parsed = conciergeIntakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the form — your name, a valid email and the care needs are required.' }, { status: 400 });
  }
  const body = parsed.data;
  if (body.company_url) {
    return NextResponse.json({ ok: true, id: null, source: 'concierge_page' }, { status: 201 });
  }

  try {
    const cap = await capStatus();
    const queueStatus = cap.capReached ? 'WAITLIST' : 'SUBMITTED';
    const row = await createConciergePageRequest(
      {
        payerSource: body.payerSource as PayerSource,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        location: body.location,
        careNeeds: body.careNeeds,
        timeline: body.timeline,
        notes: body.notes,
      },
      { queueStatus },
    );
    const familyUserId = await sessionUserId();
    await recordSmsConsent({
      consent: body.smsConsent,
      sourceForm: SMS_CONSENT_FORMS.CONCIERGE_REQUEST,
      phone: body.contactPhone ?? null,
      req: request,
      userId: familyUserId,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      leadId: row.id,
    });
    const order = await createOrder({
      placementSearchId: row.id,
      familyUserId,
      email: body.contactEmail,
      status: cap.capReached ? 'WAITLIST' : 'REQUESTED_UNPAID',
    });
    // Pay when ready (10/31): confirm to the family — the terms, what happens next, our phone number.
    // Never their care needs or other case details. Fire-and-forget: a mail hiccup never fails the request.
    // Promise.resolve().then(...) so even a synchronous throw can't turn a saved request into a 500.
    void Promise.resolve()
      .then(() =>
        sendConciergeFamilyEmail({
          toEmail: body.contactEmail,
          email: conciergeConfirmationEmail({ waitlisted: order.status === 'WAITLIST' }),
          kind: 'confirmation',
        }),
      )
      .catch((e) => captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'concierge-family-email' } }));
    return NextResponse.json(
      { ok: true, id: row.id, source: 'concierge_page', status: queueStatus, orderId: order.id, orderStatus: order.status },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FreeLaneRefused) {
      return NextResponse.json({ error: error.message, freeHelp: freeHelpPathFor(body.payerSource as PayerSource) }, { status: 400 });
    }
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'concierge-page' },
      extra: { payerSource: body.payerSource }, // no contact details
    });
    return NextResponse.json({ error: 'We could not save your request. Please try again in a moment.' }, { status: 500 });
  }
}
