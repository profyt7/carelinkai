import { NextRequest, NextResponse } from 'next/server';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { PrismaClient, UserRole } from '@prisma/client';
import { uploadBuffer, toS3Url } from '@/lib/storage';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
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
    const inspectionType = String(form.get('inspectionType') || 'Routine');
    const inspector = String(form.get('inspector') || '').trim();
    const result = String(form.get('result') || 'PASSED');
    const inspectionDate = new Date(String(form.get('inspectionDate') || ''));
    const findings = (form.get('findings') as string) || undefined;
    const file = form.get('file') as unknown as File | null;
    if (!inspector || isNaN(inspectionDate.getTime())) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    let documentUrl: string | undefined;
    if (file && file.size > 0) {
      const buff = Buffer.from(await file.arrayBuffer());
      const safeName = (file.name || 'inspection').replace(/[^a-z0-9_.-]+/gi, '_').toLowerCase();
      const key = `homes/${home.id}/inspections/${Date.now()}-${safeName}`;
      const useMock = req.headers.has('x-e2e-bypass') || process.env['ALLOW_DEV_ENDPOINTS'] === '1' || process.env['NODE_ENV'] !== 'production';
      if (useMock) {
        documentUrl = `https://example.com/mock-operator/${home.id}/inspections/${key}`;
      } else {
        await uploadBuffer({ key, body: buff, contentType: file.type || 'application/pdf', metadata: { homeId: home.id, kind: 'inspection' } });
        documentUrl = toS3Url(process.env['S3_BUCKET'] as string, key);
      }
    }

    const created = await prisma.inspection.create({
      data: {
        homeId: home.id,
        inspectionType,
        inspector,
        result,
        inspectionDate,
        findings,
        documentUrl,
      },
    });

    return NextResponse.json({ success: true, inspectionId: created.id });
  } catch (e) {
    console.error('Create inspection failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}