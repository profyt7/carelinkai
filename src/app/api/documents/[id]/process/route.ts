/**
 * API Route: POST /api/documents/[id]/process
 * Process a document (classify + validate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processDocument } from '@/lib/documents/processing';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

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

    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Process the document (classify + validate)
    const result = await processDocument(documentId);

    if (!result.success) {
      // Create audit log for failed processing
      await createAuditLogFromRequest(
        request,
        AuditAction.UPDATE,
        'DOCUMENT',
        documentId,
        'Document processing failed',
        {
          action: 'processing_failed',
          error: result.error,
        }
      );

      return NextResponse.json(
        { error: result.error || 'Processing failed' },
        { status: 500 }
      );
    }

    // Get updated document
    const updatedDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        inquiry: {
          select: {
            id: true,
            contactName: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.UPDATE,
      'DOCUMENT',
      documentId,
      'Document processed',
      {
        action: 'processed',
        classified: result.classified,
        validated: result.validated,
        autoClassified: result.autoClassified,
        needsReview: result.needsReview,
      }
    );

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      processing: {
        classified: result.classified,
        validated: result.validated,
        autoClassified: result.autoClassified,
        needsReview: result.needsReview,
      },
    });
  } catch (error) {
    console.error('Processing API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
