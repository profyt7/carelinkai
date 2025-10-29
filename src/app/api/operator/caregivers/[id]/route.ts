import { NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';
import { requireOperatorOrAdmin } from '@/lib/rbac';

const prisma = new PrismaClient();

const endEmploymentSchema = z.object({
  endDate: z.string().datetime().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = params.id;
    const employment = await prisma.caregiverEmployment.findUnique({ where: { id } });
    if (!employment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || operator.id !== employment.operatorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const parsed = endEmploymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const end = parsed.data.endDate ? new Date(parsed.data.endDate) : new Date();

    const updated = await prisma.caregiverEmployment.update({
      where: { id },
      data: { endDate: end, isActive: false },
    });

    return NextResponse.json({ employmentId: updated.id, isActive: updated.isActive, endDate: updated.endDate });
  } catch (e) {
    console.error('End caregiver employment failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}