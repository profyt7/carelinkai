import { NextRequest, NextResponse } from 'next/server';
import { AuditAction } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

// Assumptions (documented per instruction):
// - Storage handling is out of scope here; DELETE only removes DB record. If using S3, a
//   background job or signed URL policy should handle lifecycle deletion per compliance.
// - RBAC: Admins can delete any resident document. Operators can delete only for residents
//   within their operator's homes. Families cannot access this route.

async function ensureOperatorAccess(sessionEmail: string | null | undefined, residentId: string) {
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const can = await ensureOperatorAccess(session!.user!.email, params.id);
    if (!can) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const doc = await prisma.document.findUnique({ where: { id: params.docId }, select: { id: true, residentId: true, title: true } });
    if (!doc || doc.residentId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.document.delete({ where: { id: doc.id } });
    await createAuditLogFromRequest(req, AuditAction.DELETE, 'Document', doc.id, 'Deleted resident document', { residentId: params.id, title: doc.title });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Resident document delete error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
