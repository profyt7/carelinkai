import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

type Alert = {
  id: string;
  type: 'license' | 'inspection' | 'occupancy' | 'inquiry' | 'staff' | 'incident';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: Date;
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const homeId = params.id;
    const alerts: Alert[] = [];

    // Fetch home with all necessary relations
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      include: {
        licenses: true,
        inspections: true,
        residents: {
          where: { status: 'ACTIVE', archivedAt: null },
        },
        inquiries: {
          where: {
            status: { in: ['NEW', 'CONTACTED', 'TOUR_SCHEDULED'] },
          },
        },
        caregiverShifts: {
          where: {
            startTime: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
          include: {
            caregiver: true,
          },
        },
      },
    });

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // Verify ownership
    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || operator.id !== home.operatorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const now = new Date();

    // A. License Expiry Alerts
    const licenses = home.licenses ?? [];
    for (const license of licenses) {
      const daysUntilExpiry = Math.floor(
        (new Date(license.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry < 0) {
        alerts.push({
          id: `license-expired-${license.id}`,
          type: 'license',
          severity: 'critical',
          title: 'License Expired',
          message: `${license.type} license expired ${Math.abs(daysUntilExpiry)} days ago`,
          actionLabel: 'Renew License',
          actionUrl: `/operator/homes/${homeId}/licenses`,
          createdAt: license.expirationDate,
        });
      } else if (daysUntilExpiry <= 30) {
        alerts.push({
          id: `license-expiring-${license.id}`,
          type: 'license',
          severity: 'critical',
          title: 'License Expiring Soon',
          message: `${license.type} license expires in ${daysUntilExpiry} days`,
          actionLabel: 'Renew License',
          actionUrl: `/operator/homes/${homeId}/licenses`,
          createdAt: license.expirationDate,
        });
      } else if (daysUntilExpiry <= 60) {
        alerts.push({
          id: `license-expiring-soon-${license.id}`,
          type: 'license',
          severity: 'warning',
          title: 'License Expiring',
          message: `${license.type} license expires in ${daysUntilExpiry} days`,
          actionLabel: 'View License',
          actionUrl: `/operator/homes/${homeId}/licenses`,
          createdAt: license.expirationDate,
        });
      }
    }

    // B. Inspection Due Alerts
    const inspections = home.inspections ?? [];
    const lastInspection = inspections.sort(
      (a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()
    )[0];

    if (lastInspection) {
      const daysSinceInspection = Math.floor(
        (now.getTime() - new Date(lastInspection.inspectionDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Assume inspections should occur annually
      if (daysSinceInspection > 365) {
        alerts.push({
          id: 'inspection-overdue',
          type: 'inspection',
          severity: 'critical',
          title: 'Inspection Overdue',
          message: `Last inspection was ${daysSinceInspection} days ago`,
          actionLabel: 'Schedule Inspection',
          actionUrl: `/operator/homes/${homeId}/inspections`,
          createdAt: lastInspection.inspectionDate,
        });
      } else if (daysSinceInspection > 335) {
        // 30 days before annual due date
        alerts.push({
          id: 'inspection-due-soon',
          type: 'inspection',
          severity: 'warning',
          title: 'Inspection Due Soon',
          message: `Inspection due in ${365 - daysSinceInspection} days`,
          actionLabel: 'Schedule Inspection',
          actionUrl: `/operator/homes/${homeId}/inspections`,
          createdAt: lastInspection.inspectionDate,
        });
      }
    } else {
      alerts.push({
        id: 'inspection-missing',
        type: 'inspection',
        severity: 'critical',
        title: 'No Inspection Records',
        message: 'No inspections recorded for this facility',
        actionLabel: 'Schedule Inspection',
        actionUrl: `/operator/homes/${homeId}/inspections`,
        createdAt: now,
      });
    }

    // C. Occupancy Alerts
    const currentOccupancy = home.residents?.length ?? 0;
    const occupancyRate = home.capacity > 0 ? (currentOccupancy / home.capacity) * 100 : 0;

    if (occupancyRate >= 100) {
      alerts.push({
        id: 'occupancy-full',
        type: 'occupancy',
        severity: 'info',
        title: 'Facility at Full Capacity',
        message: `All ${home.capacity} beds are occupied`,
        actionLabel: 'View Residents',
        actionUrl: `/operator/homes/${homeId}`,
        createdAt: now,
      });
    } else if (occupancyRate >= 95) {
      alerts.push({
        id: 'occupancy-high',
        type: 'occupancy',
        severity: 'info',
        title: 'High Occupancy',
        message: `Occupancy at ${Math.round(occupancyRate)}% (${currentOccupancy}/${home.capacity})`,
        actionLabel: 'View Analytics',
        actionUrl: `/operator/homes/${homeId}/analytics`,
        createdAt: now,
      });
    } else if (occupancyRate < 70) {
      alerts.push({
        id: 'occupancy-low',
        type: 'occupancy',
        severity: 'warning',
        title: 'Low Occupancy',
        message: `Occupancy at ${Math.round(occupancyRate)}% (${currentOccupancy}/${home.capacity}) - Consider marketing efforts`,
        actionLabel: 'View Analytics',
        actionUrl: `/operator/homes/${homeId}/analytics`,
        createdAt: now,
      });
    }

    // D. Inquiry Alerts
    const oldInquiries = home.inquiries?.filter(i => {
      const hoursSinceCreated = (now.getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60);
      return hoursSinceCreated > 24 && i.status === 'NEW';
    }) ?? [];

    if (oldInquiries.length > 0) {
      alerts.push({
        id: 'inquiry-unresponded',
        type: 'inquiry',
        severity: 'warning',
        title: 'Unresponded Inquiries',
        message: `${oldInquiries.length} inquiries pending response for over 24 hours`,
        actionLabel: 'View Inquiries',
        actionUrl: `/operator/inquiries?homeId=${homeId}`,
        createdAt: now,
      });
    }

    const toursToday = home.inquiries?.filter(i => {
      if (!i.tourDate) return false;
      const tourDate = new Date(i.tourDate);
      return (
        tourDate.toDateString() === now.toDateString() &&
        i.status === 'TOUR_SCHEDULED'
      );
    }) ?? [];

    if (toursToday.length > 0) {
      alerts.push({
        id: 'tours-today',
        type: 'inquiry',
        severity: 'info',
        title: 'Tours Scheduled Today',
        message: `${toursToday.length} tours scheduled for today`,
        actionLabel: 'View Schedule',
        actionUrl: `/operator/inquiries?homeId=${homeId}`,
        createdAt: now,
      });
    }

    // E. Staff Alerts
    const uniqueCaregivers = new Set(home.caregiverShifts?.map(s => s.caregiverId).filter(Boolean));
    const staffCount = uniqueCaregivers.size;
    const staffToResidentRatio = currentOccupancy > 0 && staffCount > 0 ? staffCount / currentOccupancy : 0;

    if (staffToResidentRatio < 0.2 && currentOccupancy > 0) {
      // Less than 1 staff per 5 residents
      alerts.push({
        id: 'staff-understaffed',
        type: 'staff',
        severity: 'warning',
        title: 'Understaffed',
        message: `Staff-to-resident ratio is low (1:${Math.round(1 / staffToResidentRatio)})`,
        actionLabel: 'Manage Staff',
        actionUrl: `/operator/caregivers?homeId=${homeId}`,
        createdAt: now,
      });
    }

    // F. Incident Alerts
    const residentIds = home.residents?.map(r => r.id) ?? [];
    if (residentIds.length > 0) {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentIncidents = await prisma.residentIncident.findMany({
        where: {
          residentId: { in: residentIds },
          occurredAt: { gte: sevenDaysAgo },
        },
      });

      const criticalIncidents = recentIncidents.filter(i => i.severity === 'Critical');
      if (criticalIncidents.length > 0) {
        alerts.push({
          id: 'incidents-critical',
          type: 'incident',
          severity: 'critical',
          title: 'Critical Incidents',
          message: `${criticalIncidents.length} critical incidents in the last 7 days`,
          actionLabel: 'View Incidents',
          actionUrl: `/operator/residents`,
          createdAt: now,
        });
      }

      if (recentIncidents.length > 10) {
        alerts.push({
          id: 'incidents-high',
          type: 'incident',
          severity: 'warning',
          title: 'High Incident Rate',
          message: `${recentIncidents.length} incidents reported in the last 7 days`,
          actionLabel: 'View Incidents',
          actionUrl: `/operator/residents`,
          createdAt: now,
        });
      }
    }

    // Sort alerts by severity and date
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
      },
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
