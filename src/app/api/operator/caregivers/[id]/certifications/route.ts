import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { UserRole, CertificationType, CertificationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/operator/caregivers/[id]/certifications - List all certifications
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_VIEW permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);
    
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

    // Fetch certifications
    const certifications = await prisma.caregiverCertification.findMany({
      where: { caregiverId: params.id },
      orderBy: { expiryDate: 'asc' }
    });

    return NextResponse.json({ certifications });
  } catch (error) {
    console.error('[GET Certifications] Error:', error);
    return handleAuthError(error);
  }
}

// POST /api/operator/caregivers/[id]/certifications - Add new certification
const createCertificationSchema = z.object({
  certificationType: z.nativeEnum(CertificationType),
  certificationNumber: z.string().min(1),
  issuedBy: z.string().min(1),
  issuedDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(CertificationStatus).optional().default(CertificationStatus.ACTIVE),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Parse and validate request body
    const body = await request.json();
    const parsed = createCertificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Create certification
    const certification = await prisma.caregiverCertification.create({
      data: {
        caregiverId: params.id,
        ...parsed.data,
        issuedDate: new Date(parsed.data.issuedDate),
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        verifiedBy: user.id,
        verifiedAt: new Date(),
      }
    });

    return NextResponse.json({
      message: 'Certification added successfully',
      certification
    }, { status: 201 });
  } catch (error) {
    console.error('[POST Certification] Error:', error);
    return handleAuthError(error);
  }
}
