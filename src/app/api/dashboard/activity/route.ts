import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/activity
 * Returns recent activity feed based on user role
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
        familyMember: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userRole = user.role;

    // Role-based activity
    if (userRole === UserRole.ADMIN || userRole === UserRole.OPERATOR) {
      return await getOperatorActivity(user);
    } else if (userRole === UserRole.FAMILY) {
      return await getFamilyActivity(user);
    }

    return NextResponse.json({ activities: [] });
  } catch (error) {
    console.error("[API /api/dashboard/activity] Error:", error);
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
 * Get activity for OPERATOR/ADMIN users
 */
async function getOperatorActivity(user: any) {
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

  const activities = [];

  // Recent inquiries
  const recentInquiries = await prisma.inquiry.findMany({
    where: homeIds ? { homeId: { in: homeIds } } : {},
    include: {
      family: { select: { name: true } },
      home: { select: { name: true } },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  recentInquiries.forEach(inquiry => {
    activities.push({
      id: `inquiry-${inquiry.id}`,
      type: "inquiry",
      title: "New inquiry submitted",
      description: `${inquiry.family?.name || "Unknown"} inquired about ${inquiry.home?.name || "Unknown"}`,
      timestamp: inquiry.createdAt,
      icon: "FileText",
      url: `/operator/inquiries/${inquiry.id}`,
    });
  });

  // Recent assessments
  const recentAssessments = await prisma.assessmentResult.findMany({
    where: {
      resident: homeIds ? { homeId: { in: homeIds } } : {},
    },
    include: {
      resident: { select: { firstName: true, lastName: true } },
    },
    take: 5,
    orderBy: { conductedAt: "desc" },
  });

  recentAssessments.forEach(assessment => {
    activities.push({
      id: `assessment-${assessment.id}`,
      type: "assessment",
      title: "Assessment completed",
      description: `${assessment.resident?.firstName} ${assessment.resident?.lastName} - Score: ${assessment.score || "N/A"}`,
      timestamp: assessment.conductedAt,
      icon: "CheckCircle",
      url: `/operator/residents/${assessment.residentId}`,
    });
  });

  // Recent incidents
  const recentIncidents = await prisma.residentIncident.findMany({
    where: {
      resident: homeIds ? { homeId: { in: homeIds } } : {},
    },
    include: {
      resident: { select: { firstName: true, lastName: true } },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  recentIncidents.forEach(incident => {
    activities.push({
      id: `incident-${incident.id}`,
      type: "incident",
      title: "Incident reported",
      description: `${incident.resident?.firstName} ${incident.resident?.lastName} - ${incident.severity} severity`,
      timestamp: incident.createdAt,
      icon: "AlertCircle",
      url: `/operator/residents/${incident.residentId}`,
    });
  });

  // Recent residents
  const recentResidents = await prisma.resident.findMany({
    where: homeIds ? { homeId: { in: homeIds } } : {},
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  recentResidents.forEach(resident => {
    activities.push({
      id: `resident-${resident.id}`,
      type: "resident",
      title: "New resident admitted",
      description: `${resident.firstName} ${resident.lastName}`,
      timestamp: resident.createdAt,
      icon: "UserPlus",
      url: `/operator/residents/${resident.id}`,
    });
  });

  // Sort by timestamp (most recent first)
  activities.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  });

  return NextResponse.json({ activities: activities.slice(0, 15) });
}

/**
 * Get activity for FAMILY users
 */
async function getFamilyActivity(user: any) {
  if (!user.familyMember) {
    return NextResponse.json({ activities: [] });
  }

  const familyId = user.familyMember.id;
  const activities = [];

  // Inquiry updates
  const inquiries = await prisma.inquiry.findMany({
    where: { familyId },
    include: {
      home: { select: { name: true } },
    },
    take: 10,
    orderBy: { updatedAt: "desc" },
  });

  inquiries.forEach(inquiry => {
    activities.push({
      id: `inquiry-${inquiry.id}`,
      type: "inquiry",
      title: "Inquiry updated",
      description: `Status changed to ${inquiry.status}`,
      timestamp: inquiry.updatedAt,
      icon: "FileText",
      url: `/dashboard/inquiries/${inquiry.id}`,
    });
  });

  return NextResponse.json({ activities });
}
