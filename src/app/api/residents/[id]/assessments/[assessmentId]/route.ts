import { NextRequest, NextResponse } from 'next/server';
import { AuditAction } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string; assessmentId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    if (!(await canAccess(session!.user!.email, params.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({ type: z.string().min(1).optional(), score: z.number().int().nullable().optional(), data: z.any().optional() });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
    const updated = await prisma.assessmentResult.update({ where: { id: params.assessmentId }, data: parsed.data, select: { id: true } });
    await createAuditLogFromRequest(req, AuditAction.UPDATE, 'AssessmentResult', updated.id, 'Updated assessment result', { residentId: params.id });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Assessment update error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; assessmentId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    if (!(await canAccess(session!.user!.email, params.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const found = await prisma.assessmentResult.findUnique({ where: { id: params.assessmentId }, select: { id: true, residentId: true } });
    if (!found || found.residentId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.assessmentResult.delete({ where: { id: found.id } });
    await createAuditLogFromRequest(req, AuditAction.DELETE, 'AssessmentResult', found.id, 'Deleted assessment result', { residentId: params.id });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Assessment delete error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
