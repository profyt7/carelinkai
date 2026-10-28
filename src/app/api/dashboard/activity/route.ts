import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/activity
 * Returns operator-scoped activity feed. OPERATOR: scoped to their homes.
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
    const assessScope   = operatorId ? { resident: { home: { operatorId } } } : {};

    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      link: string;
    }> = [];

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // ACTIVITY 1: New Inquiries
    try {
      const newInquiries = await prisma.inquiry.findMany({
        where: { ...inquiryScope, createdAt: { gte: twentyFourHoursAgo } },
        include: {
          family: { include: { user: { select: { firstName: true, lastName: true } } } },
          home: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      newInquiries.forEach((inquiry) => {
        const familyName = `${inquiry?.family?.user?.firstName ?? ''} ${inquiry?.family?.user?.lastName ?? ''}`.trim() || 'Unknown Family';
        const homeName = inquiry?.home?.name ?? 'Unknown Home';
        activities.push({
          id: `inquiry-${inquiry.id}`,
          type: 'inquiry',
          title: 'New Inquiry Received',
          description: `${familyName} inquired about ${homeName}`,
          timestamp: inquiry.createdAt.toISOString(),
          link: `/operator/inquiries/${inquiry.id}`,
        });
      });
    } catch (error) {
      console.error('Error fetching new inquiries:', error);
    }

    // ACTIVITY 2: Completed Assessments
    try {
      const completedAssessments = await prisma.assessmentResult.findMany({
        where: { ...assessScope, status: 'COMPLETED', conductedAt: { gte: twentyFourHoursAgo } },
        include: { resident: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { conductedAt: 'desc' },
        take: 5,
      });

      completedAssessments.forEach((assessment) => {
        const residentName = `${assessment?.resident?.firstName ?? ''} ${assessment?.resident?.lastName ?? ''}`.trim() || 'Unknown Resident';
        activities.push({
          id: `assessment-${assessment.id}`,
          type: 'assessment',
          title: 'Assessment Completed',
          description: `${assessment.type} assessment completed for ${residentName}`,
          timestamp: (assessment.conductedAt ?? assessment.createdAt).toISOString(),
          link: `/operator/residents/${assessment.residentId}`,
        });
      });
    } catch (error) {
      console.error('Error fetching completed assessments:', error);
    }

    // ACTIVITY 3: Recent Incidents
    try {
      const recentIncidents = await prisma.residentIncident.findMany({
        where: { ...incidentScope, reportedAt: { gte: twentyFourHoursAgo } },
        include: { resident: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { reportedAt: 'desc' },
        take: 5,
      });

      recentIncidents.forEach((incident) => {
        const residentName = `${incident?.resident?.firstName ?? ''} ${incident?.resident?.lastName ?? ''}`.trim() || 'Unknown Resident';
        activities.push({
          id: `incident-${incident.id}`,
          type: 'incident',
          title: `${incident.severity} Incident Reported`,
          description: `${incident.type} - ${residentName}`,
          timestamp: incident.reportedAt.toISOString(),
          link: `/operator/residents/${incident.residentId}`,
        });
      });
    } catch (error) {
      console.error('Error fetching recent incidents:', error);
    }

    // ACTIVITY 4: New Residents Admitted
    try {
      const newResidents = await prisma.resident.findMany({
        where: { ...residentScope, admissionDate: { gte: sevenDaysAgo }, status: 'ACTIVE' },
        select: {
          id: true, firstName: true, lastName: true, admissionDate: true,
          home: { select: { name: true } },
        },
        orderBy: { admissionDate: 'desc' },
        take: 5,
      });

      newResidents.forEach((resident) => {
        const residentName = `${resident?.firstName ?? ''} ${resident?.lastName ?? ''}`.trim() || 'Unknown Resident';
        const homeName = resident?.home?.name ?? 'Unknown Home';
        activities.push({
          id: `resident-${resident.id}`,
          type: 'admission',
          title: 'New Resident Admitted',
          description: `${residentName} admitted to ${homeName}`,
          timestamp: resident.admissionDate?.toISOString() ?? new Date().toISOString(),
          link: `/operator/residents/${resident.id}`,
        });
      });
    } catch (error) {
      console.error('Error fetching new residents:', error);
    }

    // ACTIVITY 5: Inquiry Status Updates
    try {
      const statusUpdates = await prisma.inquiry.findMany({
        where: {
          ...inquiryScope,
          updatedAt: { gte: twentyFourHoursAgo },
          status: { in: ['TOUR_COMPLETED', 'QUALIFIED', 'CONVERTED'] },
        },
        include: {
          family: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });

      statusUpdates.forEach((inquiry) => {
        const familyName = `${inquiry?.family?.user?.firstName ?? ''} ${inquiry?.family?.user?.lastName ?? ''}`.trim() || 'Unknown Family';
        const statusLabel = inquiry.status.replace(/_/g, ' ').toLowerCase();
        activities.push({
          id: `status-${inquiry.id}`,
          type: 'status',
          title: 'Inquiry Status Updated',
          description: `${familyName} - ${statusLabel}`,
          timestamp: inquiry.updatedAt.toISOString(),
          link: `/operator/inquiries/${inquiry.id}`,
        });
      });
    } catch (error) {
      console.error('Error fetching status updates:', error);
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return NextResponse.json({ activities: activities.slice(0, 15) });
  } catch (error: any) {
    console.error('Dashboard activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity', details: error.message },
      { status: 500 }
    );
  }
}
