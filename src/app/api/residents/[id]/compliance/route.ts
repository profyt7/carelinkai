import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import * as Sentry from '@sentry/nextjs';

// Assumptions:
// - Status OPEN items considered DueSoon if dueDate within 7 days; Overdue if dueDate < now.
// - POST creates a new item; PATCH moves to /[itemId] route for updates.

const CreateSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  notes: z.string().optional(),
  owner: z.string().optional(),
  severity: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const status = (url.searchParams.get('status') || '').toUpperCase(); // OPEN|COMPLETED
    const dueBefore = url.searchParams.get('dueBefore');
    const dueAfter = url.searchParams.get('dueAfter');

    const resident = await prisma.resident.findUnique({ where: { id: params.id }, select: { id: true, home: { select: { operatorId: true } } } });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session!.user!.role === 'OPERATOR') {
      const me = await prisma.user.findUnique({ where: { email: session!.user!.email! }, select: { id: true } });
      const op = me ? await prisma.operator.findUnique({ where: { userId: me.id }, select: { id: true } }) : null;
      if (!op || resident.home?.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: any = { residentId: params.id };
    if (status) where.status = status as any;
    if (dueBefore) where.dueDate = { ...(where.dueDate || {}), lte: new Date(dueBefore) };
    if (dueAfter) where.dueDate = { ...(where.dueDate || {}), gte: new Date(dueAfter) };

    const items = await prisma.residentComplianceItem.findMany({ where, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }] });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('compliance GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const resident = await prisma.resident.findUnique({ where: { id: params.id }, select: { id: true, home: { select: { operatorId: true } } } });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session!.user!.role === 'OPERATOR') {
      const me = await prisma.user.findUnique({ where: { email: session!.user!.email! }, select: { id: true } });
      const op = me ? await prisma.operator.findUnique({ where: { userId: me.id }, select: { id: true } }) : null;
      if (!op || resident.home?.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const data = CreateSchema.parse(payload);
    const created = await prisma.residentComplianceItem.create({
      data: {
        residentId: resident.id,
        type: data.type,
        title: data.title,
        notes: data.notes || null,
        owner: data.owner || null,
        severity: data.severity || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });
    Sentry.addBreadcrumb({ category: 'resident', message: 'compliance_created', level: 'info', data: { residentId: resident.id, itemId: created.id } });
    await createAuditLogFromRequest(req, 'CREATE', 'ResidentComplianceItem', created.id, 'Created compliance item');
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e: any) {
    console.error('compliance POST error', e);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
