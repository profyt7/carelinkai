import { NextResponse } from 'next/server';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { PrismaClient, ShiftStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = params.id;
    const shift = await prisma.caregiverShift.findUnique({ where: { id }, include: { home: true } });
    if (!shift) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Ensure operator owns this shift's home (unless admin)
    if (user.role === UserRole.OPERATOR) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || shift.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await _req.json().catch(() => ({}));
    const caregiverId: string | null | undefined = body?.caregiverId;

    // Disallow changing assignment for in-progress or completed shifts
    if (shift.status === ShiftStatus.IN_PROGRESS || shift.status === ShiftStatus.COMPLETED) {
      return NextResponse.json({ error: 'Cannot modify an in-progress or completed shift' }, { status: 400 });
    }

    if (caregiverId) {
      // Validate caregiver belongs to operator (if operator role)
      if (user.role === UserRole.OPERATOR) {
        const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
        const employment = await prisma.caregiverEmployment.findFirst({
          where: { caregiverId, operatorId: operator!.id, isActive: true },
        });
        if (!employment) {
          return NextResponse.json({ error: 'Caregiver not employed by operator' }, { status: 400 });
        }
      }

      const updated = await prisma.caregiverShift.update({
        where: { id },
        data: { caregiverId, status: ShiftStatus.ASSIGNED },
        include: { home: true, caregiver: { include: { user: true } } },
      });
      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        caregiverId: updated.caregiverId,
      });
    } else {
      // Unassign
      const updated = await prisma.caregiverShift.update({
        where: { id },
        data: { caregiverId: null, status: ShiftStatus.OPEN },
        include: { home: true },
      });
      return NextResponse.json({ id: updated.id, status: updated.status, caregiverId: null });
    }
  } catch (e) {
    console.error('Assign shift failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
