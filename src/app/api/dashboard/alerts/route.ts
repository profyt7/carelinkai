import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/alerts
 * Returns alerts and notifications based on user role
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

    // Role-based alerts
    if (userRole === UserRole.ADMIN || userRole === UserRole.OPERATOR) {
      return await getOperatorAlerts(user);
    } else if (userRole === UserRole.FAMILY) {
      return await getFamilyAlerts(user);
    } else if (userRole === UserRole.CAREGIVER || userRole === UserRole.AIDE) {
      return await getCaregiverAlerts(user);
    }

    return NextResponse.json({ alerts: [] });
  } catch (error) {
    console.error("[API /api/dashboard/alerts] Error:", error);
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
 * Get alerts for OPERATOR/ADMIN users
 */
async function getOperatorAlerts(user: any) {
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

  const residentFilter = homeIds ? { homeId: { in: homeIds } } : {};
  const inquiryFilter = homeIds ? { homeId: { in: homeIds } } : {};
  const caregiverFilter = homeIds ? { homeId: { in: homeIds } } : {};

  const alerts = [];

  // Old Assessments (over 90 days)
  const oldAssessments = await prisma.assessmentResult.findMany({
    where: {
      resident: residentFilter,
      conductedAt: {
        lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Over 90 days old
      },
    },
    include: {
      resident: { select: { firstName: true, lastName: true } },
    },
    take: 5,
    orderBy: { conductedAt: "asc" },
  });

  oldAssessments.forEach(assessment => {
    alerts.push({
      id: `assessment-${assessment.id}`,
      type: "warning",
      title: "Assessment Due",
      description: `${assessment.resident?.firstName} ${assessment.resident?.lastName} - Last assessed ${new Date(assessment.conductedAt).toLocaleDateString()}`,
      actionLabel: "View Resident",
      actionUrl: `/operator/residents/${assessment.residentId}`,
      timestamp: assessment.conductedAt,
    });
  });

  // Critical Incidents
  const criticalIncidents = await prisma.residentIncident.findMany({
    where: {
      resident: residentFilter,
      severity: "CRITICAL",
      status: { not: "RESOLVED" },
    },
    include: {
      resident: { select: { firstName: true, lastName: true } },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  criticalIncidents.forEach(incident => {
    alerts.push({
      id: `incident-${incident.id}`,
      type: "error",
      title: "Critical Incident",
      description: `${incident.resident?.firstName} ${incident.resident?.lastName} - ${incident.type || "Incident"}`,
      actionLabel: "View Incident",
      actionUrl: `/operator/residents/${incident.residentId}`,
      timestamp: incident.createdAt,
    });
  });

  // Follow-ups Due Today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const followUpsDue = await prisma.inquiry.findMany({
    where: {
      ...inquiryFilter,
      followUpDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      family: { select: { name: true } },
      home: { select: { name: true } },
    },
    take: 5,
    orderBy: { followUpDate: "asc" },
  });

  followUpsDue.forEach(inquiry => {
    alerts.push({
      id: `followup-${inquiry.id}`,
      type: "info",
      title: "Follow-up Due Today",
      description: `${inquiry.family?.name || "Unknown"} - ${inquiry.home?.name || "Unknown"}`,
      actionLabel: "View Inquiry",
      actionUrl: `/operator/inquiries/${inquiry.id}`,
      timestamp: inquiry.followUpDate,
    });
  });

  // Tours This Week
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);

  const upcomingTours = await prisma.inquiry.findMany({
    where: {
      ...inquiryFilter,
      tourDate: {
        gte: new Date(),
        lte: weekEnd,
      },
    },
    include: {
      family: { select: { name: true } },
      home: { select: { name: true } },
    },
    take: 5,
    orderBy: { tourDate: "asc" },
  });

  upcomingTours.forEach(inquiry => {
    alerts.push({
      id: `tour-${inquiry.id}`,
      type: "info",
      title: "Upcoming Tour",
      description: `${inquiry.family?.name || "Unknown"} - ${inquiry.tourDate ? new Date(inquiry.tourDate).toLocaleDateString() : "TBD"}`,
      actionLabel: "View Inquiry",
      actionUrl: `/operator/inquiries/${inquiry.id}`,
      timestamp: inquiry.tourDate,
    });
  });

  // Expiring Caregiver Certifications
  const expiringCerts = await prisma.caregiverDocument.findMany({
    where: {
      caregiver: caregiverFilter,
      expirationDate: {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        gte: new Date(),
      },
    },
    include: {
      caregiver: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    take: 5,
    orderBy: { expirationDate: "asc" },
  });

  expiringCerts.forEach(doc => {
    alerts.push({
      id: `cert-${doc.id}`,
      type: "warning",
      title: "Certification Expiring Soon",
      description: `${doc.caregiver?.user?.firstName} ${doc.caregiver?.user?.lastName} - ${doc.documentType}`,
      actionLabel: "View Caregiver",
      actionUrl: `/operator/caregivers/${doc.caregiverId}`,
      timestamp: doc.expirationDate,
    });
  });

  // Sort alerts by timestamp (most recent first)
  alerts.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  });

  return NextResponse.json({ alerts: alerts.slice(0, 10) });
}

/**
 * Get alerts for FAMILY users
 */
async function getFamilyAlerts(user: any) {
  if (!user.family) {
    return NextResponse.json({ alerts: [] });
  }

  const familyId = user.family.id;
  const alerts = [];

  // Upcoming tour
  const upcomingTour = await prisma.inquiry.findFirst({
    where: {
      familyId,
      tourDate: { gte: new Date() },
    },
    include: {
      home: { select: { name: true, address: true } },
    },
    orderBy: { tourDate: "asc" },
  });

  if (upcomingTour) {
    alerts.push({
      id: `tour-${upcomingTour.id}`,
      type: "info",
      title: "Upcoming Tour",
      description: `${upcomingTour.home?.name || "Unknown"} - ${upcomingTour.tourDate ? new Date(upcomingTour.tourDate).toLocaleDateString() : "TBD"}`,
      actionLabel: "View Details",
      actionUrl: `/dashboard/inquiries/${upcomingTour.id}`,
      timestamp: upcomingTour.tourDate,
    });
  }

  // Pending actions
  const pendingInquiry = await prisma.inquiry.findFirst({
    where: {
      familyId,
      status: { in: ["NEW", "CONTACTED"] },
    },
    include: {
      home: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (pendingInquiry) {
    alerts.push({
      id: `inquiry-${pendingInquiry.id}`,
      type: "info",
      title: "Action Required",
      description: `Your inquiry for ${pendingInquiry.home?.name || "Unknown"} is pending`,
      actionLabel: "View Inquiry",
      actionUrl: `/dashboard/inquiries/${pendingInquiry.id}`,
      timestamp: pendingInquiry.createdAt,
    });
  }

  return NextResponse.json({ alerts });
}

/**
 * Get alerts for CAREGIVER users
 */
async function getCaregiverAlerts(user: any) {
  if (!user.caregiver) {
    return NextResponse.json({ alerts: [] });
  }

  const caregiverId = user.caregiver.id;
  const alerts = [];

  // Appointments due today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const appointmentsDue = await prisma.appointment.findMany({
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
    take: 5,
    orderBy: { startTime: "asc" },
  });

  appointmentsDue.forEach(appointment => {
    alerts.push({
      id: `appointment-${appointment.id}`,
      type: "info",
      title: "Appointment Today",
      description: `${appointment.title || "Appointment"} at ${new Date(appointment.startTime).toLocaleTimeString()}`,
      actionLabel: "View Appointment",
      actionUrl: `/calendar`,
      timestamp: appointment.startTime,
    });
  });

  // Upcoming shifts
  const upcomingShifts = await prisma.caregiverShift.findMany({
    where: {
      caregiverId,
      startTime: { gte: new Date() },
    },
    take: 3,
    orderBy: { startTime: "asc" },
  });

  upcomingShifts.forEach(shift => {
    alerts.push({
      id: `shift-${shift.id}`,
      type: "info",
      title: "Upcoming Shift",
      description: `Shift starts at ${new Date(shift.startTime).toLocaleTimeString()}`,
      actionLabel: "View Schedule",
      actionUrl: `/shifts`,
      timestamp: shift.startTime,
    });
  });

  return NextResponse.json({ alerts });
}
