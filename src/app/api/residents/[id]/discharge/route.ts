import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ResidentStatus } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';

const prisma = new PrismaClient();

// Assumptions:
// - Discharge sets status=DISCHARGED and dischargeDate (defaults to now)
// - Optionally accepts status=DECEASED to record end-of-life discharge
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({} as any));
    const { dischargeDate, status } = body || {};

    const resident = await prisma.resident.findUnique({ where: { id: params.id }, select: { admissionDate: true } });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const when = dischargeDate ? new Date(dischargeDate) : new Date();
    if (resident.admissionDate && when < resident.admissionDate) {
      return NextResponse.json({ error: 'dischargeDate cannot be before admissionDate' }, { status: 400 });
    }

    const newStatus = status === 'DECEASED' ? ResidentStatus.DECEASED : ResidentStatus.DISCHARGED;

    const updated = await prisma.resident.update({
      where: { id: params.id },
      data: { status: newStatus, dischargeDate: when },
      select: { id: true },
    });
    return NextResponse.json({ success: true, id: updated.id });
  } catch (e) {
    console.error('Resident discharge error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
