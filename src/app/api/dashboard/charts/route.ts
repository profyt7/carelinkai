import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/charts
 * ENHANCED VERSION - Phase 2 Implementation
 * Returns real chart data for occupancy, conversion funnel, and incidents
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Dashboard Charts API Called (Enhanced) ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', session.user.email);

    // CHART 1: Occupancy Trend (Last 6 Months)
    let occupancyTrend: Array<{ month: string; occupancy: number }> = [];
    
    try {
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Get total capacity (stays same for all months)
      const homesData = await prisma.assistedLivingHome.aggregate({
        _sum: {
          capacity: true
        },
        where: {
          status: 'ACTIVE'
        }
      });
      
      const totalCapacity = homesData?._sum?.capacity ?? 100; // Default to 100 if no data
      
      // Calculate occupancy for last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const residentCount = await prisma.resident.count({
          where: {
            admissionDate: {
              lt: nextMonthDate
            },
            OR: [
              {
                dischargeDate: null
              },
              {
                dischargeDate: {
                  gte: monthDate
                }
              }
            ],
            archivedAt: null
          }
        });
        
        const occupancyPercentage = totalCapacity > 0 
          ? Math.round((residentCount / totalCapacity) * 100)
          : 0;
        
        occupancyTrend.push({
          month: monthNames[monthDate.getMonth()],
          occupancy: occupancyPercentage
        });
      }
      
      console.log('Occupancy trend:', occupancyTrend);
    } catch (error) {
      console.error('Error calculating occupancy trend:', error);
      // Provide fallback data
      occupancyTrend = [
        { month: 'Jul', occupancy: 0 },
        { month: 'Aug', occupancy: 0 },
        { month: 'Sep', occupancy: 0 },
        { month: 'Oct', occupancy: 0 },
        { month: 'Nov', occupancy: 0 },
        { month: 'Dec', occupancy: 0 }
      ];
    }

    // CHART 2: Conversion Funnel
    let conversionFunnel: Array<{ stage: string; count: number }> = [];
    
    try {
      const stages = [
        { label: 'New', status: 'NEW' },
        { label: 'Contacted', status: 'CONTACTED' },
        { label: 'Tour Scheduled', status: 'TOUR_SCHEDULED' },
        { label: 'Tour Completed', status: 'TOUR_COMPLETED' },
        { label: 'Qualified', status: 'QUALIFIED' },
        { label: 'Converted', status: 'CONVERTED' }
      ];
      
      for (const stage of stages) {
        const count = await prisma.inquiry.count({
          where: {
            status: stage.status as any
          }
        });
        
        conversionFunnel.push({
          stage: stage.label,
          count
        });
      }
      
      console.log('Conversion funnel:', conversionFunnel);
    } catch (error) {
      console.error('Error calculating conversion funnel:', error);
      conversionFunnel = [
        { stage: 'New', count: 0 },
        { stage: 'Contacted', count: 0 },
        { stage: 'Tour Scheduled', count: 0 },
        { stage: 'Tour Completed', count: 0 },
        { stage: 'Qualified', count: 0 },
        { stage: 'Converted', count: 0 }
      ];
    }

    // CHART 3: Incident Distribution (by severity)
    let incidentDistribution: Array<{ severity: string; count: number }> = [];
    
    try {
      const severities = ['Minor', 'Moderate', 'Severe', 'Critical'];
      
      for (const severity of severities) {
        const count = await prisma.residentIncident.count({
          where: {
            severity
          }
        });
        
        incidentDistribution.push({
          severity,
          count
        });
      }
      
      console.log('Incident distribution:', incidentDistribution);
    } catch (error) {
      console.error('Error calculating incident distribution:', error);
      incidentDistribution = [
        { severity: 'Minor', count: 0 },
        { severity: 'Moderate', count: 0 },
        { severity: 'Severe', count: 0 },
        { severity: 'Critical', count: 0 }
      ];
    }

    // Return enhanced chart data
    const charts = {
      occupancyTrend,
      conversionFunnel,
      incidentDistribution,
    };

    console.log('Returning enhanced charts');
    return NextResponse.json(charts);

  } catch (error: any) {
    console.error('=== Dashboard Charts Error ===');
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch charts', details: error.message },
      { status: 500 }
    );
  }
}
