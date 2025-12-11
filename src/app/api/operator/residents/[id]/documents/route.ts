import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, requireResidentAccess, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

// Validation schema for creating document
const createDocumentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  fileType: z.string().min(1),
  documentType: z.enum([
    'MEDICAL_RECORD',
    'CARE_PLAN',
    'INSURANCE',
    'ADVANCE_DIRECTIVE',
    'MEDICATION_LIST',
    'ASSESSMENT_REPORT',
    'INCIDENT_REPORT',
    'PHOTO_ID',
    'EMERGENCY_CONTACT',
    'OTHER'
  ]),
  description: z.string().optional(),
  fileSize: z.number().positive(),
});

/**
 * GET /api/operator/residents/[id]/documents - Get all documents for a resident
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const user = await requirePermission(PERMISSIONS.RESIDENTS_VIEW);
    await requireResidentAccess(user.id, params.id);

    // Fetch documents
    const documents = await prisma.residentDocument.findMany({
      where: { residentId: params.id },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(documents);
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/operator/residents/[id]/documents - Create new document for resident
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const user = await requirePermission(PERMISSIONS.RESIDENTS_UPDATE);
    await requireResidentAccess(user.id, params.id);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createDocumentSchema.parse(body);

    // Create document
    const document = await prisma.residentDocument.create({
      data: {
        residentId: params.id,
        fileName: validatedData.fileName,
        fileUrl: validatedData.fileUrl,
        fileType: validatedData.fileType,
        documentType: validatedData.documentType,
        description: validatedData.description,
        fileSize: validatedData.fileSize,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      user.id,
      AuditAction.CREATE,
      {
        resourceType: 'ResidentDocument',
        residentId: params.id,
        documentId: document.id,
        documentType: validatedData.documentType,
        fileName: validatedData.fileName,
      }
    );

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return handleAuthError(error);
  }
}
