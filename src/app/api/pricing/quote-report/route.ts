/**
 * POST /api/pricing/quote-report — no-login family quote report (the "Glassdoor" moat).
 *
 * After a tour/move-in, a family reports the ACTUAL quote they received. Token-gated
 * (src/lib/pricing/quote-token.ts) to one home. Writes an UNVERIFIED FacilityQuoteReport
 * (admin verifies before it counts toward FAMILY_AVG). Opt-in, and stores NO PHI —
 * quote figures + care level only; never diagnoses or medical detail.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyQuoteToken } from '@/lib/pricing/quote-token';
import { normalizePriceInt, QUOTE_CARE_LEVELS } from '@/lib/pricing/pricing';
import type { CareLevel } from '@prisma/client';

export async function POST(request: NextRequest) {
  const secret = process.env['NEXTAUTH_SECRET'];
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const payload = verifyQuoteToken(String(body['token'] || ''), secret);
  if (!payload) return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 401 });

  const careLevel = String(body['careLevel'] || '').toUpperCase() as CareLevel;
  if (!QUOTE_CARE_LEVELS.includes(careLevel)) {
    return NextResponse.json({ error: 'Please choose a care level.' }, { status: 400 });
  }
  const base = normalizePriceInt(body['quotedMonthlyBase']);
  if (base === null) return NextResponse.json({ error: 'Please enter the monthly base quote.' }, { status: 400 });

  const careAddOn = body['careAddOn'] == null ? null : normalizePriceInt(body['careAddOn']);
  const communityFee = body['communityFee'] == null ? null : normalizePriceInt(body['communityFee']);
  const moveInMonth = body['moveInMonth'] ? String(body['moveInMonth']).slice(0, 7) : null; // "YYYY-MM", coarse

  const home = await prisma.assistedLivingHome.findUnique({ where: { id: payload.homeId }, select: { id: true } });
  if (!home) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

  await prisma.facilityQuoteReport.create({
    data: {
      homeId: payload.homeId,
      careLevel,
      quotedMonthlyBase: base,
      careAddOn,
      communityFee,
      moveInMonth,
      verified: false, // admin reviews before it counts toward FAMILY_AVG
    },
  });

  return NextResponse.json({ ok: true });
}
