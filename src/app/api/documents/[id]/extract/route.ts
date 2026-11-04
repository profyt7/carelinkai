
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { denyUnlessDocumentAccess } from '@/lib/documents/access';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const documentId = params.id;
    // P0-5: the caller must be allowed to see this document (was: any signed-in user).
    const denied = await denyUnlessDocumentAccess(session.user.id, documentId);
    if (denied) return denied;

    // Dynamic import of extraction module to avoid canvas issues during build
    const { extractDocumentText } = await import('@/lib/documents/extraction');

    // Extract text from document
    const result = await extractDocumentText(documentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
      message: 'Text extraction completed successfully',
    });
  } catch (error) {
    console.error('Extraction API error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from document' },
      { status: 500 }
    );
  }
}
