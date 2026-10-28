export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/documents/needs-review
 * Get documents that need review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDocumentsNeedingReview } from '@/lib/documents/processing';

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

    // Get documents needing review
    const documents = await getDocumentsNeedingReview(
      userIdFilter || undefined
    );

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('Needs review API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch documents needing review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
