import { NextRequest, NextResponse } from 'next/server';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { PrismaClient, UserRole } from '@prisma/client';
import { uploadBuffer, toS3Url, deleteObject as s3Delete, parseS3Url } from '@/lib/storage';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id } });
    if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await req.formData();
    const type = String(form.get('type') || 'General');
    const licenseNumber = String(form.get('licenseNumber') || '').trim();
    const issueDate = new Date(String(form.get('issueDate') || ''));
    const expirationDate = new Date(String(form.get('expirationDate') || ''));
    const status = String(form.get('status') || 'ACTIVE');
    const file = form.get('file') as unknown as File | null;
    if (!licenseNumber || isNaN(issueDate.getTime()) || isNaN(expirationDate.getTime())) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    let documentUrl: string | undefined;
    if (file && file.size > 0) {
      const buff = Buffer.from(await file.arrayBuffer());
      const safeName = (file.name || 'license').replace(/[^a-z0-9_.-]+/gi, '_').toLowerCase();
      const key = `homes/${home.id}/licenses/${Date.now()}-${safeName}`;
      const useMock = process.env['ALLOW_DEV_ENDPOINTS'] === '1' || process.env['NODE_ENV'] !== 'production';
      if (useMock) {
        // Skip real S3 in dev/e2e; store a mock URL that download route will redirect to
        documentUrl = `https://example.com/mock-operator/${home.id}/licenses/${key}`;
      } else {
        await uploadBuffer({ key, body: buff, contentType: file.type || 'application/octet-stream', metadata: { homeId: home.id, kind: 'license' } });
        documentUrl = toS3Url(process.env['S3_BUCKET'] as string, key);
      }
    }

    const created = await prisma.license.create({
      data: {
        homeId: home.id,
        type,
        licenseNumber,
        issueDate,
        expirationDate,
        status,
        documentUrl,
      },
    });

    return NextResponse.json({ success: true, licenseId: created.id });
  } catch (e) {
    console.error('Create license failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
