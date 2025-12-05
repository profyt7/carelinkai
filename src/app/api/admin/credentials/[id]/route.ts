export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAnyRole(['ADMIN' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing credential id' }, { status: 400 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const isVerified = typeof body?.isVerified === 'boolean' ? body.isVerified : null;
  if (isVerified === null) {
    return NextResponse.json({ error: 'isVerified boolean is required' }, { status: 400 });
  }

  const exists = await prisma.credential.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });

  const updated = await prisma.credential.update({
    where: { id },
    data: isVerified
      ? { isVerified: true, verifiedBy: session.user.id, verifiedAt: new Date() }
      : { isVerified: false, verifiedBy: null, verifiedAt: null },
    select: {
      id: true,
      caregiverId: true,
      type: true,
      isVerified: true,
      verifiedBy: true,
      verifiedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, credential: updated });
}
