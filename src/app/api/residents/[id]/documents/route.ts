import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resident = await prisma.resident.findUnique({ where: { id: params.id }, select: { id: true, home: { select: { operatorId: true } } } });
    if (!resident) return NextResponse.json({ items: [] });
    if (user.role === UserRole.OPERATOR) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op || (resident.home && resident.home.operatorId !== op.id)) {
        return NextResponse.json({ items: [] });
      }
    }

    const items = await prisma.document.findMany({
      where: { residentId: resident.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, fileUrl: true, fileType: true, fileSize: true, createdAt: true },
      take: 100,
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('Resident documents list error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
