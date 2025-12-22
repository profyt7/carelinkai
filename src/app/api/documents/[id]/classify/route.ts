/**
 * API Route: POST /api/documents/[id]/classify
 * Classify a document using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { classifyDocument, determineReviewStatus, shouldAutoClassify } from '@/lib/documents/classification';
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

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if document has extracted text
    if (!document.extractedText || document.extractedText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Document does not have sufficient extracted text for classification' },
        { status: 400 }
      );
    }

    // Classify the document
    const result = await classifyDocument(
      document.extractedText,
      document.fileName
    );

    if (!result.success) {
      // Create audit log for failed classification
      await createAuditLogFromRequest(
        request,
        AuditAction.UPDATE,
        'DOCUMENT',
        documentId,
        'Document classification failed',
        {
          action: 'classification_failed',
          error: result.error,
        }
      );

      return NextResponse.json(
        { error: result.error || 'Classification failed' },
        { status: 500 }
      );
    }

    const confidence = result.confidence || 0;
    const documentType = result.type!;
    const reasoning = result.reasoning || 'No reasoning provided';
    const reviewStatus = determineReviewStatus(confidence);
    const autoClassify = shouldAutoClassify(confidence);

    // Update document with classification results
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        type: documentType,
        classificationConfidence: confidence,
        classificationReasoning: reasoning,
        autoClassified: autoClassify,
        reviewStatus,
        category: result.category,
      },
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
      'Document classified',
      {
        action: 'classified',
        type: documentType,
        confidence,
        autoClassified: autoClassify,
      }
    );

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      classification: {
        type: documentType,
        confidence,
        reasoning,
        autoClassified: autoClassify,
        reviewStatus,
      },
    });
  } catch (error) {
    console.error('Classification API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to classify document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
