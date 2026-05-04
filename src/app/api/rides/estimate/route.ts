export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { estimateMiles, calculateFare } from '@/lib/distance';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/rides/estimate
 * Returns estimated miles + fare breakdown for a given trip.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { pickup, dropoff, providerId, waitMinutes = 0 } = body;

  if (!pickup || !dropoff || !providerId) {
    return NextResponse.json({ error: 'pickup, dropoff, and providerId required' }, { status: 400 });
  }

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { rateBaseFare: true, ratePerMile: true, rateWaitPerHour: true, instantBook: true },
  });

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const miles = await estimateMiles(pickup, dropoff);

  if (
    !provider.rateBaseFare ||
    !provider.ratePerMile ||
    !provider.rateWaitPerHour
  ) {
    return NextResponse.json({
      miles,
      instantBook: false,
      message: 'Provider has not set pricing. Fare will be confirmed after booking.',
    });
  }

  if (miles === null) {
    return NextResponse.json({
      miles: null,
      instantBook: provider.instantBook,
      message: 'Could not estimate distance. Fare will be calculated by provider.',
    });
  }

  const fare = calculateFare({
    rateBaseFare: Number(provider.rateBaseFare),
    ratePerMile: Number(provider.ratePerMile),
    rateWaitPerHour: Number(provider.rateWaitPerHour),
    miles,
    waitMinutes: Number(waitMinutes),
  });

  return NextResponse.json({ miles, fare, instantBook: provider.instantBook });
}
