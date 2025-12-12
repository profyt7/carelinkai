import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/charts
 * SIMPLIFIED VERSION - Returns empty placeholder data
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Dashboard Charts API Called ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', session.user.email);

    // Return minimal placeholder data
    const charts = {
      occupancyTrend: [],
      conversionFunnel: [],
      incidentDistribution: [],
    };

    console.log('Returning charts:', charts);
    return NextResponse.json(charts);

  } catch (error: any) {
    console.error('=== Dashboard Charts Error ===');
    console.error('Error:', error);
    console.error('Message:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch charts', details: error.message },
      { status: 500 }
    );
  }
}
