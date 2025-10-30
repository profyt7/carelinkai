import { NextRequest, NextResponse } from 'next/server';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { PrismaClient, UserRole } from '@prisma/client';
import { createSignedGetUrl, parseS3Url } from '@/lib/storage';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { id: string; licenseId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id }, select: { operatorId: true } });
      if (!op || !home || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const lic = await prisma.license.findUnique({ where: { id: params.licenseId }, select: { documentUrl: true } });
    if (!lic) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!lic.documentUrl) return NextResponse.json({ error: 'No document on record' }, { status: 404 });
    const s3 = parseS3Url(lic.documentUrl);
    if (!s3) return NextResponse.json({ error: 'Legacy path unsupported' }, { status: 410 });
    const url = await createSignedGetUrl({ bucket: s3.bucket, key: s3.key, expiresIn: 60 });
    return NextResponse.redirect(url, 302);
  } finally {
    await prisma.$disconnect();
  }
}