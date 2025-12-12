import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/activity
 * ENHANCED VERSION - Phase 3 Implementation
 * Returns recent activity feed from inquiries, assessments, incidents, and residents
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Dashboard Activity API Called (Enhanced) ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', session.user.email);

    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      link: string;
    }> = [];

    // ACTIVITY 1: New Inquiries (Last 24 hours)
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const newInquiries = await prisma.inquiry.findMany({
        where: {
          createdAt: {
            gte: twentyFourHoursAgo
          }
        },
        include: {
          family: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          home: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
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
          link: `/operator/inquiries/${inquiry.id}`
        });
      });

      console.log('New inquiries:', newInquiries.length);
    } catch (error) {
      console.error('Error fetching new inquiries:', error);
    }

    // ACTIVITY 2: Completed Assessments (Last 24 hours)
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const completedAssessments = await prisma.assessmentResult.findMany({
        where: {
          status: 'COMPLETED',
          conductedAt: {
            gte: twentyFourHoursAgo
          }
        },
        include: {
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          conductedAt: 'desc'
        },
        take: 5
      });

      completedAssessments.forEach((assessment) => {
        const residentName = `${assessment?.resident?.firstName ?? ''} ${assessment?.resident?.lastName ?? ''}`.trim() || 'Unknown Resident';
        
        activities.push({
          id: `assessment-${assessment.id}`,
          type: 'assessment',
          title: 'Assessment Completed',
          description: `${assessment.type} assessment completed for ${residentName}`,
          timestamp: (assessment.conductedAt ?? assessment.createdAt).toISOString(),
          link: `/operator/residents/${assessment.residentId}`
        });
      });

      console.log('Completed assessments:', completedAssessments.length);
    } catch (error) {
      console.error('Error fetching completed assessments:', error);
    }

    // ACTIVITY 3: Recent Incidents (Last 24 hours)
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const recentIncidents = await prisma.residentIncident.findMany({
        where: {
          reportedAt: {
            gte: twentyFourHoursAgo
          }
        },
        include: {
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          reportedAt: 'desc'
        },
        take: 5
      });

      recentIncidents.forEach((incident) => {
        const residentName = `${incident?.resident?.firstName ?? ''} ${incident?.resident?.lastName ?? ''}`.trim() || 'Unknown Resident';
        const severityLabel = incident.severity?.toLowerCase() ?? 'unknown';
        
        activities.push({
          id: `incident-${incident.id}`,
          type: 'incident',
          title: `${incident.severity} Incident Reported`,
          description: `${incident.type} - ${residentName}`,
          timestamp: incident.reportedAt.toISOString(),
          link: `/operator/residents/${incident.residentId}`
        });
      });

      console.log('Recent incidents:', recentIncidents.length);
    } catch (error) {
      console.error('Error fetching recent incidents:', error);
    }

    // ACTIVITY 4: New Residents Admitted (Last 7 Days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const newResidents = await prisma.resident.findMany({
        where: {
          admissionDate: {
            gte: sevenDaysAgo
          },
          status: 'ACTIVE'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionDate: true,
          home: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          admissionDate: 'desc'
        },
        take: 5
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
          link: `/operator/residents/${resident.id}`
        });
      });

      console.log('New residents:', newResidents.length);
    } catch (error) {
      console.error('Error fetching new residents:', error);
    }

    // ACTIVITY 5: Status Updates (Inquiries that changed status in last 24 hours)
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const statusUpdates = await prisma.inquiry.findMany({
        where: {
          updatedAt: {
            gte: twentyFourHoursAgo
          },
          status: {
            in: ['TOUR_COMPLETED', 'QUALIFIED', 'CONVERTED']
          }
        },
        include: {
          family: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 5
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
          link: `/operator/inquiries/${inquiry.id}`
        });
      });

      console.log('Status updates:', statusUpdates.length);
    } catch (error) {
      console.error('Error fetching status updates:', error);
    }

    // Sort all activities by timestamp (most recent first) and limit to 15
    activities.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const limitedActivities = activities.slice(0, 15);

    console.log(`Returning ${limitedActivities.length} activities`);
    return NextResponse.json({ activities: limitedActivities });

  } catch (error: any) {
    console.error('=== Dashboard Activity Error ===');
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch activity', details: error.message },
      { status: 500 }
    );
  }
}
