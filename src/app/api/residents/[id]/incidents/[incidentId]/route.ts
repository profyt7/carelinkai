import { NextRequest, NextResponse } from 'next/server';
import { AuditAction } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function canAccess(sessionEmail: string | null | undefined, residentId: string) {
  if (!sessionEmail) return false;
  const user = await prisma.user.findUnique({ where: { email: sessionEmail }, select: { id: true, role: true } });
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'OPERATOR') {
    const op = await prisma.operator.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!op) return false;
    const res = await prisma.resident.findUnique({ where: { id: residentId }, select: { home: { select: { operatorId: true } } } });
    if (!res) return false;
    return res.home?.operatorId === op.id;
  }
  return false;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; incidentId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    if (!(await canAccess(session!.user!.email, params.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({
      type: z.string().min(1).optional(),
      severity: z.string().min(1).optional(),
      status: z.string().optional(),
      description: z.string().optional(),
      occurredAt: z.string().datetime().optional(),
      location: z.string().optional(),
      reportedBy: z.string().optional(),
      reportedAt: z.string().datetime().optional(),
      witnessedBy: z.string().optional(),
      actionsTaken: z.string().optional(),
      followUpRequired: z.boolean().optional(),
      resolutionNotes: z.string().optional(),
      resolvedAt: z.string().datetime().optional(),
      resolvedBy: z.string().optional()
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
    const data: any = { ...parsed.data };
    if (data.occurredAt) data.occurredAt = new Date(data.occurredAt);
    if (data.reportedAt) data.reportedAt = new Date(data.reportedAt);
    if (data.resolvedAt) data.resolvedAt = new Date(data.resolvedAt);
    const updated = await prisma.residentIncident.update({ where: { id: params.incidentId }, data, select: { id: true } });
    await createAuditLogFromRequest(req, AuditAction.UPDATE, 'ResidentIncident', updated.id, 'Updated incident', { residentId: params.id });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error('Incident update error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; incidentId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    if (!(await canAccess(session!.user!.email, params.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const found = await prisma.residentIncident.findUnique({ where: { id: params.incidentId }, select: { id: true, residentId: true } });
    if (!found || found.residentId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.residentIncident.delete({ where: { id: found.id } });
    await createAuditLogFromRequest(req, AuditAction.DELETE, 'ResidentIncident', found.id, 'Deleted incident', { residentId: params.id });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error('Incident delete error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
