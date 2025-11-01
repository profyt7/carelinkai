import { NextRequest, NextResponse } from 'next/server';
import { ResidentStatus, AuditAction } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

// singleton prisma

// Assumptions:
// - Discharge sets status=DISCHARGED and dischargeDate (defaults to now)
// - Optionally accepts status=DECEASED to record end-of-life discharge
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({} as any));
    const { dischargeDate, status } = body || {};

    const resident = await prisma.resident.findUnique({ where: { id: params.id }, select: { admissionDate: true, homeId: true, status: true } });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const when = dischargeDate ? new Date(dischargeDate) : new Date();
    if (resident.admissionDate && when < resident.admissionDate) {
      return NextResponse.json({ error: 'dischargeDate cannot be before admissionDate' }, { status: 400 });
    }

    const newStatus = status === 'DECEASED' ? ResidentStatus.DECEASED : ResidentStatus.DISCHARGED;

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.resident.update({
        where: { id: params.id },
        data: { status: newStatus, dischargeDate: when },
        select: { id: true },
      });
      // Decrement occupancy if resident was ACTIVE and had a home
      if (resident.status === 'ACTIVE' && resident.homeId) {
        await tx.assistedLivingHome.update({
          where: { id: resident.homeId },
          data: { currentOccupancy: { decrement: 1 } },
        });
      }
      return u;
    });
    await createAuditLogFromRequest(
      req,
      AuditAction.UPDATE,
      'Resident',
      updated.id,
      'Resident discharged',
      { status: newStatus, dischargeDate: when.toISOString() },
    );
    return NextResponse.json({ success: true, id: updated.id });
  } catch (e) {
    console.error('Resident discharge error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    // noop
  }
}
