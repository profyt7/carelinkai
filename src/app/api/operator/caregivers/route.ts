import { NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';
import { requireOperatorOrAdmin } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

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

    // For operators, filter by their employment records
    if (user.role === UserRole.OPERATOR) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (operator) {
        caregiverWhere.employments = {
          some: {
            operatorId: operator.id,
            isActive: true
          }
        };
      }
    }

    // Query caregivers with all related data
    const caregivers = await prisma.caregiver.findMany({
      where: caregiverWhere,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
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
      orderBy: [
        { employmentStatus: 'asc' },
        { user: { firstName: 'asc' } }
      ]
    });

    return NextResponse.json({
      caregivers: caregivers.map((caregiver) => ({
        id: caregiver.id,
        user: {
          firstName: caregiver.user.firstName,
          lastName: caregiver.user.lastName,
          email: caregiver.user.email,
          phoneNumber: caregiver.user.phoneNumber,
        },
        photoUrl: caregiver.photoUrl,
        specializations: caregiver.languages || [], // Using languages as specializations for now
        employmentType: caregiver.employmentType || 'FULL_TIME',
        employmentStatus: caregiver.employmentStatus,
        certifications: caregiver.certifications.map(cert => ({
          id: cert.id,
          expiryDate: cert.expiryDate,
        }))
      })),
    });
  } catch (e) {
    console.error('List operator caregivers failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
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
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
