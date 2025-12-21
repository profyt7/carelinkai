/**
 * API Route: POST /api/documents/[id]/validate
 * Validate a document based on its type
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateDocument, getValidationStatus } from '@/lib/documents/validation';
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

    // Check if document has type and extracted text
    if (!document.type) {
      return NextResponse.json(
        { error: 'Document must be classified before validation' },
        { status: 400 }
      );
    }

    if (!document.extractedText || document.extractedText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Document does not have sufficient extracted text for validation' },
        { status: 400 }
      );
    }

    // Validate the document
    const result = await validateDocument(
      document.type,
      document.extractedText,
      document.extractedData
    );

    if (!result.success) {
      // Create audit log for failed validation
      await createAuditLogFromRequest(request, {
        action: AuditAction.UPDATE,
        userId: session.user.id,
        details: {
          documentId,
          action: 'validation_failed',
        },
      });

      return NextResponse.json(
        { error: 'Validation failed' },
        { status: 500 }
      );
    }

    const validationStatus = getValidationStatus(
      result.errors,
      result.warnings
    );

    const allValidationErrors = [
      ...result.errors,
      ...result.warnings,
    ];

    // Update document with validation results
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        validationStatus,
        validationErrors: allValidationErrors.length > 0 ? allValidationErrors : null,
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
    await createAuditLogFromRequest(request, {
      action: AuditAction.UPDATE,
      userId: session.user.id,
      details: {
        documentId,
        action: 'validated',
        validationStatus,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      },
    });

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      validation: {
        isValid: result.isValid,
        status: validationStatus,
        errors: result.errors,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
