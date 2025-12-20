
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { createSignedGetUrl, parseS3Url } from '@/lib/storage';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, { params }: { params: { id: string; inspectionId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id }, select: { operatorId: true } });
      if (!op || !home || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const insp = await prisma.inspection.findUnique({ where: { id: params.inspectionId }, select: { documentUrl: true } });
    if (!insp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!insp.documentUrl) return NextResponse.json({ error: 'No document on record' }, { status: 404 });
    const s3 = parseS3Url(insp.documentUrl);
    if (!s3) {
      const allowDev = process.env['ALLOW_DEV_ENDPOINTS'] === '1' || process.env['NODE_ENV'] !== 'production';
      if (allowDev && /^https?:\/\//i.test(insp.documentUrl)) {
        return NextResponse.redirect(insp.documentUrl, 302);
      }
      return NextResponse.json({ error: 'Legacy path unsupported' }, { status: 410 });
    }
    const url = await createSignedGetUrl({ bucket: s3.bucket, key: s3.key, expiresIn: 60 });
    return NextResponse.redirect(url, 302);
  } finally {
    await prisma.$disconnect();
  }
}
