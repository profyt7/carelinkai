import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operator = user.role === UserRole.ADMIN ? null : await prisma.operator.findUnique({ where: { userId: user.id } });
    const where = operator ? { operatorId: operator.id } : {};

    const employments = await prisma.caregiverEmployment.findMany({
      where,
      include: { caregiver: { include: { user: true } } },
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
    });

    return NextResponse.json({
      caregivers: employments.map((e) => ({
        employmentId: e.id,
        caregiverId: e.caregiverId,
        name: `${e.caregiver.user.firstName} ${e.caregiver.user.lastName}`.trim(),
        email: e.caregiver.user.email,
        position: e.position,
        startDate: e.startDate,
        endDate: e.endDate,
        isActive: e.isActive,
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
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
