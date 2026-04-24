export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/billing/bookings
 * Returns the authenticated family's bookings with home info and payment history.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const family = await prisma.family.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!family) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: { familyId: family.id },
    include: {
      home: { select: { id: true, name: true } },
      payments: {
        where: { type: { in: ['DEPOSIT', 'MONTHLY_FEE'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, amount: true, type: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ bookings });
}
