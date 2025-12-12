import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/alerts
 * SIMPLIFIED VERSION - Returns empty arrays
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Dashboard Alerts API Called ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', session.user.email);

    // Return empty alerts for now
    const alerts: any[] = [];

    console.log('Returning alerts:', alerts);
    return NextResponse.json({ alerts });

  } catch (error: any) {
    console.error('=== Dashboard Alerts Error ===');
    console.error('Error:', error);
    console.error('Message:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error.message },
      { status: 500 }
    );
  }
}
