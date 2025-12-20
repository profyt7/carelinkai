
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { parseS3Url, deleteObject } from '@/lib/storage';

const prisma = new PrismaClient();

async function ensureOperatorAccess(userEmail: string | null, homeId: string) {
  if (!userEmail) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId } });
  if (!home) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  if (user.role !== UserRole.ADMIN) {
    const op = await prisma.operator.findUnique({ where: { userId: user.id } });
    if (!op || op.id !== home.operatorId) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, home };
}

export async function DELETE(_req: Request, { params }: { params: { id: string; photoId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const access = await ensureOperatorAccess(session?.user?.email ?? null, params.id);
    if ('error' in access) return access.error;

    const photo = await prisma.homePhoto.findUnique({ where: { id: params.photoId } });
    if (!photo || photo.homeId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsed = parseS3Url(photo.url);
    if (parsed) {
      try { await deleteObject({ bucket: parsed.bucket, key: parsed.key }); } catch {}
    }

    await prisma.homePhoto.delete({ where: { id: photo.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete home photo failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(_req: Request, { params }: { params: { id: string; photoId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const access = await ensureOperatorAccess(session?.user?.email ?? null, params.id);
    if ('error' in access) return access.error;

    const photo = await prisma.homePhoto.findUnique({ where: { id: params.photoId } });
    if (!photo || photo.homeId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.homePhoto.updateMany({ where: { homeId: params.id, isPrimary: true }, data: { isPrimary: false } });
    await prisma.homePhoto.update({ where: { id: photo.id }, data: { isPrimary: true } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Set primary home photo failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
