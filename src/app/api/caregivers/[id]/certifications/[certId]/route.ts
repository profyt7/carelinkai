import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction, CertificationType, CertificationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Validation schema for updating a certification
const updateCertificationSchema = z.object({
  certificationType: z.nativeEnum(CertificationType).optional(),
  certificationName: z.string().optional(),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  certificationNumber: z.string().optional(),
  issuingOrganization: z.string().optional(),
  documentUrl: z.string().url().optional(),
  notes: z.string().optional(),
  verifiedBy: z.string().optional(),
});

/**
 * PATCH /api/caregivers/[id]/certifications/[certId]
 * Update a certification
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; certId: string } }
) {
  try {
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_MANAGE_CERTIFICATIONS);
    const body = await request.json();

    const validatedData = updateCertificationSchema.parse(body);

    const certification = await prisma.caregiverCertification.findUnique({
      where: { id: params.certId },
    });

    if (!certification || certification.caregiverId !== params.id) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    // Calculate status if expiry date is provided
    let status: CertificationStatus | undefined;
    if (validatedData.expiryDate) {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiryDate = new Date(validatedData.expiryDate);
      
      if (expiryDate < now) {
        status = 'EXPIRED';
      } else if (expiryDate < thirtyDaysFromNow) {
        status = 'EXPIRING_SOON';
      } else {
        status = 'CURRENT';
      }
    }

    const updated = await prisma.caregiverCertification.update({
      where: { id: params.certId },
      data: {
        certificationType: validatedData.certificationType,
        certificationName: validatedData.certificationName,
        issueDate: validatedData.issueDate ? new Date(validatedData.issueDate) : undefined,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : undefined,
        certificationNumber: validatedData.certificationNumber,
        issuingOrganization: validatedData.issuingOrganization,
        documentUrl: validatedData.documentUrl,
        notes: validatedData.notes,
        verifiedBy: validatedData.verifiedBy,
        verifiedAt: validatedData.verifiedBy ? new Date() : undefined,
        status: status,
      },
    });

    // Create audit log
    await createAuditLogFromRequest(

      request,

      AuditAction.UPDATE,

      'CERTIFICATION',

      params.certId,

      'Updated certification',

      { caregiverId: params.id, changes: validatedData }

    );

    return NextResponse.json(updated);
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

/**
 * DELETE /api/caregivers/[id]/certifications/[certId]
 * Delete a certification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; certId: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_MANAGE_CERTIFICATIONS);

    const certification = await prisma.caregiverCertification.findUnique({
      where: { id: params.certId },
    });

    if (!certification || certification.caregiverId !== params.id) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    await prisma.caregiverCertification.delete({
      where: { id: params.certId },
    });

    // Create audit log
    await createAuditLogFromRequest(

      request,

      AuditAction.DELETE,

      'CERTIFICATION',

      params.certId,

      'Deleted certification',

      { caregiverId: params.id }

    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
