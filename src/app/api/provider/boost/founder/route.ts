export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { paidFeatureDisabledResponse } from '@/lib/billing/paid-features';
import { FOUNDER_BOOST_SPOTS, founderSpotsLeft, founderWindow } from '@/lib/providers/boost';
import { errorSummary } from '@/lib/log-safe';

/**
 * Founding-provider offer: the first 25 providers get Boost free for 90 days.
 * No card is captured and no Stripe object is created, so nothing can auto-charge; Boost simply
 * lapses at founderBoostEndsAt unless the provider subscribes. Gated by PROVIDER_BOOST_ENABLED.
 *
 * GET  → { spotsLeft, total, claimed: { startedAt, endsAt } | null }
 * POST → claims a spot (409 if already claimed or all 25 are taken).
 */
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });

async function claimedCount(): Promise<number> {
  return prisma.provider.count({ where: { founderBoostStartedAt: { not: null } } });
}

export async function GET() {
  const off = paidFeatureDisabledResponse('PROVIDER_BOOST');
  if (off) return off;
  const session = await getServerSession(authOptions);
  const mine = session?.user?.id
    ? await prisma.provider.findUnique({ where: { userId: session.user.id }, select: { founderBoostStartedAt: true, founderBoostEndsAt: true } })
    : null;
  return json({
    total: FOUNDER_BOOST_SPOTS,
    spotsLeft: founderSpotsLeft(await claimedCount()),
    claimed: mine?.founderBoostStartedAt ? { startedAt: mine.founderBoostStartedAt, endsAt: mine.founderBoostEndsAt } : null,
  });
}

export async function POST() {
  const off = paidFeatureDisabledResponse('PROVIDER_BOOST');
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ error: 'Unauthorized' }, 401);
  if (session.user.role !== UserRole.PROVIDER) return json({ error: 'Forbidden' }, 403);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // One claim at a time, so two simultaneous requests can't take spot 26.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('provider-founder-boost'))`;
      const provider = await tx.provider.findUnique({ where: { userId: session.user.id }, select: { id: true, founderBoostStartedAt: true } });
      if (!provider) return { status: 404 as const, body: { error: 'Provider profile not found' } };
      if (provider.founderBoostStartedAt) return { status: 409 as const, body: { error: 'You already claimed your founding-provider Boost.' } };
      const claimed = await tx.provider.count({ where: { founderBoostStartedAt: { not: null } } });
      if (founderSpotsLeft(claimed) === 0) {
        return { status: 409 as const, body: { error: `All ${FOUNDER_BOOST_SPOTS} founding-provider spots are taken.`, spotsLeft: 0 } };
      }
      const { startedAt, endsAt } = founderWindow();
      await tx.provider.update({ where: { id: provider.id }, data: { founderBoostStartedAt: startedAt, founderBoostEndsAt: endsAt } });
      return { status: 200 as const, body: { claimed: { startedAt, endsAt }, spotsLeft: founderSpotsLeft(claimed + 1), total: FOUNDER_BOOST_SPOTS } };
    });
    return json(result.body, result.status);
  } catch (err) {
    console.error('[provider-founder-boost] claim failed', errorSummary(err));
    return json({ error: 'Could not claim the offer. Please try again.' }, 500);
  }
}
