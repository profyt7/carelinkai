import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction, CaregiverDocumentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createDocumentSchema = z.object({
  documentType: z.nativeEnum(CaregiverDocumentType),
  title: z.string().min(1),
  description: z.string().optional(),
  documentUrl: z.string().url(),
  expiryDate: z.string().datetime().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);

    const documents = await prisma.caregiverDocument.findMany({
      where: { caregiverId: params.id },
      orderBy: [{ documentType: 'asc' }, { uploadDate: 'desc' }],
    });

    return NextResponse.json({ documents });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_MANAGE_DOCUMENTS);
    const body = await request.json();

    const validatedData = createDocumentSchema.parse(body);

    // Check if caregiver exists
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.id },
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found' },
        { status: 404 }
      );
    }

    const document = await prisma.caregiverDocument.create({
      data: {
        caregiverId: params.id,
        documentType: validatedData.documentType,
        title: validatedData.title,
        description: validatedData.description,
        documentUrl: validatedData.documentUrl,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        uploadedBy: user.id,
      },
    });

    await createAuditLogFromRequest(request, {
      action: AuditAction.CREATE,
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      details: { caregiverId: params.id, documentType: validatedData.documentType },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return handleAuthError(error);
  }
}
