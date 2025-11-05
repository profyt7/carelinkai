export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';

async function assertOperatorHomeOwnership(userId: string, homeId?: string | null) {
  if (!homeId) return true; // Allow creating unassigned residents
  const operator = await prisma.operator.findUnique({ where: { userId } });
  if (!operator) return false;
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, select: { operatorId: true } });
  return !!home && home.operatorId === operator.id;
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    const role = (session as any)?.user?.role as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { familyId, homeId, firstName, lastName, dateOfBirth, gender, status } = body || {};
    if (!familyId || !firstName || !lastName || !dateOfBirth || !gender) {
      return NextResponse.json({ error: 'familyId, firstName, lastName, dateOfBirth, gender are required' }, { status: 400 });
    }

    if (role !== 'ADMIN') {
      const ok = await assertOperatorHomeOwnership(userId, homeId);
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure family exists
    const fam = await prisma.family.findUnique({ where: { id: familyId }, select: { id: true } });
    if (!fam) return NextResponse.json({ error: 'Family not found' }, { status: 404 });

    // Create resident
    const created = await prisma.resident.create({
      data: {
        familyId,
        homeId: homeId || null,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        status: (status || 'INQUIRY') as any,
      },
      select: { id: true },
    });

    await createAuditLogFromRequest(
      req,
      'CREATE' as any,
      'Resident',
      created.id,
      'Created resident',
      { homeId: homeId || null, familyId }
    );

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Resident create error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
