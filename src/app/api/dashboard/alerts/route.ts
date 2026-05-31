import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/alerts
 * Returns operator-scoped alerts. OPERATOR: scoped to their homes.
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

    const assessScope   = operatorId ? { resident: { home: { operatorId } } } : {};
    const incidentScope = operatorId ? { resident: { home: { operatorId } } } : {};
    const inquiryScope  = operatorId ? { home: { operatorId } } : {};
    const certScope     = operatorId
      ? { caregiver: { employments: { some: { operatorId } } } }
      : {};

    const alerts: Array<{
      id: string;
      type: 'error' | 'warning' | 'info' | 'success';
      title: string;
      description: string;
      actionLabel: string;
      actionUrl: string;
      timestamp: string;
    }> = [];

    // ALERT 1: Overdue Assessments
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const overdueAssessments = await prisma.assessmentResult.findMany({
        where: {
          ...assessScope,
          status: { in: ['PENDING_REVIEW', 'IN_PROGRESS'] },
          createdAt: { lt: sevenDaysAgo },
        },
        include: { resident: { select: { id: true, firstName: true, lastName: true } } },
        take: 5,
        orderBy: { createdAt: 'asc' },
      });

      if (overdueAssessments.length > 0) {
        const residentNames = overdueAssessments.slice(0, 3)
          .map(a => `${a?.resident?.firstName ?? ''} ${a?.resident?.lastName ?? ''}`.trim())
          .filter(n => n.length > 0)
          .join(', ');
        const moreCount = overdueAssessments.length > 3 ? ` and ${overdueAssessments.length - 3} more` : '';

        alerts.push({
          id: 'overdue-assessments',
          type: 'warning',
          title: `${overdueAssessments.length} Overdue Assessment${overdueAssessments.length > 1 ? 's' : ''}`,
          description: `Assessments pending review for ${residentNames}${moreCount}`,
          actionLabel: 'View Assessments',
          actionUrl: '/operator/residents',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching overdue assessments:', error);
    }

    // ALERT 2: Critical Incidents (Last 7 Days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const criticalIncidents = await prisma.residentIncident.findMany({
        where: {
          ...incidentScope,
          severity: 'Critical',
          occurredAt: { gte: sevenDaysAgo },
          status: { in: ['REPORTED', 'UNDER_REVIEW'] },
        },
        include: { resident: { select: { id: true, firstName: true, lastName: true } } },
        take: 5,
        orderBy: { occurredAt: 'desc' },
      });

      if (criticalIncidents.length > 0) {
        const incidentTypes = criticalIncidents.slice(0, 2).map(i => i.type).join(', ');
        alerts.push({
          id: 'critical-incidents',
          type: 'error',
          title: `${criticalIncidents.length} Critical Incident${criticalIncidents.length > 1 ? 's' : ''}`,
          description: `Recent critical incidents: ${incidentTypes}`,
          actionLabel: 'View Incidents',
          actionUrl: '/operator/residents',
          timestamp: criticalIncidents[0]?.occurredAt?.toISOString() ?? new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching critical incidents:', error);
    }

    // ALERT 3: Tours Scheduled Today
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const followUpsDue = await prisma.inquiry.findMany({
        where: {
          ...inquiryScope,
          tourDate: { gte: today, lt: tomorrow },
          status: { in: ['TOUR_SCHEDULED', 'CONTACTED'] },
        },
        include: {
          family: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        take: 5,
      });

      if (followUpsDue.length > 0) {
        const familyNames = followUpsDue.slice(0, 2)
          .map(f => `${f?.family?.user?.firstName ?? ''} ${f?.family?.user?.lastName ?? ''}`.trim())
          .filter(n => n.length > 0)
          .join(', ');
        const moreCount = followUpsDue.length > 2 ? ` and ${followUpsDue.length - 2} more` : '';

        alerts.push({
          id: 'followups-due',
          type: 'info',
          title: `${followUpsDue.length} Tour${followUpsDue.length > 1 ? 's' : ''} Scheduled Today`,
          description: `Tours for ${familyNames}${moreCount}`,
          actionLabel: 'View Tours',
          actionUrl: '/operator/inquiries',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    }

    // ALERT 4: Expiring Certifications
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringCerts = await prisma.caregiverCertification.findMany({
        where: {
          ...certScope,
          expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
          status: 'CURRENT',
        },
        include: {
          caregiver: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        take: 5,
        orderBy: { expiryDate: 'asc' },
      });

      if (expiringCerts.length > 0) {
        const caregiverNames = expiringCerts.slice(0, 2)
          .map(c => `${c?.caregiver?.user?.firstName ?? ''} ${c?.caregiver?.user?.lastName ?? ''}`.trim())
          .filter(n => n.length > 0)
          .join(', ');
        const moreCount = expiringCerts.length > 2 ? ` and ${expiringCerts.length - 2} more` : '';

        alerts.push({
          id: 'expiring-certifications',
          type: 'warning',
          title: `${expiringCerts.length} Certification${expiringCerts.length > 1 ? 's' : ''} Expiring Soon`,
          description: `Certifications expiring for ${caregiverNames}${moreCount}`,
          actionLabel: 'View Caregivers',
          actionUrl: '/operator/caregivers',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching expiring certifications:', error);
    }

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error('Dashboard alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error.message },
      { status: 500 }
    );
  }
}
