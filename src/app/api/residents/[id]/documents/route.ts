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
      if (!op || resident.home?.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get('limit') || '50') || 50, 200);
    const items = await prisma.document.findMany({
      where: { residentId: resident.id },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('documents GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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
      if (!op || resident.home?.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    Sentry.addBreadcrumb({ category: 'resident', message: 'document_created', level: 'info', data: { residentId: resident.id, documentId: doc.id } });
    await createAuditLogFromRequest(req, 'CREATE', 'Document', doc.id, 'Created resident document');
    return NextResponse.json({ id: doc.id });
  } catch (e: any) {
    console.error('documents POST error', e);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
