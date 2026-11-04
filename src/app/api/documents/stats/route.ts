export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/documents/stats
 * Get document processing statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProcessingStats } from '@/lib/documents/processing';
import { isDocumentAdmin } from '@/lib/documents/access';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userIdFilter = searchParams.get('userId');

    // Get processing statistics
    // P0-5: only ADMIN/STAFF may see platform-wide or another user's stats; everyone else sees their own uploads.
    const admin = await isDocumentAdmin(session.user.id);
    const stats = await getProcessingStats(admin ? userIdFilter || undefined : session.user.id);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch processing statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
