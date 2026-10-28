import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaymentType, PaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PLAN_PRICES: Record<string, number> = {
  STARTER: 99,
  PROFESSIONAL: 249,
  GROWTH: 499,
  ENTERPRISE: 999,
};

export async function GET(request: NextRequest) {
  console.log('[Analytics API] GET request received');
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '30';
    const days = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalUsers, usersByRole, usersByStatus, newUsersInPeriod, userGrowthData,
      totalInquiries, inquiriesByStatus, newInquiriesInPeriod, inquiryGrowthData, convertedInquiries,
      totalHomes, homesByStatus, totalCapacity, totalOccupancy,
      recentLogins, auditLogsByAction,
      // Revenue queries
      activeOperators,
      placementFeesCompleted,
      placementFeesPending,
      affiliateCommissionsOwed,
      recentPayments,
      subscriptionBreakdown,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.user.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "User" WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt") ORDER BY date ASC
      `,
      prisma.inquiry.count(),
      prisma.inquiry.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.inquiry.count({ where: { createdAt: { gte: startDate } } }),
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "Inquiry" WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt") ORDER BY date ASC
      `,
      prisma.inquiry.count({ where: { conversionDate: { not: null } } }),
      prisma.assistedLivingHome.count(),
      prisma.assistedLivingHome.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.assistedLivingHome.aggregate({ _sum: { capacity: true } }),
      prisma.assistedLivingHome.aggregate({ _sum: { currentOccupancy: true } }),
      prisma.auditLog.count({ where: { action: 'LOGIN', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.auditLog.groupBy({ by: ['action'], _count: { id: true }, where: { createdAt: { gte: startDate } } }),
      // Active/trialing operators with their plan
      prisma.operator.findMany({
        where: { subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] }, subscriptionPlan: { not: null } },
        select: { subscriptionPlan: true, subscriptionStatus: true },
      }),
      // Completed placement fees (total collected)
      prisma.payment.aggregate({
        where: { type: PaymentType.PLACEMENT_FEE, status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Pending/processing placement fees
      prisma.payment.aggregate({
        where: { type: PaymentType.PLACEMENT_FEE, status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Affiliate commissions owed (pending)
      prisma.payment.aggregate({
        where: { type: PaymentType.AFFILIATE_COMMISSION, status: PaymentStatus.PENDING },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Recent revenue payments
      prisma.payment.findMany({
        where: { type: { in: [PaymentType.PLACEMENT_FEE, PaymentType.AFFILIATE_COMMISSION, PaymentType.DEPOSIT, PaymentType.MONTHLY_FEE] } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true, amount: true, type: true, status: true, description: true, createdAt: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      // Subscription counts by plan and status
      prisma.operator.groupBy({
        by: ['subscriptionPlan', 'subscriptionStatus'],
        where: { subscriptionPlan: { not: null } },
        _count: { id: true },
      }),
    ]);

    // ── Revenue calculations ────────────────────────────────────────────────
    let mrr = 0;
    const planCounts: Record<string, number> = {};
    for (const op of activeOperators) {
      const plan = op.subscriptionPlan as string;
      const price = PLAN_PRICES[plan] ?? 0;
      mrr += price;
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    }

    const capacity = totalCapacity._sum.capacity || 0;
    const occupancy = totalOccupancy._sum.currentOccupancy || 0;
    const occupancyRate = capacity > 0 ? ((occupancy / capacity) * 100).toFixed(1) : 0;
    const conversionRate = totalInquiries > 0 ? ((convertedInquiries / totalInquiries) * 100).toFixed(1) : 0;

    const formatGrowthData = (data: any[]) =>
      data.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: item.count,
      }));

    return NextResponse.json({
      revenue: {
        mrr,
        activeSubscribers: activeOperators.length,
        planCounts,
        placementFeesCollected: Number(placementFeesCompleted._sum.amount ?? 0),
        placementFeesPending: Number(placementFeesPending._sum.amount ?? 0),
        placementFeesCollectedCount: placementFeesCompleted._count.id,
        affiliateCommissionsOwed: Number(affiliateCommissionsOwed._sum.amount ?? 0),
        affiliateCommissionsOwedCount: affiliateCommissionsOwed._count.id,
        recentPayments: recentPayments.map((p) => ({
          ...p,
          amount: Number(p.amount),
          createdAt: p.createdAt.toISOString(),
        })),
        subscriptionBreakdown: subscriptionBreakdown.map((r) => ({
          plan: r.subscriptionPlan,
          status: r.subscriptionStatus,
          count: r._count.id,
        })),
      },
      kpis: {
        totalUsers, newUsersInPeriod, totalInquiries, newInquiriesInPeriod,
        totalHomes, occupancyRate: Number(occupancyRate), conversionRate: Number(conversionRate),
        recentLogins, capacity, occupancy,
      },
      charts: {
        userRoleDistribution: usersByRole.map((i) => ({ name: i.role, value: i._count.id })),
        userStatusDistribution: usersByStatus.map((i) => ({ name: i.status, value: i._count.id })),
        inquiryStatusDistribution: inquiriesByStatus.map((i) => ({ name: i.status, value: i._count.id })),
        homeStatusDistribution: homesByStatus.map((i) => ({ name: i.status, value: i._count.id })),
        userGrowthData: formatGrowthData(userGrowthData as any[]),
        inquiryGrowthData: formatGrowthData(inquiryGrowthData as any[]),
        activityByType: auditLogsByAction.map((i) => ({ name: i.action, value: i._count.id })).sort((a, b) => b.value - a.value).slice(0, 10),
      },
      timeRange: days,
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
