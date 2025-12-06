import { NextResponse } from 'next/server';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

    const db: any = prisma as any;
    const p = await db.provider.findFirst({
      where: { id, isVisibleInMarketplace: true, isVerified: true },
      select: {
        id: true,
        userId: true,
        name: true,
        bio: true,
        logoUrl: true,
        serviceTypes: true,
        coverageCity: true,
        coverageState: true,
        coverageRadius: true,
        createdAt: true,
      },
    });
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = {
      id: p.id,
      userId: p.userId,
      name: p.name ?? '',
      city: p.coverageCity ?? '',
      state: p.coverageState ?? '',
      services: (p.serviceTypes as string[]) ?? [],
      description: p.bio ?? '',
      coverageRadius: p.coverageRadius ?? null,
      logoUrl: p.logoUrl ?? null,
    };

    return NextResponse.json({ data }, { status: 200, headers: { 'Cache-Control': 'no-store', ...buildRateLimitHeaders(rr, limit) } });
  } catch (e) {
    console.error('GET /api/marketplace/providers/[id] error', e);
    return NextResponse.json({ error: 'Failed to fetch provider' }, { status: 500 });
  }
}

export function POST() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function PATCH() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
