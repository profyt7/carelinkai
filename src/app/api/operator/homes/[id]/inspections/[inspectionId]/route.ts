import { NextRequest, NextResponse } from 'next/server';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { PrismaClient, UserRole } from '@prisma/client';
import { deleteObject as s3Delete, parseS3Url } from '@/lib/storage';

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest, { params }: { params: { id: string; inspectionId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id }, select: { operatorId: true } });
      if (!op || !home || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const insp = await prisma.inspection.findUnique({ where: { id: params.inspectionId } });
    if (!insp || insp.homeId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (insp.documentUrl) {
      const s3 = parseS3Url(insp.documentUrl);
      if (s3) await s3Delete({ bucket: s3.bucket, key: s3.key });
    }
    await prisma.inspection.delete({ where: { id: params.inspectionId } });
    return NextResponse.json({ success: true });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string; inspectionId: string } }) {
  return DELETE(req, ctx);
}
