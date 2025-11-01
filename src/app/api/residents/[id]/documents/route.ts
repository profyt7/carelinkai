import { NextRequest, NextResponse } from 'next/server';
import { DocumentType, AuditAction } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const BodySchema = z.object({
  type: z.nativeEnum(DocumentType).default(DocumentType.RESIDENT_RECORD),
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  fileType: z.string().min(1),
  fileSize: z.coerce.number().int().min(1),
  isEncrypted: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const parsed = QuerySchema.safeParse({ limit: req.nextUrl.searchParams.get('limit') ?? undefined });
    if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    const { limit } = parsed.data;
    const items = await prisma.document.findMany({
      where: { residentId: params.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, type: true, title: true, fileUrl: true, fileType: true, fileSize: true, createdAt: true },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('Resident documents list error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    // noop
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
    }
    const data = parsed.data;
    const created = await prisma.document.create({
      data: {
        residentId: params.id,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        isEncrypted: data.isEncrypted ?? true,
      },
      select: { id: true },
    });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'Document', created.id, 'Uploaded resident document', { residentId: params.id, type: data.type });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Resident document create error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    // noop
  }
}
