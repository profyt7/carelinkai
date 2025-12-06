import { NextResponse } from 'next/server';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/marketplace/providers
 * DB-backed provider search (visibility-aware)
 */
export async function GET(request: Request) {
  const providersEnabled = process.env['NEXT_PUBLIC_PROVIDERS_ENABLED'] !== 'false';
  if (!providersEnabled) {
    return NextResponse.json(
      { data: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 0, hasMore: false, cursor: null } },
      { status: 200 }
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const key = getClientIp(request);
    const limit = 60;
    const rr = await rateLimitAsync({ name: 'providers:GET', key, limit, windowMs: 60_000 });
    if (!rr.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': '60' } }
      );
    }

    const q = (searchParams.get('q') || '').trim();
    const city = (searchParams.get('city') || '').trim();
    const state = (searchParams.get('state') || '').trim();
    const services = (searchParams.get('services') || '').split(',').filter(Boolean);
    const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
    const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null;
    const radiusMiles = searchParams.get('radiusMiles') ? Number(searchParams.get('radiusMiles')) : null;

    const page = Number.parseInt(searchParams.get('page') || '1', 10) || 1;
    const pageSize = Math.min(Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20, 50);
    const cursor = searchParams.get('cursor');

    const where: any = {
      isVisibleInMarketplace: true,
      AND: [
        q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
          { coverageCity: { contains: q, mode: 'insensitive' } },
          { coverageState: { contains: q, mode: 'insensitive' } },
        ] } : {},
        city ? { coverageCity: { contains: city, mode: 'insensitive' } } : {},
        state ? { coverageState: { contains: state, mode: 'insensitive' } } : {},
        services.length ? { serviceTypes: { hasSome: services } } : {},
      ],
    };

    const useRadius = !!(lat !== null && lng !== null && radiusMiles !== null && isFinite(radiusMiles));

    if (!useRadius) {
      const take = pageSize + 1;
      const rows = await prisma.provider.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          userId: true,
          name: true,
          bio: true,
          serviceTypes: true,
          coverageCity: true,
          coverageState: true,
          coverageRadius: true,
        },
      });
      const total = await prisma.provider.count({ where });
      const data = rows.slice(0, pageSize).map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.name || 'Provider',
        type: 'TRANSPORTATION',
        city: p.coverageCity || '',
        state: p.coverageState || '',
        services: p.serviceTypes || [],
        description: p.bio || '',
        hourlyRate: null,
        perMileRate: null,
        ratingAverage: 0,
        reviewCount: 0,
        badges: [],
        coverageRadius: p.coverageRadius ?? null,
        availableHours: 'N/A',
      }));
      const nextCursor = rows[pageSize]?.id ?? null;
      return NextResponse.json({
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasMore: Boolean(nextCursor),
          cursor: nextCursor,
        },
      }, { status: 200, headers: { ...buildRateLimitHeaders(rr, limit) } });
    }

    // Radius fallback: fetch a baseline set then filter/sort in memory using city coords
    const baseline = await prisma.provider.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        userId: true,
        name: true,
        bio: true,
        serviceTypes: true,
        coverageCity: true,
        coverageState: true,
        coverageRadius: true,
      },
    });

    const enriched = baseline.map((p) => {
      const cityName = p.coverageCity || '';
      const stateName = p.coverageState || '';
      const dist = cityDistanceMiles(lat!, lng!, cityName, stateName);
      return {
        id: p.id,
        userId: p.userId,
        name: p.name || 'Provider',
        type: 'TRANSPORTATION',
        city: cityName,
        state: stateName,
        services: p.serviceTypes || [],
        description: p.bio || '',
        hourlyRate: null,
        perMileRate: null,
        ratingAverage: 0,
        reviewCount: 0,
        badges: [],
        coverageRadius: p.coverageRadius ?? null,
        availableHours: 'N/A',
        distanceMiles: dist,
      } as any;
    }).filter((p) => p.distanceMiles <= (radiusMiles as number))
      .sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));

    const total = enriched.length;
    const startIdx = Math.max((page - 1) * pageSize, 0);
    const pageItems = enriched.slice(startIdx, startIdx + pageSize);
    const hasMore = startIdx + pageSize < total;
    return NextResponse.json({
      data: pageItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore,
        cursor: null,
      },
    }, { status: 200, headers: { ...buildRateLimitHeaders(rr, limit) } });
  } catch (e) {
    console.error('GET /api/marketplace/providers error', e);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

// Approximate city coordinates for Bay Area cities used when radius is applied
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'San Francisco, CA': { lat: 37.7749, lng: -122.4194 },
  'Oakland, CA': { lat: 37.8044, lng: -122.2711 },
  'San Jose, CA': { lat: 37.3382, lng: -121.8863 },
  'Berkeley, CA': { lat: 37.8715, lng: -122.2730 },
  'Palo Alto, CA': { lat: 37.4419, lng: -122.1430 },
  'Mountain View, CA': { lat: 37.3861, lng: -122.0839 },
  'Sunnyvale, CA': { lat: 37.3688, lng: -122.0363 },
  'Santa Clara, CA': { lat: 37.3541, lng: -121.9552 },
  'Fremont, CA': { lat: 37.5483, lng: -121.9886 },
  'Hayward, CA': { lat: 37.6688, lng: -122.0808 },
};

function cityDistanceMiles(fromLat: number, fromLng: number, city: string, state: string) {
  const key = `${city}, ${state}`;
  const coord = CITY_COORDS[key];
  if (!coord) return Number.POSITIVE_INFINITY;
  return haversineMiles(fromLat, fromLng, coord.lat, coord.lng);
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
// Return 405 Method Not Allowed for non-GET requests
export function POST() { return methodNotAllowed(); }
export function PUT() { return methodNotAllowed(); }
export function PATCH() { return methodNotAllowed(); }
export function DELETE() { return methodNotAllowed(); }

function methodNotAllowed() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}
