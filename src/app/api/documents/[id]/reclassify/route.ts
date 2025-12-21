/**
 * API Route: POST /api/documents/[id]/reclassify
 * Override document classification manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction, DocumentType } from '@prisma/client';
import { z } from 'zod';

const reclassifySchema = z.object({
  type: z.enum([
    'MEDICAL_RECORD',
    'INSURANCE',
    'IDENTIFICATION',
    'FINANCIAL',
    'LEGAL',
    'ASSESSMENT_FORM',
    'EMERGENCY_CONTACT',
    'GENERAL',
  ]),
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
    const validation = reclassifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { type, notes } = validation.data;

    // Update document classification
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        type: type as DocumentType,
        autoClassified: false, // Manual override
        reviewStatus: 'REVIEWED',
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        notes: notes || document.notes,
        classificationReasoning: `Manually reclassified by ${session.user.firstName} ${session.user.lastName}`,
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
        reviewedBy: {
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
        action: 'reclassified',
        oldType: document.type,
        newType: type,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      message: `Document reclassified as ${type}`,
    });
  } catch (error) {
    console.error('Reclassify API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reclassify document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
