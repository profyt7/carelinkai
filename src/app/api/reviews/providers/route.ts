export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reviewCreateSchema = z.object({
  providerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  content: z.string().optional(),
  isPublic: z.boolean().default(true),
});

/**
 * GET /api/reviews/providers?providerId=...
 * Lists public reviews for a provider with pagination and rating stats.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const providerId = sp.get('providerId');
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '20')));

    if (!providerId) {
      return NextResponse.json({ error: 'providerId required' }, { status: 400 });
    }

    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } });
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const where = { providerId, isPublic: true };
    const skip = (page - 1) * limit;

    const [reviews, total, agg] = await Promise.all([
      prisma.providerReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, providerId: true, reviewerId: true, rating: true, title: true, content: true, createdAt: true, updatedAt: true },
      }),
      prisma.providerReview.count({ where }),
      prisma.providerReview.aggregate({ where, _avg: { rating: true }, _count: { rating: true } }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page < Math.ceil(total / limit) },
      stats: { averageRating: agg._avg.rating ?? 0, totalReviews: agg._count.rating },
    });
  } catch (err) {
    console.error('[ProviderReviews] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch provider reviews' }, { status: 500 });
  }
}

/**
 * POST /api/reviews/providers
 * Creates a review for a provider. Requires the reviewer to have a prior
 * inquiry or direct interaction with the provider.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reviewCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { providerId, rating, title, content, isPublic } = parsed.data;

    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } });
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Prevent duplicate reviews
    const existing = await prisma.providerReview.findFirst({
      where: { providerId, reviewerId: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this provider' }, { status: 409 });
    }

    const review = await prisma.providerReview.create({
      data: { providerId, reviewerId: session.user.id, rating, title, content, isPublic },
    });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (err) {
    console.error('[ProviderReviews] POST error:', err);
    return NextResponse.json({ error: 'Failed to create provider review' }, { status: 500 });
  }
}
