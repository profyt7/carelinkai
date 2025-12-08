export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';

async function assertOperatorAccess(userId: string, residentId: string) {
  const operator = await prisma.operator.findUnique({ where: { userId } });
  if (!operator) return false;
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { home: { select: { operatorId: true } } },
  });
  if (!resident) return false;
  if (!resident.home) return true;
  return resident.home.operatorId === operator.id;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    const role = (session as any)?.user?.role as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (role !== 'ADMIN') {
      const ok = await assertOperatorAccess(userId, params.id);
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [open, completed, dueSoon, overdue] = await Promise.all([
      prisma.residentComplianceItem.count({
        where: { residentId: params.id, status: { in: ['CURRENT', 'EXPIRING_SOON', 'EXPIRED'] as any[] } },
      }),
      prisma.residentComplianceItem.count({
        where: { residentId: params.id, status: 'CURRENT' as any },
      }),
      prisma.residentComplianceItem.count({
        where: { residentId: params.id, status: 'EXPIRING_SOON' as any },
      }),
      prisma.residentComplianceItem.count({
        where: { residentId: params.id, status: 'EXPIRED' as any },
      }),
    ]);

    await createAuditLogFromRequest(
      req,
      'READ' as any,
      'ResidentComplianceItem',
      params.id,
      'Operator viewed compliance summary',
      { scope: 'operator_compliance_summary' }
    );

    return NextResponse.json({ open, completed, dueSoon, overdue });
  } catch (e) {
    console.error('Operator compliance summary error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
