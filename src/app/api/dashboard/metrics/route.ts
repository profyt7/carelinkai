import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/metrics
 * SIMPLIFIED VERSION - Returns only basic counts without complex queries
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Dashboard Metrics API Called ===');
    
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

    // SIMPLE COUNTS ONLY - NO COMPLEX QUERIES
    const [
      totalResidents,
      totalCaregivers,
      totalInquiries,
      totalIncidents,
    ] = await Promise.all([
      prisma.resident.count(),
      prisma.caregiver.count(),
      prisma.inquiry.count(),
      prisma.residentIncident.count(),
    ]);

    console.log('Counts:', { totalResidents, totalCaregivers, totalInquiries, totalIncidents });

    // Return minimal metrics structure
    const metrics = {
      totalResidents: {
        value: totalResidents,
        subtitle: 'Total residents',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      activeCaregivers: {
        value: totalCaregivers,
        subtitle: 'Total caregivers',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      pendingInquiries: {
        value: totalInquiries,
        subtitle: 'Total inquiries',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      criticalIncidents: {
        value: totalIncidents,
        subtitle: 'Total incidents',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      overdueAssessments: {
        value: 0,
        subtitle: 'Placeholder',
        trend: 'neutral' as const,
        trendValue: 0,
      },
      toursThisWeek: {
        value: 0,
        subtitle: 'Placeholder',
        trend: 'neutral' as const,
        trendValue: 0,
      },
    };

    console.log('Returning metrics:', metrics);
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
