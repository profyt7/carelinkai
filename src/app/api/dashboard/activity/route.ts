import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/activity
 * SIMPLIFIED VERSION - Returns empty array
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Dashboard Activity API Called ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', session.user.email);

    // Return empty activity for now
    const activities: any[] = [];

    console.log('Returning activities:', activities);
    return NextResponse.json({ activities });

  } catch (error: any) {
    console.error('=== Dashboard Activity Error ===');
    console.error('Error:', error);
    console.error('Message:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch activity', details: error.message },
      { status: 500 }
    );
  }
}
