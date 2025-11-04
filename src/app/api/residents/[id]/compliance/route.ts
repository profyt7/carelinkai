export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';

// Assumptions (documented):
// - Operators may only access residents belonging to homes they operate.
// - Admins can access all residents.
// - Minimal payload validation; Prisma enforces types. Further validation can be added later with zod.

async function assertOperatorAccess(userId: string, residentId: string) {
  // Fetch operator by userId
  const operator = await prisma.operator.findUnique({ where: { userId } });
  if (!operator) return false;

  // Fetch resident's home and compare operator ownership (if resident is assigned to a home)
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { id: true, home: { select: { operatorId: true } } },
  });
  if (!resident) return false;
  if (!resident.home) return true; // Unassigned residents allowed for operator-level management
  return resident.home.operatorId === operator.id;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const userId = (session as any)?.user?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Enforce operator scoping when not admin
    const role = (session as any)?.user?.role as string | undefined;
    if (role !== 'ADMIN') {
      const ok = await assertOperatorAccess(userId, params.id);
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const items = await prisma.residentComplianceItem.findMany({
      where: { residentId: params.id },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true, type: true, title: true, notes: true, owner: true,
        status: true, severity: true, dueDate: true, completedAt: true,
      },
      take: 500,
    });

    await createAuditLogFromRequest(
      req,
      'READ' as any,
      'ResidentComplianceItem',
      params.id,
      'Operator viewed compliance items',
      { scope: 'operator_compliance_list' }
    );

    return NextResponse.json({ items });
  } catch (e) {
    console.error('Operator compliance list error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    const { type, title, notes, owner, severity, dueDate } = body || {};
    if (!type || !title) {
      return NextResponse.json({ error: 'type and title are required' }, { status: 400 });
    }

    const created = await prisma.residentComplianceItem.create({
      data: {
        residentId: params.id,
        type,
        title,
        notes,
        owner,
        severity,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: 'OPEN',
      },
      select: {
        id: true, type: true, title: true, notes: true, owner: true, severity: true,
        status: true, dueDate: true, completedAt: true,
      },
    });

    await createAuditLogFromRequest(
      req,
      'CREATE' as any,
      'ResidentComplianceItem',
      created.id,
      'Operator created compliance item',
      { scope: 'operator_compliance_create', residentId: params.id }
    );

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e) {
    console.error('Operator compliance create error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
