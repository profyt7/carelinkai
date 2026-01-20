export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { captureError, addBreadcrumb, captureMessage } from '@/lib/sentry';
import { createAuditLogFromRequest } from '@/lib/audit';

export async function DELETE(req: Request, { params }: { params: { id: string; docId: string } }) {
  try {
    const t0 = Date.now();
    addBreadcrumb('documents_delete_start', 'api', { residentId: params.id, documentId: params.docId }, 'info');
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    // Ensure resident exists and is within operator scope
    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, home: { select: { operatorId: true } } },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if ((session as any).user.role === 'OPERATOR') {
      const me = await prisma.user.findUnique({ where: { email: (session as any).user.email! }, select: { id: true } });
      const op = me ? await prisma.operator.findUnique({ where: { userId: me.id }, select: { id: true } }) : null;
      if (!op || resident.home?.operatorId !== op.id) {
        captureMessage('documents_delete_forbidden', 'warning', {
          residentId: resident.id, opFound: !!op, residentOpId: resident.home?.operatorId, opId: op?.id
        });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
      }
    }

    // Ensure document belongs to resident
    const doc = await prisma.document.findUnique({ where: { id: params.docId } });
    if (!doc || doc.residentId !== resident.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.document.delete({ where: { id: params.docId } });
    const dur = Date.now() - t0;
    addBreadcrumb('document_deleted', 'resident', { residentId: resident.id, documentId: params.docId, dur }, 'info');
    await createAuditLogFromRequest(req as any, 'DELETE', 'Document', params.docId, 'Deleted resident document');
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { extra: { route: 'documents_delete' } });
    console.error('documents DELETE error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
