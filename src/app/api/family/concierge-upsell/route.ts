/**
 * Family dashboard concierge card (sprint W5-3, G1 f). FAMILY-only.
 *
 * GET  → { card: 'paid' | 'free' | null, lane }
 *   - 'paid'  : last payer-lane answer is private funds / LTC / unknown AND the
 *               family has no PAID / REQUESTED_UNPAID order AND not dismissed
 *   - 'free'  : last answer is Medicaid / Medicare / VA → free-help card (never the paid one)
 *   - null    : dismissed within 30 days, or already a concierge customer
 * POST { dismiss: true } → hides the paid card for 30 days (per user, server-side).
 *
 * The "last payer-lane answer" is the newest payerSource across the family's
 * inquiries, placement searches and concierge orders. No PHI leaves this route.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import type { PayerSource } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { ACTIVE_ORDER_STATUSES, isDismissed, upsellCardForLane } from '@/lib/concierge/offer';

async function lastPayerSource(userId: string, email: string | null): Promise<PayerSource | null> {
  const [family, search] = await Promise.all([
    prisma.family.findUnique({ where: { userId }, select: { id: true } }),
    prisma.placementSearch.findFirst({ where: { userId, payerSource: { not: null } }, orderBy: { createdAt: 'desc' }, select: { payerSource: true, createdAt: true } }),
  ]);
  const inquiry = family
    ? await prisma.inquiry.findFirst({ where: { familyId: family.id, payerSource: { not: null } }, orderBy: { createdAt: 'desc' }, select: { payerSource: true, createdAt: true } })
    : null;
  // A concierge-page request made while signed in (or with the same email) carries the screener answer too.
  const order = await prisma.conciergeOrder.findFirst({
    where: { OR: [{ familyUserId: userId }, ...(email ? [{ email: email.toLowerCase() }] : [])], placementSearchId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, placementSearch: { select: { payerSource: true } } },
  });
  const candidates = [
    search ? { at: search.createdAt, v: search.payerSource } : null,
    inquiry ? { at: inquiry.createdAt, v: inquiry.payerSource } : null,
    order?.placementSearch?.payerSource ? { at: order.createdAt, v: order.placementSearch.payerSource } : null,
  ].filter((c): c is { at: Date; v: PayerSource } => !!c && !!c.v);
  candidates.sort((a, b) => b.at.getTime() - a.at.getTime());
  return candidates[0]?.v ?? null;
}

export async function GET() {
  let user: { id: string; email?: string | null };
  try {
    user = (await requireRole([UserRole.FAMILY])) as { id: string; email?: string | null };
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const [family, dbUser] = await Promise.all([
    prisma.family.findUnique({ where: { userId: user.id }, select: { conciergeUpsellDismissedAt: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }),
  ]);
  const email = dbUser?.email ?? null;
  const lane = await lastPayerSource(user.id, email);
  const card = upsellCardForLane(lane);
  if (card === 'free') return NextResponse.json({ card: 'free', lane });

  const active = await prisma.conciergeOrder.count({
    where: { status: { in: [...ACTIVE_ORDER_STATUSES] }, OR: [{ familyUserId: user.id }, ...(email ? [{ email: email.toLowerCase() }] : [])] },
  });
  if (active > 0) return NextResponse.json({ card: null, lane, reason: 'active_order' });
  if (isDismissed(family?.conciergeUpsellDismissedAt)) return NextResponse.json({ card: null, lane, reason: 'dismissed' });
  return NextResponse.json({ card: 'paid', lane });
}

export async function POST(request: NextRequest) {
  let user: { id: string };
  try {
    user = (await requireRole([UserRole.FAMILY])) as { id: string };
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (body?.dismiss !== true) return NextResponse.json({ error: 'dismiss: true required' }, { status: 400 });
  await prisma.family.updateMany({ where: { userId: user.id }, data: { conciergeUpsellDismissedAt: new Date() } });
  return NextResponse.json({ ok: true, dismissedDays: 30 });
}
