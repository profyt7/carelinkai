import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/metrics
 * Returns key metrics based on user role
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
        caregiver: true,
        family: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userRole = user.role;

    // Role-based metrics
    if (userRole === UserRole.ADMIN || userRole === UserRole.OPERATOR) {
      return await getOperatorMetrics(user);
    } else if (userRole === UserRole.FAMILY) {
      return await getFamilyMetrics(user);
    } else if (userRole === UserRole.CAREGIVER) {
      return await getCaregiverMetrics(user);
    } else if (userRole === UserRole.AIDE) {
      return await getAideMetrics(user);
    }

    return NextResponse.json(
      { error: "Invalid role" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API /api/dashboard/metrics] Error:", error);
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
 * Get metrics for OPERATOR/ADMIN users
 */
async function getOperatorMetrics(user: any) {
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

  const inquiryFilter = homeIds ? { homeId: { in: homeIds } } : {};
  const residentFilter = homeIds ? { homeId: { in: homeIds } } : {};
  const caregiverFilter = homeIds ? { homeId: { in: homeIds } } : {};

  // Fetch metrics in parallel
  const [
    totalResidents,
    activeResidents,
    totalCaregivers,
    activeCaregivers,
    totalInquiries,
    pendingInquiries,
    criticalIncidents,
    overdueAssessments,
    toursThisWeek,
    capacityData,
  ] = await Promise.all([
    prisma.resident.count({ where: residentFilter }),
    prisma.resident.count({ where: { ...residentFilter, status: "ACTIVE" } }),
    prisma.caregiver.count({ where: caregiverFilter }),
    prisma.caregiver.count({ where: { ...caregiverFilter, status: "ACTIVE" } }),
    prisma.inquiry.count({ where: inquiryFilter }),
    prisma.inquiry.count({
      where: {
        ...inquiryFilter,
        status: { in: ["NEW", "CONTACTED", "TOUR_SCHEDULED"] },
      },
    }),
    prisma.residentIncident.count({
      where: {
        resident: residentFilter,
        severity: "CRITICAL",
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
    prisma.assessmentResult.count({
      where: {
        resident: residentFilter,
        conductedAt: {
          lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Over 90 days old
        },
      },
    }),
    prisma.inquiry.count({
      where: {
        ...inquiryFilter,
        tourDate: {
          gte: new Date(), // This week
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.assistedLivingHome.aggregate({
      where: homeFilter,
      _sum: { capacity: true, currentOccupancy: true },
    }),
  ]);

  // Calculate occupancy rate
  const totalCapacity = Number(capacityData._sum.capacity || 0);
  const totalOccupancy = Number(capacityData._sum.currentOccupancy || 0);
  const occupancyRate = totalCapacity > 0
    ? Math.round((totalOccupancy / totalCapacity) * 100)
    : 0;

  return NextResponse.json({
    totalResidents: {
      value: totalResidents,
      subtitle: `${activeResidents} active (${occupancyRate}% occupancy)`,
      trend: occupancyRate > 75 ? "up" : "down",
      trendValue: occupancyRate,
    },
    activeCaregivers: {
      value: activeCaregivers,
      subtitle: `${totalCaregivers} total caregivers`,
      trend: activeCaregivers > totalCaregivers * 0.8 ? "up" : "down",
      trendValue: totalCaregivers > 0 ? Math.round((activeCaregivers / totalCaregivers) * 100) : 0,
    },
    pendingInquiries: {
      value: pendingInquiries,
      subtitle: `${totalInquiries} total inquiries`,
      trend: pendingInquiries > 0 ? "up" : "neutral",
      trendValue: pendingInquiries,
    },
    criticalIncidents: {
      value: criticalIncidents,
      subtitle: "Last 30 days",
      trend: criticalIncidents > 0 ? "down" : "up",
      trendValue: criticalIncidents,
    },
    overdueAssessments: {
      value: overdueAssessments,
      subtitle: "Require attention",
      trend: overdueAssessments > 0 ? "down" : "up",
      trendValue: overdueAssessments,
    },
    toursThisWeek: {
      value: toursThisWeek,
      subtitle: "Scheduled tours",
      trend: toursThisWeek > 0 ? "up" : "neutral",
      trendValue: toursThisWeek,
    },
  });
}

/**
 * Get metrics for FAMILY users
 */
async function getFamilyMetrics(user: any) {
  if (!user.family) {
    return NextResponse.json({ error: "Family member not found" }, { status: 404 });
  }

  const familyId = user.family.id;

  // Fetch inquiry data
  const inquiry = await prisma.inquiry.findFirst({
    where: { familyId },
    include: {
      home: { select: { name: true, address: true } },
      assignedOperator: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!inquiry) {
    return NextResponse.json({
      inquiryStatus: {
        value: "No Inquiry",
        subtitle: "Start your search",
        trend: "neutral",
        trendValue: 0,
      },
      tourSchedule: null,
      applicationProgress: null,
    });
  }

  // Calculate application progress
  const progressSteps = [
    inquiry.status === "NEW" || inquiry.status === "CONTACTED" || inquiry.status === "TOUR_SCHEDULED" || inquiry.status === "TOUR_COMPLETED" || inquiry.status === "QUALIFIED" || inquiry.status === "CONVERTED",
    inquiry.status === "CONTACTED" || inquiry.status === "TOUR_SCHEDULED" || inquiry.status === "TOUR_COMPLETED" || inquiry.status === "QUALIFIED" || inquiry.status === "CONVERTED",
    inquiry.tourDate !== null,
    inquiry.status === "TOUR_COMPLETED" || inquiry.status === "QUALIFIED" || inquiry.status === "CONVERTED",
    inquiry.status === "CONVERTED",
  ];
  const completedSteps = progressSteps.filter(Boolean).length;
  const totalSteps = 5;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  return NextResponse.json({
    inquiryStatus: {
      value: inquiry.status,
      subtitle: `Home: ${inquiry.home?.name || "N/A"}`,
      trend: "neutral",
      trendValue: 0,
    },
    tourSchedule: inquiry.tourDate
      ? {
          value: new Date(inquiry.tourDate).toLocaleDateString(),
          subtitle: inquiry.home?.address || "Location TBD",
          trend: "neutral",
          trendValue: 0,
        }
      : null,
    applicationProgress: {
      value: `${completedSteps}/${totalSteps}`,
      subtitle: `${progressPercentage}% complete`,
      trend: "up",
      trendValue: progressPercentage,
    },
  });
}

/**
 * Get metrics for CAREGIVER users
 */
async function getCaregiverMetrics(user: any) {
  if (!user.caregiver) {
    return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
  }

  const caregiverId = user.caregiver.id;

  // Fetch caregiver data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    assignedResidents,
    todayAppointments,
    upcomingShifts,
  ] = await Promise.all([
    prisma.resident.count({
      where: { primaryCaregiverId: caregiverId },
    }),
    prisma.appointment.count({
      where: {
        participants: {
          some: {
            userId: user.id,
          },
        },
        startTime: {
          gte: today,
          lt: tomorrow,
        },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.caregiverShift.count({
      where: {
        caregiverId,
        startTime: {
          gte: new Date(),
        },
      },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    myResidents: {
      value: assignedResidents,
      subtitle: "Assigned to you",
      trend: "neutral",
      trendValue: assignedResidents,
    },
    todayTasks: {
      value: todayAppointments,
      subtitle: "Appointments today",
      trend: todayAppointments > 0 ? "up" : "neutral",
      trendValue: todayAppointments,
    },
    upcomingShifts: {
      value: upcomingShifts,
      subtitle: "Next shifts",
      trend: "neutral",
      trendValue: upcomingShifts,
    },
  });
}

/**
 * Get metrics for AIDE users
 */
async function getAideMetrics(user: any) {
  // For now, return similar to caregiver
  return await getCaregiverMetrics(user);
}
