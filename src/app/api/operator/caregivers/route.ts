import { NextResponse, NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    console.log('[Caregivers API] Starting request...');
    
    // Use Phase 4 RBAC system - require CAREGIVERS_VIEW permission
    console.log('[Caregivers API] Step 1: Checking permissions...');
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);
    console.log('[Caregivers API] User authorized:', user.email, user.role);

    // Get query parameters for filtering
    console.log('[Caregivers API] Step 2: Parsing query params...');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    console.log('[Caregivers API] Filters - status:', status, 'type:', type);

    // Get user scope for data filtering (Phase 4 RBAC)
    console.log('[Caregivers API] Step 3: Getting user scope...');
    const scope = await getUserScope(user.id);
    console.log('[Caregivers API] Scope:', JSON.stringify(scope));

    // Build where clause for caregiver query
    let caregiverWhere: any = {};
    
    // Filter by employment status if provided
    if (status && status !== 'ALL') {
      caregiverWhere.employmentStatus = status;
    }
    
    // Filter by employment type if provided
    if (type && type !== 'ALL') {
      caregiverWhere.employmentType = type;
    }

    // Apply scope-based filtering (Phase 4 RBAC)
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && Array.isArray(scope.operatorIds)) {
      console.log('[Caregivers API] Applying OPERATOR scope filtering...');
      // For operators, filter by their employment records
      caregiverWhere.employments = {
        some: {
          operatorId: { in: scope.operatorIds },
          isActive: true
        }
      };
    } else {
      console.log('[Caregivers API] ADMIN user - no scope filtering');
    }

    console.log('[Caregivers API] Step 4: Querying database with where:', JSON.stringify(caregiverWhere));

    // Query caregivers with all related data
    const caregivers = await prisma.caregiver.findMany({
      where: caregiverWhere,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        certifications: {
          select: {
            id: true,
            expiryDate: true,
            status: true,
          },
          orderBy: {
            expiryDate: 'asc'
          }
        }
      },
    });

    console.log('[Caregivers API] Step 5: Found', caregivers.length, 'caregivers');

    // Transform and return data
    console.log('[Caregivers API] Step 6: Transforming data...');
    const transformedCaregivers = caregivers.map((caregiver) => {
      try {
        return {
          id: caregiver.id,
          user: {
            firstName: caregiver.user?.firstName || '',
            lastName: caregiver.user?.lastName || '',
            email: caregiver.user?.email || '',
            phoneNumber: caregiver.user?.phone || null,
          },
          photoUrl: caregiver.photoUrl || null,
          specializations: Array.isArray(caregiver.specialties) ? caregiver.specialties : [],
          languages: Array.isArray(caregiver.languages) ? caregiver.languages : [],
          employmentType: caregiver.employmentType || 'FULL_TIME',
          employmentStatus: caregiver.employmentStatus || 'ACTIVE',
          certifications: Array.isArray(caregiver.certifications) ? caregiver.certifications.map(cert => ({
            id: cert.id,
            expiryDate: cert.expiryDate,
          })) : []
        };
      } catch (transformError) {
        console.error('[Caregivers API] Error transforming caregiver:', caregiver.id, transformError);
        throw transformError;
      }
    });

    console.log('[Caregivers API] Step 7: Returning', transformedCaregivers.length, 'caregivers');
    return NextResponse.json({
      caregivers: transformedCaregivers,
    });
  } catch (e) {
    console.error('[Caregivers API] ========================================');
    console.error('[Caregivers API] CRITICAL ERROR OCCURRED');
    console.error('[Caregivers API] ========================================');
    console.error('[Caregivers API] Error type:', e?.constructor?.name);
    console.error('[Caregivers API] Error object:', e);
    if (e instanceof Error) {
      console.error('[Caregivers API] Error message:', e.message);
      console.error('[Caregivers API] Error stack:', e.stack);
    }
    console.error('[Caregivers API] ========================================');
    
    // Use Phase 4 RBAC error handling for auth errors
    return handleAuthError(e);
  }
}

const createEmploymentSchema = z.object({
  caregiverEmail: z.string().email(),
  position: z.string().min(2),
  startDate: z.string().datetime().optional(),
  operatorId: z.string().cuid().optional(), // required only for ADMIN
});

export async function POST(req: Request) {
  try {
    // Use Phase 4 RBAC system - require CAREGIVERS_CREATE permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_CREATE);

    const body = await req.json().catch(() => ({}));
    const parsed = createEmploymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const { caregiverEmail, position, startDate, operatorId } = parsed.data;

    let targetOperatorId: string | null = null;
    if (user.role === UserRole.ADMIN) {
      if (!operatorId) return NextResponse.json({ error: 'operatorId is required for admin' }, { status: 400 });
      targetOperatorId = operatorId;
    } else {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator) return NextResponse.json({ error: 'Operator profile not found' }, { status: 404 });
      targetOperatorId = operator.id;
    }

    const caregiverUser = await prisma.user.findUnique({ where: { email: caregiverEmail } });
    if (!caregiverUser || caregiverUser.role !== UserRole.CAREGIVER) {
      return NextResponse.json({ error: 'Caregiver not found' }, { status: 404 });
    }
    const caregiver = await prisma.caregiver.findUnique({ where: { userId: caregiverUser.id } });
    if (!caregiver) return NextResponse.json({ error: 'Caregiver profile not found' }, { status: 404 });

    // Ensure not already actively employed by this operator
    const existing = await prisma.caregiverEmployment.findFirst({
      where: { caregiverId: caregiver.id, operatorId: targetOperatorId!, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Caregiver already employed by this operator' }, { status: 409 });
    }

    const employment = await prisma.caregiverEmployment.create({
      data: {
        caregiverId: caregiver.id,
        operatorId: targetOperatorId!,
        startDate: startDate ? new Date(startDate) : new Date(),
        position,
        isActive: true,
      },
    });

    return NextResponse.json({ employmentId: employment.id }, { status: 201 });
  } catch (e) {
    console.error('Create caregiver employment failed', e);
    // Use Phase 4 RBAC error handling
    return handleAuthError(e);
  }
}
