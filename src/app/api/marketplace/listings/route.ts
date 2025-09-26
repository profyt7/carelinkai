import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { z, ZodError } from 'zod';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';
import { Prisma } from '@prisma/client';

/**
 * GET /api/marketplace/listings
 * 
 * Fetches marketplace listings with optional filters
 * Supports filtering by: q, city, state, zip, status, setting, careTypes, services, specialties, postedByMe
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    // Rate limit: 60 req/min per user or IP
    {
      const key = session?.user?.id || getClientIp(request);
      const limit = 60;
      const rr = await rateLimitAsync({ name: 'listings:GET', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
      // attach headers on success responses below
      var __rl_listings_get = { rr, limit };
    }
    
    // Extract filter parameters
    const q = searchParams.get('q');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const zip = searchParams.get('zip');
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
    const radiusMiles = searchParams.get('radiusMiles') ? parseFloat(searchParams.get('radiusMiles')!) : null;
    const status = searchParams.get('status');
    const setting = searchParams.get('setting');
    const settings = searchParams.get('settings')?.split(',').filter(Boolean);
    const careTypes = searchParams.get('careTypes')?.split(',').filter(Boolean);
    const services = searchParams.get('services')?.split(',').filter(Boolean);
    const specialties = searchParams.get('specialties')?.split(',').filter(Boolean);
    const postedByMe = searchParams.get('postedByMe') === 'true';
    
    // Pagination and sorting
    const pageRaw = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSizeRaw = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;
    const PageSchema = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20) });
    const { page, pageSize } = PageSchema.safeParse({ page: pageRaw, pageSize: pageSizeRaw }).success
      ? (PageSchema.parse({ page: pageRaw, pageSize: pageSizeRaw }))
      : { page: Math.max(1, pageRaw || 1), pageSize: Math.min(100, Math.max(1, pageSizeRaw || 20)) };
    const sortBy = searchParams.get('sortBy') || 'recency'; // recency (default), rateAsc, rateDesc, distanceAsc (when using radius)
    const skip = (page - 1) * pageSize;

    // Build where clause for filtering
    const where: any = {};
    
    // Text search in title or description
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    // Location filters
    if (city) where.city = { equals: city, mode: 'insensitive' };
    if (state) where.state = { equals: state, mode: 'insensitive' };
    if (zip) where.zipCode = zip;
    
    // Status filter
    if (status) where.status = status;
    
    // Setting filter (supports legacy single 'setting' and new multi 'settings')
    if (settings && settings.length > 0) {
      where.setting = { in: settings };
    } else if (setting) {
      where.setting = setting;
    }
    
    // Array filters
    if (careTypes && careTypes.length > 0) {
      where.careTypes = { hasSome: careTypes };
    }
    
    if (services && services.length > 0) {
      where.services = { hasSome: services };
    }
    
    if (specialties && specialties.length > 0) {
      where.specialties = { hasSome: specialties };
    }
    
    // Filter by current user if postedByMe is true
    if (postedByMe && session?.user?.id) {
      where.postedByUserId = session.user.id;
    }
    
    // If radius filter is provided and we have lat/lng, perform in-memory distance filtering
    const useRadius = !!(lat !== null && lng !== null && radiusMiles !== null && !Number.isNaN(radiusMiles));
    let listings: any[] = [];
    let totalCount = 0;
    if (useRadius) {
      // fetch a larger candidate set; limit to 500 to keep perf reasonable
      const candidates = await (prisma as any).marketplaceListing.findMany({
        where,
        include: {
          _count: { select: { applications: true, hires: true } }
        },
        take: 500
      });
      // compute distance and filter
      const withDistance = candidates.map((l: any) => ({
        ...l,
        distanceMiles: (l.latitude != null && l.longitude != null) ? haversineMiles(lat!, lng!, Number(l.latitude), Number(l.longitude)) : Infinity
      }));
      let filtered = withDistance.filter((l: any) => l.distanceMiles <= (radiusMiles as number));
      // sort
      if (sortBy === 'distanceAsc') filtered.sort((a: any, b: any) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
      else if (sortBy === 'rateAsc') filtered.sort((a: any, b: any) => (a.hourlyRateMin ?? 0) - (b.hourlyRateMin ?? 0));
      else if (sortBy === 'rateDesc') filtered.sort((a: any, b: any) => (b.hourlyRateMax ?? 0) - (a.hourlyRateMax ?? 0));
      else filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      totalCount = filtered.length;
      // paginate
      listings = filtered.slice(skip, skip + pageSize);
    } else {
      // Default DB-side pagination/sort
      const result = await Promise.all([
        (prisma as any).marketplaceListing.findMany({
          where,
          orderBy:
            sortBy === 'rateAsc' ? { hourlyRateMin: 'asc' } :
            sortBy === 'rateDesc' ? { hourlyRateMax: 'desc' } :
            { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                applications: true,
                hires: true
              }
            }
          },
          skip,
          take: pageSize
        }),
        (prisma as any).marketplaceListing.count({ where })
      ]);
      listings = result[0] as any[];
      totalCount = result[1] as number;
    }

    // If caregiver is logged in, annotate whether they have applied to each returned listing
    let appliedSet: Set<string> | null = null;
    try {
      if (session?.user?.id) {
        const caregiver = await (prisma as any).caregiver.findUnique({ where: { userId: session.user.id } });
        if (caregiver && listings.length > 0) {
          const apps = await (prisma as any).marketplaceApplication.findMany({
            where: { caregiverId: caregiver.id, listingId: { in: listings.map((l: any) => l.id) } },
            select: { listingId: true }
          });
          appliedSet = new Set(apps.map((a: any) => a.listingId));
        }
      }
    } catch {
      appliedSet = null;
    }
    
    // Transform the data to include counts directly
    const formattedListings = listings.map((listing: any) => {
      const { _count, ...listingData } = listing;
      return {
        ...listingData,
        applicationCount: _count.applications,
        hireCount: _count.hires,
        ...(useRadius ? { distanceMiles: listing.distanceMiles } : {}),
        ...(appliedSet ? { appliedByMe: appliedSet.has(listing.id) } : {})
      };
    });
    
    /* ------------------------------------------------------------------
       Dev-mode fallback: return mock jobs when DB is empty
    ------------------------------------------------------------------*/
    if (
      formattedListings.length === 0 &&
      process.env.NODE_ENV !== 'production'
    ) {
      const mockJobs = generateMockListings(12);
      return NextResponse.json(
        { data: mockJobs, pagination: { page, pageSize, total: mockJobs.length } },
        { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60' } }
      );
    }

    return NextResponse.json(
      { data: formattedListings, pagination: { page, pageSize, total: totalCount } },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60', ...(typeof __rl_listings_get !== 'undefined' ? buildRateLimitHeaders(__rl_listings_get.rr, __rl_listings_get.limit) : {}) } }
    );
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace listings' },
      { status: 500 }
    );
  }
}

// Haversine distance in miles between two lat/lng pairs
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * POST /api/marketplace/listings
 * 
 * Creates a new marketplace listing
 * Requires authentication
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Rate limit: 30 req/min per user (or IP if unauthenticated)
    {
      const key = session?.user?.id || getClientIp(request);
      const limit = 30;
      const rr = await rateLimitAsync({ name: 'listings:POST', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
      var __rl_listings_post = { rr, limit };
    }

    // ------------------ Validation ------------------
    const ListingSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().min(1, 'Description is required'),
      hourlyRateMin: z.coerce.number().positive().optional(),
      hourlyRateMax: z.coerce.number().positive().optional(),
      setting: z.string().optional(),
      careTypes: z.array(z.string()).optional(),
      services: z.array(z.string()).optional(),
      specialties: z.array(z.string()).optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      latitude: z.coerce.number().optional(),
      longitude: z.coerce.number().optional(),
      startTime: z.coerce.date().optional(),
      endTime: z.coerce.date().optional(),
    });

    const body = ListingSchema.parse(await request.json());

    // Create listing
    const listing = await (prisma as any).marketplaceListing.create({
      data: {
        title: body.title,
        description: body.description,
        hourlyRateMin: body.hourlyRateMin ?? null,
        hourlyRateMax: body.hourlyRateMax ?? null,
        setting: body.setting,
        careTypes: body.careTypes || [],
        services: body.services || [],
        specialties: body.specialties || [],
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        status: 'OPEN',
        postedByUserId: session.user.id
      }
    });
    
    return NextResponse.json(
      { data: listing },
      { status: 201, headers: typeof __rl_listings_post !== 'undefined' ? buildRateLimitHeaders(__rl_listings_post.rr, __rl_listings_post.limit) : {} }
    );
  } catch (error: any) {
    // Validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    // Prisma known errors (e.g., field too long, FK fail)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error creating listing:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error('Error creating marketplace listing:', error);
    return NextResponse.json(
      { error: 'Failed to create marketplace listing' },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------------------
   Development helper – generate mock job listings when DB is empty
------------------------------------------------------------------------*/
function generateMockListings(count: number = 12) {
  const titles = [
    'Evening caregiver for mom',
    'Weekend companion needed',
    'Overnight dementia care',
    'Post-surgery recovery assistance',
    'Medication & housekeeping help',
    'Errands and transport support',
  ];

  const descriptions = [
    'Looking for a compassionate caregiver to assist with ADLs and companionship.',
    'Seeking experienced caregiver with memory-care background; reliable and patient.',
    'Need help with medication reminders, mobility assistance, and light housekeeping.',
    'Support with bathing, dressing, meals, and transportation to appointments.',
  ];

  const cities = [
    'San Francisco',
    'Oakland',
    'San Jose',
    'Berkeley',
    'Palo Alto',
    'Sunnyvale',
  ];

  const states = ['CA'];

  const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  return Array.from({ length: count }).map((_, idx) => {
    const hourlyMin = 20 + Math.floor(Math.random() * 10); // 20-29
    const hourlyMax = hourlyMin + 5 + Math.floor(Math.random() * 10); // +5-+14

    return {
      id: `mock-listing-${idx + 1}`,
      title: rand(titles),
      description: rand(descriptions),
      city: rand(cities),
      state: rand(states),
      hourlyRateMin: hourlyMin,
      hourlyRateMax: hourlyMax,
      createdAt: new Date(Date.now() - idx * 86_400_000).toISOString(), // staggered days
    };
  });
}

/**
 * Return 405 Method Not Allowed for non-GET/POST requests
 */
export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

/**
 * Helper function to return 405 Method Not Allowed
 */
function methodNotAllowed() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    {
      status: 405,
      headers: {
        Allow: 'GET, POST',
      },
    }
  );
}
