/**
 * Admin pricing controls (OL-111). ADMIN-only.
 *
 * GET  → pricing view (incl. FAMILY_AVG), verified/pending quote-report counts, and a
 *        quote-survey magic-link to send.
 * POST → set source-tagged pricing (OPERATOR / DP_ESTIMATE / PUBLIC), OR verify a
 *        pending family quote report (action=verify, reportId) which recomputes FAMILY_AVG.
 *
 * No PHI. Every write is admin-gated.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';
import type { PriceSource } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { pricingView, computeFamilyAvg, setHomePricing } from '@/lib/pricing/pricing';
import { signQuoteToken } from '@/lib/pricing/quote-token';

const SETTABLE: PriceSource[] = ['OPERATOR', 'DP_ESTIMATE', 'PUBLIC'];

function surveyLink(homeId: string): string | null {
  const secret = process.env['NEXTAUTH_SECRET'];
  if (!secret) return null;
  const base = (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
  return `${base}/quote/report?token=${encodeURIComponent(signQuoteToken(homeId, secret))}`;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, startingPriceMonthly: true, priceRangeLow: true, priceRangeHigh: true, priceSource: true, priceUpdatedAt: true, priceMin: true, priceMax: true },
  });
  if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const family = await computeFamilyAvg(home.id);
  const pending = await prisma.facilityQuoteReport.count({ where: { homeId: home.id, verified: false } });
  const reports = await prisma.facilityQuoteReport.findMany({
    where: { homeId: home.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, careLevel: true, quotedMonthlyBase: true, careAddOn: true, communityFee: true, moveInMonth: true, verified: true, createdAt: true },
  });
  return NextResponse.json({
    home: { id: home.id, name: home.name },
    view: pricingView(home, family),
    familyAvg: family,
    pending,
    reports,
    surveyLink: surveyLink(home.id),
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));

  // Verify a pending family quote report.
  if (body['action'] === 'verify' && body['reportId']) {
    await prisma.facilityQuoteReport.updateMany({
      where: { id: String(body['reportId']), homeId: params.id },
      data: { verified: true },
    });
    const family = await computeFamilyAvg(params.id);
    const h = await prisma.assistedLivingHome.findUnique({ where: { id: params.id }, select: { startingPriceMonthly: true, priceRangeLow: true, priceRangeHigh: true, priceSource: true, priceUpdatedAt: true, priceMin: true, priceMax: true } });
    return NextResponse.json({ ok: true, view: h ? pricingView(h, family) : null, familyAvg: family });
  }

  // Set source-tagged pricing.
  const source = String(body['source'] || '').toUpperCase() as PriceSource;
  if (!SETTABLE.includes(source)) {
    return NextResponse.json({ error: 'source must be OPERATOR, DP_ESTIMATE, or PUBLIC' }, { status: 400 });
  }
  const view = await setHomePricing({
    homeId: params.id,
    source,
    ...(('startingPriceMonthly' in body) ? { startingPriceMonthly: body['startingPriceMonthly'] as number | null } : {}),
    ...(('priceRangeLow' in body) ? { priceRangeLow: body['priceRangeLow'] as number | null } : {}),
    ...(('priceRangeHigh' in body) ? { priceRangeHigh: body['priceRangeHigh'] as number | null } : {}),
  });
  return NextResponse.json({ ok: true, view });
}
