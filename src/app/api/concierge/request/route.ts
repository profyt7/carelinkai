/**
 * POST /api/concierge/request — "Request concierge help" from /concierge
 * (sprint W4 0a). Public (the family has no account yet). Creates a request in
 * the EXISTING DP concierge queue tagged source=concierge_page, carrying the
 * screener answer (payer lane). Private-pay lanes only: a Medicaid / Medicare /
 * VA / not-sure answer is refused (400) — the page never shows them the CTA.
 *
 * Guards: zod, honeypot, per-IP limiter (10 / 10 min). No Stripe, no fee path.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { captureError } from '@/lib/sentry';
import { PAYER_SOURCE_VALUES } from '@/lib/payer/payer-source';
import { createConciergePageRequest, FreeLaneRefused } from '@/lib/concierge/intake';

const RATE_LIMIT_PER_10_MIN = 10;
const limiter = rateLimit({ interval: 10 * 60 * 1000, limit: RATE_LIMIT_PER_10_MIN });

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

const bodySchema = z.object({
  payerSource: z.enum(PAYER_SOURCE_VALUES as unknown as [string, ...string[]]),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().toLowerCase().email().max(254),
  contactPhone: optionalText(40),
  location: optionalText(120),
  careNeeds: z.string().trim().min(5).max(2000),
  timeline: optionalText(120),
  notes: optionalText(2000),
  /** Honeypot — hidden input, people never fill it. */
  company_url: z.string().max(300).optional(),
});

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    await limiter.check(RATE_LIMIT_PER_10_MIN, `concierge-request:${clientIp(request)}`);
  } catch {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the form — your name, a valid email and the care needs are required.' }, { status: 400 });
  }
  const body = parsed.data;
  if (body.company_url) {
    return NextResponse.json({ ok: true, id: null, source: 'concierge_page' }, { status: 201 });
  }

  try {
    const row = await createConciergePageRequest({
      payerSource: body.payerSource as (typeof PAYER_SOURCE_VALUES)[number],
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      location: body.location,
      careNeeds: body.careNeeds,
      timeline: body.timeline,
      notes: body.notes,
    });
    return NextResponse.json({ ok: true, id: row.id, source: 'concierge_page', status: 'SUBMITTED' }, { status: 201 });
  } catch (error) {
    if (error instanceof FreeLaneRefused) {
      return NextResponse.json({ error: error.message, freeHelp: '/cleveland' }, { status: 400 });
    }
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'concierge-page' },
      extra: { payerSource: body.payerSource }, // no contact details
    });
    return NextResponse.json({ error: 'We could not save your request. Please try again.' }, { status: 500 });
  }
}
