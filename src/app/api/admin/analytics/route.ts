import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '30'; // days
    const days = parseInt(timeRange);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Parallel queries for all analytics data
    const [
      // User metrics
      totalUsers,
      usersByRole,
      usersByStatus,
      newUsersInPeriod,
      userGrowthData,
      
      // Inquiry metrics
      totalInquiries,
      inquiriesByStatus,
      newInquiriesInPeriod,
      inquiryGrowthData,
      convertedInquiries,
      
      // Home metrics
      totalHomes,
      homesByStatus,
      totalCapacity,
      totalOccupancy,
      
      // Activity metrics
      recentLogins,
      auditLogsByAction,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      
      // Users by status
      prisma.user.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      
      // New users in period
      prisma.user.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      
      // User growth over time (daily counts)
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::int as count
        FROM "User"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      
      // Total inquiries
      prisma.inquiry.count(),
      
      // Inquiries by status
      prisma.inquiry.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      
      // New inquiries in period
      prisma.inquiry.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      
      // Inquiry growth over time
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::int as count
        FROM "Inquiry"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      
      // Converted inquiries (those with conversionDate)
      prisma.inquiry.count({
        where: {
          conversionDate: { not: null },
        },
      }),
      
      // Total homes
      prisma.assistedLivingHome.count(),
      
      // Homes by status
      prisma.assistedLivingHome.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      
      // Total capacity
      prisma.assistedLivingHome.aggregate({
        _sum: { capacity: true },
      }),
      
      // Total current occupancy
      prisma.assistedLivingHome.aggregate({
        _sum: { currentOccupancy: true },
      }),
      
      // Recent logins (last 7 days)
      prisma.auditLog.count({
        where: {
          action: 'LOGIN',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Audit logs by action type (for activity chart)
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        where: {
          createdAt: { gte: startDate },
        },
      }),
    ]);

    // Calculate KPIs
    const capacity = totalCapacity._sum.capacity || 0;
    const occupancy = totalOccupancy._sum.currentOccupancy || 0;
    const occupancyRate = capacity > 0 ? ((occupancy / capacity) * 100).toFixed(1) : 0;
    const conversionRate = totalInquiries > 0 
      ? ((convertedInquiries / totalInquiries) * 100).toFixed(1) 
      : 0;

    // Format data for charts
    const userRoleDistribution = usersByRole.map(item => ({
      name: item.role,
      value: item._count.id,
    }));

    const userStatusDistribution = usersByStatus.map(item => ({
      name: item.status,
      value: item._count.id,
    }));

    const inquiryStatusDistribution = inquiriesByStatus.map(item => ({
      name: item.status,
      value: item._count.id,
    }));

    const homeStatusDistribution = homesByStatus.map(item => ({
      name: item.status,
      value: item._count.id,
    }));

    const activityByType = auditLogsByAction.map(item => ({
      name: item.action,
      value: item._count.id,
    })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Format growth data
    const formatGrowthData = (data: any[]) => {
      return data.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: item.count,
      }));
    };

    return NextResponse.json({
      kpis: {
        totalUsers,
        newUsersInPeriod,
        totalInquiries,
        newInquiriesInPeriod,
        totalHomes,
        occupancyRate: Number(occupancyRate),
        conversionRate: Number(conversionRate),
        recentLogins,
        capacity,
        occupancy,
      },
      charts: {
        userRoleDistribution,
        userStatusDistribution,
        inquiryStatusDistribution,
        homeStatusDistribution,
        userGrowthData: formatGrowthData(userGrowthData as any[]),
        inquiryGrowthData: formatGrowthData(inquiryGrowthData as any[]),
        activityByType,
      },
      timeRange: days,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
