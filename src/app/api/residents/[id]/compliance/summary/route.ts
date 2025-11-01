import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';

// Assumptions:
// - DueSoon = dueDate within next 7 days (and not completed)
// - Overdue = dueDate in the past (and not completed)

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireOperatorOrAdmin();
  if (error) return error;

  const resident = await prisma.resident.findUnique({ where: { id: params.id }, select: { id: true, home: { select: { operatorId: true } } } });
  if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (session!.user!.role === 'OPERATOR') {
    const me = await prisma.user.findUnique({ where: { email: session!.user!.email! }, select: { id: true } });
    const op = me ? await prisma.operator.findUnique({ where: { userId: me.id }, select: { id: true } }) : null;
    if (!op || resident.home?.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [open, completed, dueSoon, overdue] = await Promise.all([
    prisma.residentComplianceItem.count({ where: { residentId: resident.id, status: 'OPEN' } }),
    prisma.residentComplianceItem.count({ where: { residentId: resident.id, status: 'COMPLETED' } }),
    prisma.residentComplianceItem.count({ where: { residentId: resident.id, status: 'OPEN', dueDate: { gte: now, lte: soon } } }),
    prisma.residentComplianceItem.count({ where: { residentId: resident.id, status: 'OPEN', dueDate: { lt: now } } }),
  ]);

  return NextResponse.json({ open, completed, dueSoon, overdue });
}
