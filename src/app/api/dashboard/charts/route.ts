import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/charts
 * Returns chart data based on user role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        operator: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userRole = user.role;

    // Only OPERATOR/ADMIN get charts
    if (userRole === UserRole.ADMIN || userRole === UserRole.OPERATOR) {
      return await getOperatorCharts(user);
    }

    // Other roles don't get charts
    return NextResponse.json({
      occupancyTrend: [],
      conversionFunnel: [],
      incidentDistribution: [],
    });
  } catch (error) {
    console.error("[API /api/dashboard/charts] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get chart data for OPERATOR/ADMIN users
 */
async function getOperatorCharts(user: any) {
  // Determine home filter
  const homeFilter = user.role === UserRole.OPERATOR && user.operator
    ? { operatorId: user.operator.id }
    : {};

  let homeIds: string[] | undefined;
  if (Object.keys(homeFilter).length > 0) {
    const operatorHomes = await prisma.assistedLivingHome.findMany({
      where: homeFilter,
      select: { id: true },
    });
    homeIds = operatorHomes.map(h => h.id);
  }

  // Occupancy Trend (last 6 months)
  const occupancyTrend = await getOccupancyTrend(homeFilter);

  // Conversion Funnel
  const conversionFunnel = await getConversionFunnel(homeIds);

  // Incident Distribution
  const incidentDistribution = await getIncidentDistribution(homeIds);

  return NextResponse.json({
    occupancyTrend,
    conversionFunnel,
    incidentDistribution,
  });
}

/**
 * Get occupancy trend for last 6 months
 */
async function getOccupancyTrend(homeFilter: any) {
  const months = [];
  const today = new Date();

  // Generate last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      date,
    });
  }

  // Fetch capacity data (assuming it's relatively stable)
  const capacityData = await prisma.assistedLivingHome.aggregate({
    where: homeFilter,
    _sum: { capacity: true },
  });
  const totalCapacity = Number(capacityData._sum.capacity || 0);

  // For each month, get occupancy (using current data as approximation)
  // In a real app, you'd track historical occupancy data
  const occupancyData = await Promise.all(
    months.map(async ({ month, date }) => {
      // Get active residents at that time (approximation)
      const occupancy = await prisma.resident.count({
        where: {
          ...(homeFilter.operatorId ? { home: { operatorId: homeFilter.operatorId } } : {}),
          status: "ACTIVE",
        },
      });

      const occupancyRate = totalCapacity > 0
        ? Math.round((occupancy / totalCapacity) * 100)
        : 0;

      return {
        month,
        occupancyRate,
      };
    })
  );

  return occupancyData;
}

/**
 * Get conversion funnel data
 */
async function getConversionFunnel(homeIds?: string[]) {
  const inquiryFilter = homeIds ? { homeId: { in: homeIds } } : {};

  const [
    newCount,
    contactedCount,
    tourScheduledCount,
    tourCompletedCount,
    qualifiedCount,
    convertedCount,
  ] = await Promise.all([
    prisma.inquiry.count({ where: { ...inquiryFilter, status: "NEW" } }),
    prisma.inquiry.count({ where: { ...inquiryFilter, status: "CONTACTED" } }),
    prisma.inquiry.count({ where: { ...inquiryFilter, status: "TOUR_SCHEDULED" } }),
    prisma.inquiry.count({ where: { ...inquiryFilter, status: "TOUR_COMPLETED" } }),
    prisma.inquiry.count({ where: { ...inquiryFilter, status: "QUALIFIED" } }),
    prisma.inquiry.count({ where: { ...inquiryFilter, status: "CONVERTED" } }),
  ]);

  return [
    { stage: "New", count: newCount },
    { stage: "Contacted", count: contactedCount },
    { stage: "Tour Scheduled", count: tourScheduledCount },
    { stage: "Tour Completed", count: tourCompletedCount },
    { stage: "Qualified", count: qualifiedCount },
    { stage: "Converted", count: convertedCount },
  ];
}

/**
 * Get incident distribution by severity
 */
async function getIncidentDistribution(homeIds?: string[]) {
  const residentFilter = homeIds ? { homeId: { in: homeIds } } : {};

  const [
    lowCount,
    mediumCount,
    highCount,
    criticalCount,
  ] = await Promise.all([
    prisma.residentIncident.count({
      where: {
        resident: residentFilter,
        severity: "LOW",
      },
    }),
    prisma.residentIncident.count({
      where: {
        resident: residentFilter,
        severity: "MEDIUM",
      },
    }),
    prisma.residentIncident.count({
      where: {
        resident: residentFilter,
        severity: "HIGH",
      },
    }),
    prisma.residentIncident.count({
      where: {
        resident: residentFilter,
        severity: "CRITICAL",
      },
    }),
  ]);

  return [
    { severity: "Low", count: lowCount },
    { severity: "Medium", count: mediumCount },
    { severity: "High", count: highCount },
    { severity: "Critical", count: criticalCount },
  ];
}
