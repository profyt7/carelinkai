export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { triggerMarketplaceHireFee } from '@/lib/services/marketplace-hire-fee';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; bidId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const shift = await prisma.caregiverShift.findFirst({ where: { id: params.id, home: { operatorId: op.id } } });
  if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 });

  const bid = await prisma.shiftBid.findFirst({ where: { id: params.bidId, shiftId: params.id } });
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

  const body = await req.json();
  const action: string = body.action; // 'accept' | 'decline'

  if (action === 'accept') {
    if (shift.caregiverId) return NextResponse.json({ error: 'Shift already assigned' }, { status: 409 });

    const [updatedShift, newHire] = await prisma.$transaction([
      prisma.caregiverShift.update({
        where: { id: params.id },
        data: { caregiverId: bid.caregiverId, status: 'ASSIGNED' },
      }),
      prisma.marketplaceHire.create({
        data: { caregiverId: bid.caregiverId, shiftId: params.id },
      }),
      prisma.shiftBid.update({ where: { id: params.bidId }, data: { status: 'ACCEPTED' } }),
      // Decline all other pending bids
      prisma.shiftBid.updateMany({
        where: { shiftId: params.id, id: { not: params.bidId }, status: 'PENDING' },
        data: { status: 'DECLINED' },
      }),
    ]);

    // Queue hire fee — non-blocking
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: bid.caregiverId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (caregiver) {
      const name = `${caregiver.user.firstName} ${caregiver.user.lastName}`;
      triggerMarketplaceHireFee(newHire.id, params.id, name).catch(() => {});
    }

    return NextResponse.json({ ok: true, shift: updatedShift });
  }

  if (action === 'decline') {
    await prisma.shiftBid.update({ where: { id: params.bidId }, data: { status: 'DECLINED' } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
}
