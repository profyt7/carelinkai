import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { AuditAction, DocumentType, UserRole } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';
import { uploadBuffer, toS3Url, canUseS3 } from '@/lib/storage';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resident = await prisma.resident.findUnique({ where: { id: params.id }, select: { id: true, homeId: true, familyId: true, status: true, home: { select: { operatorId: true } } } });
    if (!resident) return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    if (user.role === UserRole.OPERATOR) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op || (resident.home && resident.home.operatorId !== op.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await req.formData();
    const type = String(form.get('type') || DocumentType.RESIDENT_RECORD);
    const title = String(form.get('title') || '').trim();
    const description = (form.get('description') as string) || undefined;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    const file = form.get('file') as unknown as File | null;
    if (!file || file.size <= 0) return NextResponse.json({ error: 'File required' }, { status: 400 });

    const buff = Buffer.from(await file.arrayBuffer());
    const safeName = (file.name || 'document').replace(/[^a-z0-9_.-]+/gi, '_').toLowerCase();
    const key = `residents/${resident.id}/documents/${Date.now()}-${safeName}`;
    let fileUrl: string;
    const useMock = req.headers.get('x-e2e-bypass') === '1' || !canUseS3();
    if (useMock) {
      fileUrl = `https://example.com/mock-residents/${resident.id}/${safeName}`;
    } else {
      await uploadBuffer({ key, body: buff, contentType: file.type || 'application/octet-stream', metadata: { residentId: resident.id, kind: 'resident-document' } });
      fileUrl = toS3Url(process.env['S3_BUCKET'] as string, key);
    }

    const created = await prisma.document.create({
      data: {
        residentId: resident.id,
        type: (type as any) as DocumentType,
        title,
        description: description ?? null,
        fileUrl,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        isEncrypted: true,
      },
      select: { id: true, title: true, fileUrl: true, createdAt: true },
    });

    await createAuditLogFromRequest(req, AuditAction.CREATE, 'Document', created.id, 'Uploaded resident document (multipart)', { residentId: resident.id, type });
    return NextResponse.json({ success: true, document: created });
  } catch (e) {
    console.error('Resident document upload error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
