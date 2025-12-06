import { NextResponse } from 'next/server';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Feature flag aligned with list route
  const providersEnabled = process.env['NEXT_PUBLIC_PROVIDERS_ENABLED'] !== 'false';
  if (!providersEnabled) {
    return NextResponse.json({ error: 'Providers feature disabled' }, { status: 404 });
  }
  const { id } = params;
  try {
    const key = getClientIp(request);
    const limit = 60;
    const rr = await rateLimitAsync({ name: 'providers:id:GET', key, limit, windowMs: 60_000 });
    if (!rr.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': '60' } }
      );
    }

    const p = await prisma.provider.findUnique({
      where: { id },
      select: {
        userId: true,
        id: true,
        name: true,
        bio: true,
        serviceTypes: true,
        coverageCity: true,
        coverageState: true,
        coverageRadius: true,
      },
    });
    if (!p) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    const data = {
      id: p.id,
      userId: p.userId,
      name: p.name ?? 'Provider',
      type: 'TRANSPORTATION',
      city: p.coverageCity ?? '',
      state: p.coverageState ?? '',
      services: p.serviceTypes ?? [],
      description: p.bio ?? '',
      hourlyRate: null,
      perMileRate: null,
      ratingAverage: 0,
      reviewCount: 0,
      badges: [],
      coverageRadius: p.coverageRadius ?? null,
      availableHours: 'N/A',
    };

    return NextResponse.json({ data }, { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60', ...buildRateLimitHeaders(rr, limit) } });
  } catch (e) {
    console.error('GET /api/marketplace/providers/[id] error', e);
    return NextResponse.json({ error: 'Failed to fetch provider' }, { status: 500 });
  }
}

export function POST() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function PATCH() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
