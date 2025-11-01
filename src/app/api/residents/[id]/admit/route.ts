import { NextRequest, NextResponse } from 'next/server';
import { ResidentStatus, AuditAction, UserRole } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

// use singleton prisma

// Assumptions:
// - Admission sets status=ACTIVE and admissionDate (defaults to now if not provided)
// - Optionally accepts homeId; operators can only admit into their own homes
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({} as any));
    const { homeId, admissionDate } = body || {};

    const me = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resident = await prisma.resident.findUnique({ where: { id: params.id }, select: { id: true, status: true, homeId: true } });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let setHomeId: string | null | undefined = homeId ?? resident.homeId ?? undefined;
    if (setHomeId) {
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: setHomeId }, select: { operatorId: true } });
      if (!home) return NextResponse.json({ error: 'homeId invalid' }, { status: 400 });
      if (me.role === UserRole.OPERATOR) {
        const op = await prisma.operator.findUnique({ where: { userId: me.id } });
        if (!op || home.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // If currently ACTIVE and had a home we assume re-admission is not typical; no decrement.
      const updated = await tx.resident.update({
        where: { id: resident.id },
        data: {
          status: ResidentStatus.ACTIVE,
          ...(setHomeId ? { homeId: setHomeId } : {}),
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
          dischargeDate: null,
        },
        select: { id: true },
      });
      // Increment occupancy if ACTIVE and has a home
      if (setHomeId) {
        await tx.assistedLivingHome.update({ where: { id: setHomeId }, data: { currentOccupancy: { increment: 1 } } });
      }
      return updated;
    });

    await createAuditLogFromRequest(
      req,
      AuditAction.UPDATE,
      'Resident',
      result.id,
      'Resident admitted',
      { setHomeId: !!setHomeId, admissionDate: admissionDate ?? 'now' },
    );
    return NextResponse.json({ success: true, id: result.id });
  } catch (e) {
    console.error('Resident admit error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    // noop singleton
  }
}
