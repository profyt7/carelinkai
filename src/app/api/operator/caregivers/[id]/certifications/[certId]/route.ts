import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { UserRole, CertificationType, CertificationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PATCH /api/operator/caregivers/[id]/certifications/[certId] - Update certification
const updateCertificationSchema = z.object({
  certificationType: z.nativeEnum(CertificationType).optional(),
  certificationNumber: z.string().min(1).optional(),
  issuedBy: z.string().min(1).optional(),
  issuedDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(CertificationStatus).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; certId: string } }
) {
  try {
    // Require CAREGIVERS_UPDATE permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_UPDATE);
    
    // Get user scope
    const scope = await getUserScope(user.id);
    
    // Verify access to this caregiver
    const whereClause: any = { id: params.id };
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && scope.operatorIds !== "ALL") {
      whereClause.employments = {
        some: {
          operatorId: { in: scope.operatorIds },
          isActive: true
        }
      };
    }

    const caregiver = await prisma.caregiver.findFirst({
      where: whereClause
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Verify certification belongs to this caregiver
    const existingCert = await prisma.caregiverCertification.findFirst({
      where: {
        id: params.certId,
        caregiverId: params.id
      }
    });

    if (!existingCert) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = updateCertificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = { ...parsed.data };
    if (parsed.data.issuedDate) {
      updateData.issuedDate = new Date(parsed.data.issuedDate);
    }
    if (parsed.data.expiryDate) {
      updateData.expiryDate = new Date(parsed.data.expiryDate);
    }

    // Update certification
    const certification = await prisma.caregiverCertification.update({
      where: { id: params.certId },
      data: updateData
    });

    return NextResponse.json({
      message: 'Certification updated successfully',
      certification
    });
  } catch (error) {
    console.error('[PATCH Certification] Error:', error);
    return handleAuthError(error);
  }
}

// DELETE /api/operator/caregivers/[id]/certifications/[certId] - Delete certification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; certId: string } }
) {
  try {
    // Require CAREGIVERS_UPDATE permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_UPDATE);
    
    // Get user scope
    const scope = await getUserScope(user.id);
    
    // Verify access to this caregiver
    const whereClause: any = { id: params.id };
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && scope.operatorIds !== "ALL") {
      whereClause.employments = {
        some: {
          operatorId: { in: scope.operatorIds },
          isActive: true
        }
      };
    }

    const caregiver = await prisma.caregiver.findFirst({
      where: whereClause
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Verify certification belongs to this caregiver
    const existingCert = await prisma.caregiverCertification.findFirst({
      where: {
        id: params.certId,
        caregiverId: params.id
      }
    });

    if (!existingCert) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    // Delete certification
    await prisma.caregiverCertification.delete({
      where: { id: params.certId }
    });

    return NextResponse.json({
      message: 'Certification deleted successfully'
    });
  } catch (error) {
    console.error('[DELETE Certification] Error:', error);
    return handleAuthError(error);
  }
}
