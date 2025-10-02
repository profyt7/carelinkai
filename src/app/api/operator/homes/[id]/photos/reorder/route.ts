import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id } });
    if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { order } = await req.json().catch(() => ({}));
    if (!Array.isArray(order) || order.some((id: any) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
    }

    // Apply sortOrder in given sequence
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      await prisma.homePhoto.updateMany({ where: { id, homeId: home.id }, data: { sortOrder: i } });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Reorder home photos failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
