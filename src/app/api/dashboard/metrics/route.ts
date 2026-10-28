import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { captureError } from '@/lib/sentry';

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/metrics
 * Returns operator-scoped metrics. OPERATOR role: scoped to their homes.
 * ADMIN role: platform-wide aggregates.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Resolve operator scope — null means ADMIN (no scope restriction).
    let operatorId: string | null = null;
    if (user.role === 'OPERATOR') {
      const operator = await prisma.operator.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!operator) {
        return NextResponse.json({ error: 'Operator record not found' }, { status: 404 });
      }
      operatorId = operator.id;
    }

    // Scoped WHERE fragments — empty objects for ADMIN, nested filters for OPERATOR.
    const residentScope = operatorId ? { home: { operatorId } } : {};
    const inquiryScope  = operatorId ? { home: { operatorId } } : {};
    const incidentScope = operatorId ? { resident: { home: { operatorId } } } : {};
    const assessScope   = operatorId ? { resident: { home: { operatorId } } } : {};
    const homeScope     = operatorId ? { operatorId } : {};

    // METRIC 1: Total Residents
    let totalResidents = 0;
    let occupancyPercentage = 0;
    let residentTrend: 'up' | 'down' | 'neutral' = 'neutral';
    let residentTrendValue = 0;

    try {
      totalResidents = await prisma.resident.count({
        where: { ...residentScope, status: { in: ['ACTIVE', 'PENDING'] }, archivedAt: null },
      });

      const homesData = await prisma.assistedLivingHome.aggregate({
        _sum: { capacity: true, currentOccupancy: true },
        where: { ...homeScope, status: 'ACTIVE' },
      });

      const totalCapacity = homesData?._sum?.capacity ?? 0;
      const currentOccupancy = homesData?._sum?.currentOccupancy ?? totalResidents;
      if (totalCapacity > 0) {
        occupancyPercentage = Math.round((currentOccupancy / totalCapacity) * 100);
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const last30Days = await prisma.resident.count({
        where: { ...residentScope, admissionDate: { gte: thirtyDaysAgo }, archivedAt: null },
      });
      const previous30Days = await prisma.resident.count({
        where: { ...residentScope, admissionDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, archivedAt: null },
      });

      if (previous30Days > 0) {
        residentTrendValue = Math.round(((last30Days - previous30Days) / previous30Days) * 100);
      } else if (last30Days > 0) {
        residentTrendValue = 100;
      }
      if (residentTrendValue > 0) residentTrend = 'up';
      else if (residentTrendValue < 0) residentTrend = 'down';
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { route: 'dashboard:metrics', metric: 'residents' },
      });
      console.error('Error calculating residents/occupancy:', error);
    }

    // METRIC 2: Active Caregivers
    let activeCaregivers = 0;
    try {
      const caregiverScope = operatorId
        ? { employmentStatus: 'ACTIVE', employments: { some: { operatorId } } }
        : { employmentStatus: 'ACTIVE' };
      activeCaregivers = await prisma.caregiver.count({ where: caregiverScope as any });
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { route: 'dashboard:metrics', metric: 'caregivers' },
      });
      console.error('Error counting caregivers:', error);
    }

    // METRIC 3: Pending Inquiries
    let pendingInquiries = 0;
    try {
      pendingInquiries = await prisma.inquiry.count({
        where: { ...inquiryScope, status: { in: ['NEW', 'CONTACTED', 'TOUR_SCHEDULED', 'QUALIFIED'] } },
      });
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { route: 'dashboard:metrics', metric: 'inquiries' },
      });
      console.error('Error counting pending inquiries:', error);
    }

    // METRIC 4: Critical Incidents (last 30 days)
    let criticalIncidents = 0;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      criticalIncidents = await prisma.residentIncident.count({
        where: { ...incidentScope, severity: 'Critical', occurredAt: { gte: thirtyDaysAgo } },
      });
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { route: 'dashboard:metrics', metric: 'incidents' },
      });
      console.error('Error counting critical incidents:', error);
    }

    // METRIC 5: Overdue Assessments
    let overdueAssessments = 0;
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      overdueAssessments = await prisma.assessmentResult.count({
        where: { ...assessScope, status: { in: ['PENDING_REVIEW', 'IN_PROGRESS'] }, createdAt: { lt: sevenDaysAgo } },
      });
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { route: 'dashboard:metrics', metric: 'assessments' },
      });
      console.error('Error counting overdue assessments:', error);
    }

    // METRIC 6: Tours This Week
    let toursThisWeek = 0;
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      toursThisWeek = await prisma.inquiry.count({
        where: { ...inquiryScope, tourDate: { gte: startOfWeek, lt: endOfWeek } },
      });
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { route: 'dashboard:metrics', metric: 'tours' },
      });
      console.error('Error counting tours this week:', error);
    }

    return NextResponse.json({
      totalResidents: {
        value: totalResidents,
        subtitle: `${occupancyPercentage}% occupancy`,
        trend: residentTrend,
        trendValue: Math.abs(residentTrendValue),
      },
      activeCaregivers: {
        value: activeCaregivers,
        subtitle: 'Active staff members',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      pendingInquiries: {
        value: pendingInquiries,
        subtitle: 'Awaiting contact',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      criticalIncidents: {
        value: criticalIncidents,
        subtitle: 'Last 30 days',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      overdueAssessments: {
        value: overdueAssessments,
        subtitle: 'Pending review > 7 days',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      toursThisWeek: {
        value: toursThisWeek,
        subtitle: 'Scheduled tours',
        trend: 'neutral' as const,
        trendValue: 0,
      },
    });
  } catch (error: any) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'dashboard:metrics' },
    });
    console.error('Dashboard metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}
