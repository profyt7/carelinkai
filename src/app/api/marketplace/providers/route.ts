import { NextResponse } from 'next/server';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function toInt(v: string | null, def: number): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

export async function GET(request: Request) {
  const providersEnabled = process.env['NEXT_PUBLIC_PROVIDERS_ENABLED'] !== 'false';
  if (!providersEnabled) {
    return NextResponse.json(
      { data: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 0, hasMore: false, cursor: null } },
      { status: 200 }
    );
  }

  const url = new URL(request.url);
  // Rate limit: 60 req/min per IP
  const key = getClientIp(request);
  const limit = 60;
  const rr = await rateLimitAsync({ name: 'providers:GET', key, limit, windowMs: 60_000 });
  if (!rr.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
    );
  }

  const q = (url.searchParams.get('q') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();
  const state = (url.searchParams.get('state') || '').trim();
  const services = (url.searchParams.get('services') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const radiusMiles = url.searchParams.get('radiusMiles');

  const page = toInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);

  const where: any = {
    AND: [
      { isVisibleInMarketplace: true },
      { isVerified: true },
      q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { bio: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      city ? { coverageCity: { equals: city, mode: 'insensitive' } } : {},
      state ? { coverageState: { equals: state, mode: 'insensitive' } } : {},
      services.length
        ? {
            serviceTypes: { hasSome: services },
          }
        : {},
    ],
  };

  // Execute queries
  const db: any = prisma as any;
  const [total, items] = await Promise.all([
    db.provider.count({ where }),
    db.provider.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Optional radius filter heuristic (approximate by matching same city/state list)
  // Since Provider lacks lat/lng, we only support radius filter if city/state + known coordinate set exist.
  // For now, no-op unless both lat/lng/radius provided AND we can later enrich with geocoding.

  return NextResponse.json(
    {
      data: (items as any[]).map((p: any) => ({
        id: p.id,
        userId: p.userId,
        name: p.name ?? '',
        bio: p.bio ?? '',
        logoUrl: p.logoUrl ?? null,
        serviceTypes: p.serviceTypes ?? [],
        city: p.coverageCity ?? '',
        state: p.coverageState ?? '',
        coverageRadius: p.coverageRadius ?? null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
        cursor: null,
      },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store', ...buildRateLimitHeaders(rr, limit) } }
  );
}

export function POST() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function PATCH() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
