export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const need = await prisma.shiftNeed.findFirst({ where: { id: params.id, home: { operatorId: op.id } } });
  if (!need) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.shiftNeed.update({ where: { id: params.id }, data: { status: 'CANCELED' } });
  return NextResponse.json({ ok: true });
}
