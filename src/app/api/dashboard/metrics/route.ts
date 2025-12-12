import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/metrics
 * ENHANCED VERSION - Phase 1 Implementation
 * Returns calculated metrics with trends and real data
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Dashboard Metrics API Called (Enhanced) ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', session.user.email);

    // Get user WITHOUT any includes/relations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        email: true,
        role: true 
      },
    });

    if (!user) {
      console.log('User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User role:', user.role);

    // METRIC 1: Total Residents with Occupancy
    let totalResidents = 0;
    let occupancyPercentage = 0;
    let residentTrend: 'up' | 'down' | 'neutral' = 'neutral';
    let residentTrendValue = 0;
    
    try {
      totalResidents = await prisma.resident.count({
        where: {
          status: {
            in: ['ACTIVE', 'PENDING']
          },
          archivedAt: null
        }
      });

      // Get total capacity from all active homes
      const homesData = await prisma.assistedLivingHome.aggregate({
        _sum: {
          capacity: true,
          currentOccupancy: true
        },
        where: {
          status: 'ACTIVE'
        }
      });

      const totalCapacity = homesData?._sum?.capacity ?? 0;
      const currentOccupancy = homesData?._sum?.currentOccupancy ?? totalResidents;
      
      if (totalCapacity > 0) {
        occupancyPercentage = Math.round((currentOccupancy / totalCapacity) * 100);
      }

      // Calculate trend: compare last 30 days vs previous 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const last30Days = await prisma.resident.count({
        where: {
          admissionDate: {
            gte: thirtyDaysAgo
          },
          archivedAt: null
        }
      });

      const previous30Days = await prisma.resident.count({
        where: {
          admissionDate: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          },
          archivedAt: null
        }
      });

      if (previous30Days > 0) {
        residentTrendValue = Math.round(((last30Days - previous30Days) / previous30Days) * 100);
      } else if (last30Days > 0) {
        residentTrendValue = 100;
      }

      if (residentTrendValue > 0) residentTrend = 'up';
      else if (residentTrendValue < 0) residentTrend = 'down';

      console.log('Residents:', { totalResidents, occupancyPercentage, residentTrend, residentTrendValue });
    } catch (error) {
      console.error('Error calculating residents/occupancy:', error);
    }

    // METRIC 2: Active Caregivers
    let activeCaregivers = 0;
    try {
      activeCaregivers = await prisma.caregiver.count({
        where: {
          employmentStatus: 'ACTIVE'
        }
      });
      console.log('Active caregivers:', activeCaregivers);
    } catch (error) {
      console.error('Error counting caregivers:', error);
    }

    // METRIC 3: Pending Inquiries (active statuses only)
    let pendingInquiries = 0;
    try {
      pendingInquiries = await prisma.inquiry.count({
        where: {
          status: {
            in: ['NEW', 'CONTACTED', 'TOUR_SCHEDULED', 'QUALIFIED']
          }
        }
      });
      console.log('Pending inquiries:', pendingInquiries);
    } catch (error) {
      console.error('Error counting pending inquiries:', error);
    }

    // METRIC 4: Critical Incidents (last 30 days)
    let criticalIncidents = 0;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      criticalIncidents = await prisma.residentIncident.count({
        where: {
          severity: 'Critical',
          occurredAt: {
            gte: thirtyDaysAgo
          }
        }
      });
      console.log('Critical incidents (last 30 days):', criticalIncidents);
    } catch (error) {
      console.error('Error counting critical incidents:', error);
    }

    // METRIC 5: Overdue Assessments (pending review older than 7 days)
    let overdueAssessments = 0;
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      overdueAssessments = await prisma.assessmentResult.count({
        where: {
          status: {
            in: ['PENDING_REVIEW', 'IN_PROGRESS']
          },
          createdAt: {
            lt: sevenDaysAgo
          }
        }
      });
      console.log('Overdue assessments:', overdueAssessments);
    } catch (error) {
      console.error('Error counting overdue assessments:', error);
    }

    // METRIC 6: Tours This Week
    let toursThisWeek = 0;
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      toursThisWeek = await prisma.inquiry.count({
        where: {
          tourDate: {
            gte: startOfWeek,
            lt: endOfWeek
          }
        }
      });
      console.log('Tours this week:', toursThisWeek);
    } catch (error) {
      console.error('Error counting tours this week:', error);
    }

    // Return enhanced metrics structure
    const metrics = {
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
    };

    console.log('Returning enhanced metrics:', metrics);
    return NextResponse.json(metrics);

  } catch (error: any) {
    console.error('=== Dashboard Metrics Error ===');
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}
