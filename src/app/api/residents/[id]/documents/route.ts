import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import * as Sentry from '@sentry/nextjs';
import { createAuditLogFromRequest } from '@/lib/audit';

const CreateDocSchema = z.object({
  title: z.string().min(1),
  fileUrl: z.string().url(),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive(),
  isEncrypted: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const t0 = Date.now();
    Sentry.addBreadcrumb({ category: 'api', message: 'documents_get_start', level: 'info', data: { residentId: params.id } });
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, home: { select: { operatorId: true } } },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if ((session as any).user.role === 'OPERATOR') {
      const me = await prisma.user.findUnique({ where: { email: (session as any).user.email! }, select: { id: true } });
      const op = me ? await prisma.operator.findUnique({ where: { userId: me.id }, select: { id: true } }) : null;
      if (!op || resident.home?.operatorId !== op.id) {
        Sentry.captureMessage('documents_get_forbidden', {
          level: 'warning',
          extra: { residentId: resident.id, opFound: !!op, residentOpId: resident.home?.operatorId, opId: op?.id }
        });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
      }
    }

    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get('limit') || '50') || 50, 200);
    const items = await prisma.document.findMany({
      where: { residentId: resident.id },
      orderBy: { createdAt: 'desc' },
      take,
    });
    const dur = Date.now() - t0;
    Sentry.addBreadcrumb({ category: 'api', message: 'documents_get_ok', level: 'info', data: { residentId: resident.id, count: items.length, dur } });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    Sentry.captureException(e, { extra: { route: 'documents_get' } });
    console.error('documents GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const t0 = Date.now();
    Sentry.addBreadcrumb({ category: 'api', message: 'documents_post_start', level: 'info', data: { residentId: params.id } });
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, familyId: true, home: { select: { operatorId: true } } },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if ((session as any).user.role === 'OPERATOR') {
      const me = await prisma.user.findUnique({ where: { email: (session as any).user.email! }, select: { id: true } });
      const op = me ? await prisma.operator.findUnique({ where: { userId: me.id }, select: { id: true } }) : null;
      if (!op || resident.home?.operatorId !== op.id) {
        Sentry.captureMessage('documents_post_forbidden', {
          level: 'warning',
          extra: { residentId: resident.id, opFound: !!op, residentOpId: resident.home?.operatorId, opId: op?.id }
        });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
      }
    }

    const body = await req.json();
    const data = CreateDocSchema.parse(body);

    const doc = await prisma.document.create({
      data: {
        residentId: resident.id,
        title: data.title,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        isEncrypted: data.isEncrypted ?? true,
        // Default to RESIDENT_RECORD for operator-managed documents
        type: 'RESIDENT_RECORD' as any,
      },
    });

    const dur = Date.now() - t0;
    Sentry.addBreadcrumb({ category: 'resident', message: 'document_created', level: 'info', data: { residentId: resident.id, documentId: doc.id, dur } });
    await createAuditLogFromRequest(req, 'CREATE', 'Document', doc.id, 'Created resident document');
    return NextResponse.json({ id: doc.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    Sentry.captureException(e, { extra: { route: 'documents_post' } });
    console.error('documents POST error', e);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
