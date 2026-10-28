import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction, CertificationType, CertificationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Validation schema for creating a certification
const createCertificationSchema = z.object({
  certificationType: z.nativeEnum(CertificationType),
  certificationName: z.string().optional(),
  issueDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  certificationNumber: z.string().optional(),
  issuingOrganization: z.string().optional(),
  documentUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/caregivers/[id]/certifications
 * List certifications for a caregiver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);

    const certifications = await prisma.caregiverCertification.findMany({
      where: { caregiverId: params.id },
      orderBy: [{ status: 'asc' }, { expiryDate: 'asc' }],
    });

    // Calculate status based on expiry date
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const certificationsWithStatus = certifications.map(cert => {
      let status: CertificationStatus = 'CURRENT';
      if (cert.expiryDate) {
        if (cert.expiryDate < now) {
          status = 'EXPIRED';
        } else if (cert.expiryDate < thirtyDaysFromNow) {
          status = 'EXPIRING_SOON';
        }
      }
      return { ...cert, status };
    });

    return NextResponse.json({
      certifications: certificationsWithStatus,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/caregivers/[id]/certifications
 * Create a new certification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_MANAGE_CERTIFICATIONS);
    const body = await request.json();

    const validatedData = createCertificationSchema.parse(body);

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

    // Calculate status
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let status: CertificationStatus = 'CURRENT';
    
    if (validatedData.expiryDate) {
      const expiryDate = new Date(validatedData.expiryDate);
      if (expiryDate < now) {
        status = 'EXPIRED';
      } else if (expiryDate < thirtyDaysFromNow) {
        status = 'EXPIRING_SOON';
      }
    }

    const certification = await prisma.caregiverCertification.create({
      data: {
        caregiverId: params.id,
        certificationType: validatedData.certificationType,
        certificationName: validatedData.certificationName,
        issueDate: new Date(validatedData.issueDate),
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        certificationNumber: validatedData.certificationNumber,
        issuingOrganization: validatedData.issuingOrganization,
        documentUrl: validatedData.documentUrl,
        notes: validatedData.notes,
        status,
      },
    });

    // Create audit log
    await createAuditLogFromRequest(

      request,

      AuditAction.CREATE,

      'CERTIFICATION',

      certification.id,

      'Created certification',

      { caregiverId: params.id, certificationType: validatedData.certificationType }

    );

    return NextResponse.json(certification, { status: 201 });
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
