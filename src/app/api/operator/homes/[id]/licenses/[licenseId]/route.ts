import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { deleteObject as s3Delete, parseS3Url } from '@/lib/storage';

const prisma = new PrismaClient();

async function ensureAuthAndOwnership(request: NextRequest, homeId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { status: 401 as const, user: null };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) return { status: 403 as const, user: null };
  if (user.role === UserRole.ADMIN) return { status: 200 as const, user };
  const op = await prisma.operator.findUnique({ where: { userId: user.id } });
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, select: { operatorId: true } });
  if (!op || !home || op.id !== home.operatorId) return { status: 403 as const, user: null };
  return { status: 200 as const, user };
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; licenseId: string } }) {
  try {
    const { status } = await ensureAuthAndOwnership(_req, params.id);
    if (status !== 200) return NextResponse.json({ error: 'Forbidden' }, { status });

    const lic = await prisma.license.findUnique({ where: { id: params.licenseId } });
    if (!lic || lic.homeId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (lic.documentUrl) {
      const s3 = parseS3Url(lic.documentUrl);
      if (s3) await s3Delete({ bucket: s3.bucket, key: s3.key });
    }
    await prisma.license.delete({ where: { id: params.licenseId } });
    return NextResponse.json({ success: true });
  } finally {
    await prisma.$disconnect();
  }
}

// Support HTML form POST for delete (since forms don't support method=DELETE)
export async function POST(req: NextRequest, ctx: { params: { id: string; licenseId: string } }) {
  return DELETE(req, ctx);
}
