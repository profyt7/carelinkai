import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/alerts
 * ENHANCED VERSION - Phase 3 Implementation
 * Returns real alerts for overdue assessments, critical incidents, and follow-ups
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Dashboard Alerts API Called (Enhanced) ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', session.user.email);

    const alerts: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      severity: 'high' | 'medium' | 'low';
      timestamp: string;
      link?: string;
    }> = [];

    // ALERT 1: Overdue Assessments
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const overdueAssessments = await prisma.assessmentResult.findMany({
        where: {
          status: {
            in: ['PENDING_REVIEW', 'IN_PROGRESS']
          },
          createdAt: {
            lt: sevenDaysAgo
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
        take: 5,
        orderBy: {
          createdAt: 'asc'
        }
      });

      if (overdueAssessments.length > 0) {
        const residentNames = overdueAssessments
          .slice(0, 3)
          .map(a => `${a?.resident?.firstName ?? ''} ${a?.resident?.lastName ?? ''}`.trim())
          .filter(name => name.length > 0)
          .join(', ');
        
        const moreCount = overdueAssessments.length > 3 ? ` and ${overdueAssessments.length - 3} more` : '';
        
        alerts.push({
          id: 'overdue-assessments',
          type: 'assessment',
          title: `${overdueAssessments.length} Overdue Assessment${overdueAssessments.length > 1 ? 's' : ''}`,
          message: `Assessments pending review for ${residentNames}${moreCount}`,
          severity: 'high',
          timestamp: new Date().toISOString(),
          link: '/operator/residents'
        });
      }

      console.log('Overdue assessments alert:', overdueAssessments.length);
    } catch (error) {
      console.error('Error fetching overdue assessments:', error);
    }

    // ALERT 2: Critical Incidents (Last 7 Days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const criticalIncidents = await prisma.residentIncident.findMany({
        where: {
          severity: 'Critical',
          occurredAt: {
            gte: sevenDaysAgo
          },
          status: {
            in: ['REPORTED', 'UNDER_REVIEW']
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
        take: 5,
        orderBy: {
          occurredAt: 'desc'
        }
      });

      if (criticalIncidents.length > 0) {
        const incidentTypes = criticalIncidents
          .slice(0, 2)
          .map(i => i.type)
          .join(', ');
        
        alerts.push({
          id: 'critical-incidents',
          type: 'incident',
          title: `${criticalIncidents.length} Critical Incident${criticalIncidents.length > 1 ? 's' : ''}`,
          message: `Recent critical incidents: ${incidentTypes}`,
          severity: 'high',
          timestamp: criticalIncidents[0]?.occurredAt?.toISOString() ?? new Date().toISOString(),
          link: '/operator/residents'
        });
      }

      console.log('Critical incidents alert:', criticalIncidents.length);
    } catch (error) {
      console.error('Error fetching critical incidents:', error);
    }

    // ALERT 3: Follow-ups Due Today
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const followUpsDue = await prisma.inquiry.findMany({
        where: {
          tourDate: {
            gte: today,
            lt: tomorrow
          },
          status: {
            in: ['TOUR_SCHEDULED', 'CONTACTED']
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
        take: 5
      });

      if (followUpsDue.length > 0) {
        const familyNames = followUpsDue
          .slice(0, 2)
          .map(f => `${f?.family?.user?.firstName ?? ''} ${f?.family?.user?.lastName ?? ''}`.trim())
          .filter(name => name.length > 0)
          .join(', ');
        
        const moreCount = followUpsDue.length > 2 ? ` and ${followUpsDue.length - 2} more` : '';
        
        alerts.push({
          id: 'followups-due',
          type: 'followup',
          title: `${followUpsDue.length} Tour${followUpsDue.length > 1 ? 's' : ''} Scheduled Today`,
          message: `Tours for ${familyNames}${moreCount}`,
          severity: 'medium',
          timestamp: new Date().toISOString(),
          link: '/operator/inquiries'
        });
      }

      console.log('Follow-ups due alert:', followUpsDue.length);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    }

    // ALERT 4: Expiring Certifications (Caregivers with certs expiring in 30 days)
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringCerts = await prisma.caregiverCertification.findMany({
        where: {
          expiryDate: {
            lte: thirtyDaysFromNow,
            gte: new Date()
          },
          status: 'CURRENT'
        },
        include: {
          caregiver: {
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
        take: 5,
        orderBy: {
          expiryDate: 'asc'
        }
      });

      if (expiringCerts.length > 0) {
        const caregiverNames = expiringCerts
          .slice(0, 2)
          .map(c => `${c?.caregiver?.user?.firstName ?? ''} ${c?.caregiver?.user?.lastName ?? ''}`.trim())
          .filter(name => name.length > 0)
          .join(', ');
        
        const moreCount = expiringCerts.length > 2 ? ` and ${expiringCerts.length - 2} more` : '';
        
        alerts.push({
          id: 'expiring-certifications',
          type: 'certification',
          title: `${expiringCerts.length} Certification${expiringCerts.length > 1 ? 's' : ''} Expiring Soon`,
          message: `Certifications expiring for ${caregiverNames}${moreCount}`,
          severity: 'medium',
          timestamp: new Date().toISOString(),
          link: '/operator/caregivers'
        });
      }

      console.log('Expiring certifications alert:', expiringCerts.length);
    } catch (error) {
      console.error('Error fetching expiring certifications:', error);
    }

    console.log(`Returning ${alerts.length} alerts`);
    return NextResponse.json({ alerts });

  } catch (error: any) {
    console.error('=== Dashboard Alerts Error ===');
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error.message },
      { status: 500 }
    );
  }
}
