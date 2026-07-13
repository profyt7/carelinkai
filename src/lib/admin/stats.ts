/**
 * Admin dashboard aggregates (extracted from /admin/page.tsx for OL-112).
 *
 * OL-112: demo/tutorial fixtures are RETAINED in the DB but FILTERED out of
 * every metric here by default, so /admin shows real business numbers
 * ($0 MRR / real user counts), not the demo inflation ($386 MRR, 109 users…).
 * `showDemo: true` (the admin "Show demo data" toggle) restores the unfiltered
 * view for tutorial recording. Filtering ONLY — demo rows are never deleted.
 *
 * Demo identity: `isDemo` on User + AssistedLivingHome (backfilled by
 * scripts/backfill-demo-flags.ts); everything else filters relationally
 * (operator/caregiver/family → user.isDemo; inquiry → home.isDemo).
 */

import { prisma } from '@/lib/prisma';
import { countQualifiedLeadsDelivered, type LeadsDeliveredCounts } from '@/lib/leads/lead-delivery';

export interface AdminStats {
  /**
   * Demand-first North Star (7/9 pivot): distinct QUALIFIED leads actually
   * delivered to a facility — claimed OR unclaimed/manual-concierge. This is the
   * headline gate metric, not claims or raw inquiry volume. Flow metric, so it's
   * windowed (this week / last week for the trend / month-to-date).
   */
  leadsDelivered: LeadsDeliveredCounts;
  userCount: number;
  homeCount: number;
  caregiverCount: number;
  inquiryCount: number;
  placementCount: number;
  activeUsers: number;
  transportCommissionMTD: number;
  mrr: { operator: number; provider: number; caregiver: number; dp: number; familyPlus: number; total: number };
  mrrCounts: { operators: number; providers: number; proCaregiversCount: number; familyPlus: number };
  showDemo: boolean;
}

export async function getAdminStats(showDemo = false): Promise<AdminStats> {
  // `{}` = no filtering (demo included); otherwise exclude demo rows —
  // directly for User/Home, relationally for everything hanging off them.
  const userDemo = showDemo ? {} : { isDemo: false };
  const homeDemo = showDemo ? {} : { isDemo: false };
  const viaUser = showDemo ? {} : { user: { isDemo: false } };
  const inquiryDemo = showDemo ? {} : { home: { isDemo: false } };
  const placementDemo = showDemo ? {} : { user: { isDemo: false } };
  const rideDemo = showDemo ? {} : { provider: { user: { isDemo: false } } };

  const [
    userCount,
    homeCount,
    caregiverCount,
    inquiryCount,
    placementCount,
    activeUsers,
    activeOperators,
    proCaregiversCount,
    activeProvidersCount,
    familyPlusCount,
  ] = await Promise.all([
    prisma.user.count({ where: { ...userDemo } }),
    prisma.assistedLivingHome.count({ where: { ...homeDemo } }),
    prisma.user.count({ where: { role: 'CAREGIVER', ...userDemo } }),
    prisma.inquiry.count({ where: { ...inquiryDemo } }),
    prisma.placementSearch.count({ where: { ...placementDemo } }),
    prisma.user.count({
      where: { lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, ...userDemo },
    }),
    prisma.operator.findMany({
      where: { subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] }, ...viaUser },
      select: { subscriptionPlan: true },
    }),
    (prisma as any).caregiver.count({ where: { proStatus: { in: ['ACTIVE', 'TRIALING'] }, ...viaUser } }),
    (prisma as any).provider.count({ where: { listingStatus: { in: ['ACTIVE', 'TRIALING'] }, ...viaUser } }),
    prisma.family.count({ where: { plusStatus: { in: ['ACTIVE', 'TRIALING'] }, ...viaUser } }),
  ]);

  // Transport commissions: sum platformFee on COMPLETED rides this calendar month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const transportCommissions = await prisma.ride.aggregate({
    where: { status: 'COMPLETED', createdAt: { gte: monthStart }, ...rideDemo },
    _sum: { platformFee: true },
  });
  const transportCommissionMTD = Number(transportCommissions._sum?.platformFee ?? 0);

  const operatorMRR = (activeOperators as any[]).reduce((sum: number, op: any) => {
    const price = op.subscriptionPlan === 'STARTER' ? 99
      : op.subscriptionPlan === 'PROFESSIONAL' ? 249
      : op.subscriptionPlan === 'GROWTH' ? 499 : 0;
    return sum + price;
  }, 0);
  const providerMRR = (activeProvidersCount as number) * 99;
  const caregiverProMRR = (proCaregiversCount as number) * 19;
  const dpMRR = 0; // Discharge planners are FREE (ratified 2026-06-27) — not a revenue line.
  const familyPlusMRR = (familyPlusCount as number) * 19;
  const totalMRR = operatorMRR + providerMRR + caregiverProMRR + dpMRR + familyPlusMRR;

  // Demand-first headline: distinct qualified leads delivered to a facility,
  // same demo filter as everything else here.
  const leadsDelivered = await countQualifiedLeadsDelivered({ showDemo });

  return {
    leadsDelivered,
    userCount,
    homeCount,
    caregiverCount,
    inquiryCount,
    placementCount,
    activeUsers,
    transportCommissionMTD,
    mrr: { operator: operatorMRR, provider: providerMRR, caregiver: caregiverProMRR, dp: dpMRR, familyPlus: familyPlusMRR, total: totalMRR },
    mrrCounts: {
      operators: (activeOperators as any[]).length,
      providers: activeProvidersCount as number,
      proCaregiversCount: proCaregiversCount as number,
      familyPlus: familyPlusCount as number,
    },
    showDemo,
  };
}
