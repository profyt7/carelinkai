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

export async function PATCH(req: NextRequest, { params }: { params: { id: string, itemId: string } }) {
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

    const body = await req.json().catch(() => ({}));
    const { status, title, notes, issuedDate, expiryDate, documentUrl, verifiedBy, verifiedAt } = body || {};

    const updated = await prisma.residentComplianceItem.update({
      where: { id: params.itemId },
      data: {
        status,
        title,
        notes,
        issuedDate: issuedDate ? new Date(issuedDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        documentUrl: documentUrl ?? undefined,
        verifiedBy: verifiedBy ?? undefined,
        verifiedAt: verifiedAt ? new Date(verifiedAt) : undefined,
      },
      select: {
        id: true, type: true, title: true, notes: true, status: true, 
        issuedDate: true, expiryDate: true, documentUrl: true, 
        verifiedBy: true, verifiedAt: true,
      },
    });

    await createAuditLogFromRequest(
      req,
      'UPDATE' as any,
      'ResidentComplianceItem',
      params.itemId,
      'Operator updated compliance item',
      { scope: 'operator_compliance_update', residentId: params.id }
    );

    return NextResponse.json({ item: updated });
  } catch (e) {
    console.error('Operator compliance update error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
