import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ResidentStatus, AuditAction } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';

const prisma = new PrismaClient();

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

    let setHomeId: string | null | undefined = homeId ?? undefined;
    if (setHomeId) {
      // Validate operator owns the home
      const res = await prisma.resident.findUnique({ where: { id: params.id }, select: { home: { select: { operatorId: true } } } });
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: setHomeId }, select: { operatorId: true } });
      if (!home) return NextResponse.json({ error: 'homeId invalid' }, { status: 400 });
      if (me.role === 'OPERATOR') {
        const op = await prisma.operator.findUnique({ where: { userId: me.id } });
        if (!op || home.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updated = await prisma.resident.update({
      where: { id: params.id },
      data: {
        status: ResidentStatus.ACTIVE,
        ...(setHomeId ? { homeId: setHomeId } : {}),
        admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        dischargeDate: null,
      },
      select: { id: true },
    });
    await createAuditLogFromRequest(
      req,
      AuditAction.UPDATE,
      'Resident',
      updated.id,
      'Resident admitted',
      { setHomeId: !!setHomeId, admissionDate: admissionDate ?? 'now' },
    );
    return NextResponse.json({ success: true, id: updated.id });
  } catch (e) {
    console.error('Resident admit error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
