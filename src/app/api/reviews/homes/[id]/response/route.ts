export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const responseSchema = z.object({
  response: z.string().trim().min(1, 'Response cannot be empty').max(2000),
});

/**
 * POST /api/reviews/homes/[id]/response
 *
 * Operator public reply to a review on their OWN (claimed) home. The session
 * user must be the operator that owns the reviewed home. Idempotent upsert of
 * the reply text; stamps operatorRespondedAt.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = responseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const review = await prisma.homeReview.findUnique({
      where: { id: params.id },
      select: { id: true, home: { select: { operatorId: true } } },
    });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Only the operator who owns the (claimed) home may respond.
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!operator || operator.id !== review.home.operatorId) {
      return NextResponse.json(
        { error: 'Only the operator who owns this listing can respond to its reviews.' },
        { status: 403 },
      );
    }

    const updated = await prisma.homeReview.update({
      where: { id: params.id },
      data: { operatorResponse: parsed.data.response, operatorRespondedAt: new Date() },
      select: { id: true, operatorResponse: true, operatorRespondedAt: true },
    });

    return NextResponse.json({ success: true, review: updated });
  } catch (error) {
    console.error('Error saving operator review response:', error);
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/homes/[id]/response — operator removes their reply.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const review = await prisma.homeReview.findUnique({
      where: { id: params.id },
      select: { id: true, home: { select: { operatorId: true } } },
    });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!operator || operator.id !== review.home.operatorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await prisma.homeReview.update({
      where: { id: params.id },
      data: { operatorResponse: null, operatorRespondedAt: null },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting operator review response:', error);
    return NextResponse.json({ error: 'Failed to delete response' }, { status: 500 });
  }
}
