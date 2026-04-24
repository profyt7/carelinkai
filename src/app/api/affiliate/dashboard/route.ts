export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/affiliate/dashboard
 * Returns the affiliate's referrals, earnings summary, and affiliate code.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: session.user.id },
    include: {
      referrals: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!affiliate) {
    return NextResponse.json({ error: 'Affiliate profile not found' }, { status: 404 });
  }

  const totalEarned = affiliate.referrals
    .filter((r) => r.status === 'CONVERTED' || r.status === 'PAID')
    .reduce((sum, r) => sum + parseFloat(r.commissionAmount?.toString() ?? '0'), 0);

  const totalPaid = affiliate.referrals
    .filter((r) => r.commissionPaid)
    .reduce((sum, r) => sum + parseFloat(r.commissionAmount?.toString() ?? '0'), 0);

  return NextResponse.json({
    affiliateCode: affiliate.affiliateCode,
    commissionRate: affiliate.commissionRate,
    referralLink: `https://getcarelinkai.com?ref=${affiliate.affiliateCode}`,
    summary: {
      totalReferrals: affiliate.referrals.length,
      converted: affiliate.referrals.filter((r) => r.status === 'CONVERTED' || r.status === 'PAID').length,
      totalEarned,
      totalPaid,
      pendingPayout: totalEarned - totalPaid,
    },
    referrals: affiliate.referrals,
  });
}
