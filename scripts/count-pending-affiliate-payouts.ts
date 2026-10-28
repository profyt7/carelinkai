#!/usr/bin/env npx tsx
/**
 * scripts/count-pending-affiliate-payouts.ts
 *
 * OL-185 (c). Before the gate, every Convert that carried an affiliate code
 * wrote a PENDING AFFILIATE_COMMISSION Payment — even with PLACEMENT_FEE_ENABLED
 * off or on a free-lane placement. The gate stops new ones; nothing is
 * backfilled or deleted. This prints how many such rows exist so the founder
 * can decide what to do with them.
 *
 * Read-only: counts and sums only, no ids, emails or names. Never touches Stripe.
 * Run on Render (needs DATABASE_URL):
 *   npx tsx scripts/count-pending-affiliate-payouts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const byStatus = await prisma.payment.groupBy({
    by: ['status'],
    where: { type: 'AFFILIATE_COMMISSION' },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const unpaidReferrals = await prisma.affiliateReferral.count({
    where: { commissionPaid: false, commissionAmount: { not: null } },
  });

  const pending = byStatus.find((r) => r.status === 'PENDING');
  console.log(`Pending affiliate payouts (Payment AFFILIATE_COMMISSION, PENDING): ${pending?._count._all ?? 0}`);
  console.log(`  total amount: $${Number(pending?._sum.amount ?? 0).toFixed(2)}`);
  for (const r of byStatus.filter((r) => r.status !== 'PENDING')) {
    console.log(`  (${r.status}: ${r._count._all}, $${Number(r._sum.amount ?? 0).toFixed(2)})`);
  }
  console.log(`AffiliateReferral rows with an unpaid commission: ${unpaidReferrals}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
