import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/charts
 * Returns operator-scoped chart data. OPERATOR: scoped to their homes.
 * ADMIN: platform-wide.
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

    const residentScope = operatorId ? { home: { operatorId } } : {};
    const inquiryScope  = operatorId ? { home: { operatorId } } : {};
    const incidentScope = operatorId ? { resident: { home: { operatorId } } } : {};
    const homeScope     = operatorId ? { operatorId } : {};

    // CHART 1: Occupancy Trend (Last 6 Months)
    let occupancyTrend: Array<{ month: string; occupancy: number }> = [];
    try {
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const homesData = await prisma.assistedLivingHome.aggregate({
        _sum: { capacity: true },
        where: { ...homeScope, status: 'ACTIVE' },
      });
      const totalCapacity = homesData?._sum?.capacity ?? 100;

      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const residentCount = await prisma.resident.count({
          where: {
            ...residentScope,
            admissionDate: { lt: nextMonthDate },
            OR: [{ dischargeDate: null }, { dischargeDate: { gte: monthDate } }],
            archivedAt: null,
          },
        });

        const occupancyPercentage = totalCapacity > 0
          ? Math.round((residentCount / totalCapacity) * 100)
          : 0;

        occupancyTrend.push({ month: monthNames[monthDate.getMonth()], occupancy: occupancyPercentage });
      }
    } catch (error) {
      console.error('Error calculating occupancy trend:', error);
      occupancyTrend = ['Jul','Aug','Sep','Oct','Nov','Dec'].map(m => ({ month: m, occupancy: 0 }));
    }

    // CHART 2: Conversion Funnel
    let conversionFunnel: Array<{ stage: string; count: number }> = [];
    try {
      const stages = [
        { label: 'New', status: 'NEW' },
        { label: 'Contacted', status: 'CONTACTED' },
        { label: 'Tour Scheduled', status: 'TOUR_SCHEDULED' },
        { label: 'Tour Completed', status: 'TOUR_COMPLETED' },
        { label: 'Qualified', status: 'QUALIFIED' },
        { label: 'Converted', status: 'CONVERTED' },
      ];

      for (const stage of stages) {
        const count = await prisma.inquiry.count({
          where: { ...inquiryScope, status: stage.status as any },
        });
        conversionFunnel.push({ stage: stage.label, count });
      }
    } catch (error) {
      console.error('Error calculating conversion funnel:', error);
      conversionFunnel = [
        { stage: 'New', count: 0 }, { stage: 'Contacted', count: 0 },
        { stage: 'Tour Scheduled', count: 0 }, { stage: 'Tour Completed', count: 0 },
        { stage: 'Qualified', count: 0 }, { stage: 'Converted', count: 0 },
      ];
    }

    // CHART 3: Incident Distribution
    let incidentDistribution: Array<{ severity: string; count: number }> = [];
    try {
      for (const severity of ['Minor', 'Moderate', 'Severe', 'Critical']) {
        const count = await prisma.residentIncident.count({
          where: { ...incidentScope, severity },
        });
        incidentDistribution.push({ severity, count });
      }
    } catch (error) {
      console.error('Error calculating incident distribution:', error);
      incidentDistribution = ['Minor','Moderate','Severe','Critical'].map(s => ({ severity: s, count: 0 }));
    }

    return NextResponse.json({ occupancyTrend, conversionFunnel, incidentDistribution });
  } catch (error: any) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charts', details: error.message },
      { status: 500 }
    );
  }
}
