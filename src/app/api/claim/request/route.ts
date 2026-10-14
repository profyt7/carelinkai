/**
 * POST /api/claim/request — cohort "claim your listing" submit (sprint W3 item 2).
 *
 * Public (no session): the cohort landing pages are logged-out SEO pages and
 * the people submitting (agency owners / schedulers) have no account yet.
 * Creates ONE append-only ClaimRequest row tagged with the cohort. Nothing
 * here sends email, starts a drip, or touches the operator/claim-drip tables.
 *
 * Two entry paths, both tagged with the cohort:
 *   - landing page form              → source 'landing_page'
 *   - cohort claim link (/claim?token=…, token carried into the form)
 *                                     → source 'claim_link', tokenEmail set,
 *                                       cohort taken from the VERIFIED token
 *
 * Abuse guards: zod validation, 2 KB field caps, honeypot field, and a
 * per-IP limiter (30 / 10 min — generous enough for an office NAT, still a
 * hard cap on a bot). The response never echoes free-text back.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { captureError } from '@/lib/sentry';
import { verifyClaimToken } from '@/lib/claim-token';
import {
  AGENCY_SERVICE_TYPES,
  CLAIM_COHORTS,
  isClaimCohort,
  type ClaimCohort,
  type ClaimRequestSource,
} from '@/lib/claim-engine/cohorts';

const RATE_LIMIT_PER_10_MIN = 30;
const limiter = rateLimit({ interval: 10 * 60 * 1000, limit: RATE_LIMIT_PER_10_MIN });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const bodySchema = z.object({
  cohort: z.enum(CLAIM_COHORTS),
  orgName: z.string().trim().min(2).max(200),
  contactName: optionalText(120),
  contactEmail: z.string().trim().toLowerCase().email().max(254),
  phone: optionalText(40),
  website: optionalText(300),
  city: optionalText(120),
  serviceTypes: z.array(z.enum(AGENCY_SERVICE_TYPES)).max(AGENCY_SERVICE_TYPES.length).optional(),
  message: optionalText(2000),
  /** Cohort claim-link token, when the visitor arrived via /claim?token=… */
  token: z.string().max(2048).optional(),
  /** Honeypot — real users never fill it (hidden input). */
  company_url: z.string().max(300).optional(),
});

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    await limiter.check(RATE_LIMIT_PER_10_MIN, `claim-request:${clientIp(request)}`);
  } catch {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the form — organization name and a valid email are required.' },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // Honeypot: pretend success, store nothing.
  if (body.company_url) {
    return NextResponse.json({ ok: true, id: null, cohort: body.cohort, source: 'landing_page' }, { status: 201 });
  }

  // A cohort claim link upgrades the record: the cohort comes from the signed
  // token (not the form) and the token's email is kept as proof of link use.
  let cohort: ClaimCohort = body.cohort;
  let source: ClaimRequestSource = 'landing_page';
  let tokenEmail: string | undefined;
  if (body.token) {
    const payload = verifyClaimToken(body.token, process.env['NEXTAUTH_SECRET'] || '');
    if (payload && isClaimCohort(payload.cohort)) {
      cohort = payload.cohort;
      source = 'claim_link';
      tokenEmail = payload.operatorEmail.toLowerCase();
    }
    // Invalid/expired token → still accept the submit as a plain landing-page
    // claim (the person is real; the link just aged out). Not an oracle.
  }

  try {
    const created = await prisma.claimRequest.create({
      data: {
        cohort,
        orgName: body.orgName,
        contactName: body.contactName ?? null,
        contactEmail: body.contactEmail,
        phone: body.phone ?? null,
        website: body.website ?? null,
        city: body.city ?? null,
        serviceTypes: body.serviceTypes ?? [],
        message: body.message ?? null,
        source,
        tokenEmail: tokenEmail ?? null,
      },
      select: { id: true, cohort: true, source: true, tokenEmail: true, serviceTypes: true },
    });
    return NextResponse.json(
      {
        ok: true,
        id: created.id,
        cohort: created.cohort,
        source: created.source,
        verified: !!created.tokenEmail,
        serviceTypes: created.serviceTypes.length,
      },
      { status: 201 }
    );
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'claim-request' },
      extra: { cohort, source }, // no contact details in the error context
    });
    return NextResponse.json({ error: 'We could not save your request. Please try again.' }, { status: 500 });
  }
}
