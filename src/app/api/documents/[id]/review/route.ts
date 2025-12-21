/**
 * API Route: POST /api/documents/[id]/review
 * Mark a document as reviewed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { markDocumentAsReviewed } from '@/lib/documents/processing';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction, DocumentType } from '@prisma/client';
import { z } from 'zod';

const reviewSchema = z.object({
  type: z.enum([
    'MEDICAL_RECORD',
    'INSURANCE',
    'IDENTIFICATION',
    'FINANCIAL',
    'LEGAL',
    'ASSESSMENT_FORM',
    'EMERGENCY_CONTACT',
    'GENERAL',
  ]).optional(),
  notes: z.string().optional(),
});

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

    // Parse request body
    const body = await request.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { type, notes } = validation.data;

    // Mark document as reviewed
    const updatedDocument = await markDocumentAsReviewed(
      documentId,
      session.user.id,
      {
        type: type as DocumentType | undefined,
        notes,
      }
    );

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.UPDATE,
      userId: session.user.id,
      details: {
        documentId,
        action: 'reviewed',
        typeChanged: !!type,
        newType: type,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      document: updatedDocument,
    });
  } catch (error) {
    console.error('Review API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to mark document as reviewed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
