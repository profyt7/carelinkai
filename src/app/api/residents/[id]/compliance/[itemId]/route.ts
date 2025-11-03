import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import * as Sentry from '@sentry/nextjs';

const UpdateSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  owner: z.string().optional(),
  severity: z.string().optional(),
  status: z.enum(['OPEN', 'COMPLETED']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
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
    const data = UpdateSchema.parse(payload);

    const updated = await prisma.residentComplianceItem.update({
      where: { id: params.itemId },
      data: {
        title: data.title ?? undefined,
        notes: data.notes ?? undefined,
        owner: data.owner ?? undefined,
        severity: data.severity ?? undefined,
        status: data.status as any,
        dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
        completedAt: data.completedAt === undefined ? undefined : data.completedAt ? new Date(data.completedAt) : null,
      },
    });
    Sentry.addBreadcrumb({ category: 'resident', message: 'compliance_updated', level: 'info', data: { residentId: resident.id, itemId: updated.id } });
    await createAuditLogFromRequest(req, 'UPDATE', 'ResidentComplianceItem', updated.id, 'Updated compliance item');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('compliance PATCH error', e);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
