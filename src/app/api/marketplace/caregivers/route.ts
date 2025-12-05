import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';

/**
 * GET /api/marketplace/caregivers
 * 
 * Fetches caregivers with optional filters
 * Supports filtering by: q, city, state, minRate, maxRate, minExperience, specialties
 * Supports pagination with page and pageSize parameters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Rate limit: 60 req/min per IP
    {
      const key = getClientIp(request);
      const limit = 60;
      const rr = await rateLimitAsync({ name: 'caregivers:GET', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
      var __rl_caregivers_get = { rr, limit };
    }
    
    // Extract filter parameters
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : null;
    const q = searchParams.get('q');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const minRate = searchParams.get('minRate') ? parseFloat(searchParams.get('minRate')!) : null;
    const maxRate = searchParams.get('maxRate') ? parseFloat(searchParams.get('maxRate')!) : null;
    const minExperience = searchParams.get('minExperience') ? parseInt(searchParams.get('minExperience')!, 10) : null;
    const specialties = searchParams.get('specialties')?.split(',').filter(Boolean);
    const settings = searchParams.get('settings')?.split(',').filter(Boolean);
    const careTypes = searchParams.get('careTypes')?.split(',').filter(Boolean);
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
    const radiusMiles = searchParams.get('radiusMiles') ? parseFloat(searchParams.get('radiusMiles')!) : null;
    
    // Availability filters
    const availableDate = searchParams.get('availableDate'); // ISO date string
    const availableStartTime = searchParams.get('availableStartTime'); // HH:MM format
    const availableEndTime = searchParams.get('availableEndTime'); // HH:MM format
    
    // Pagination parameters (supports cursor or page)
    const cursor = searchParams.get('cursor');
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;
    
    // Sorting parameter: recency (default), rateAsc, rateDesc, experienceDesc, distanceAsc (when using radius)
    const sortBy = searchParams.get('sortBy') || 'recency';
    const skip = (page - 1) * pageSize;
    
    // If explicit IDs are provided, short-circuit to fetch those caregivers only
    if (ids && ids.length > 0) {
      const caregivers = await prisma.caregiver.findMany({
        where: { id: { in: ids } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
              addresses: true,
            },
          },
        },
      });

      // rating aggregates
      const reviewAgg = await prisma.caregiverReview.groupBy({
        by: ['caregiverId'],
        where: { caregiverId: { in: caregivers.map((c) => c.id) } },
        _avg: { rating: true },
        _count: { _all: true },
      });
      const reviewMap = new Map(
        reviewAgg.map((r) => [
          r.caregiverId,
          {
            avg: r._avg.rating ?? 0,
            count: r._count._all,
          },
        ])
      );

      const deriveBadges = (avg: number, count: number, yearsExp: number | null, bgStatus: string) => {
        const badges: string[] = [];
        if (bgStatus === 'CLEAR') badges.push('Background Check Clear');
        if (yearsExp !== null && yearsExp >= 5) badges.push('Experienced');
        if (count >= 5 && avg >= 4.5) badges.push('Top Rated');
        return badges;
      };

      const formattedCaregivers = caregivers.map((caregiver: any) => {
        const address = caregiver.user.addresses && caregiver.user.addresses.length > 0 ? caregiver.user.addresses[0] : null;
        let photoUrl = null as string | null;
        if (caregiver.user.profileImageUrl) {
          if (typeof caregiver.user.profileImageUrl === 'string') photoUrl = caregiver.user.profileImageUrl;
          else if ((caregiver.user.profileImageUrl as any).medium) photoUrl = (caregiver.user.profileImageUrl as any).medium;
          else if ((caregiver.user.profileImageUrl as any).thumbnail) photoUrl = (caregiver.user.profileImageUrl as any).thumbnail;
          else if ((caregiver.user.profileImageUrl as any).large) photoUrl = (caregiver.user.profileImageUrl as any).large;
        }
        const ratingInfo = reviewMap.get(caregiver.id) ?? { avg: 0, count: 0 };
        return {
          id: caregiver.id,
          userId: caregiver.user.id,
          name: `${caregiver.user.firstName} ${caregiver.user.lastName}`,
          city: address?.city || null,
          state: address?.state || null,
          hourlyRate: caregiver.hourlyRate ? parseFloat(caregiver.hourlyRate.toString()) : null,
          yearsExperience: caregiver.yearsExperience,
          specialties: caregiver.specialties || [],
          bio: caregiver.bio || null,
          backgroundCheckStatus: caregiver.backgroundCheckStatus,
          photoUrl,
          ratingAverage: Number((ratingInfo.avg ?? 0).toFixed(1)) || 0,
          reviewCount: ratingInfo.count,
          badges: deriveBadges(ratingInfo.avg ?? 0, ratingInfo.count, caregiver.yearsExperience, caregiver.backgroundCheckStatus),
        };
      });

      return NextResponse.json(
        {
          data: formattedCaregivers,
          pagination: { page: 1, pageSize: formattedCaregivers.length, total: formattedCaregivers.length },
        },
        { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60', ...(typeof __rl_caregivers_get !== 'undefined' ? buildRateLimitHeaders(__rl_caregivers_get.rr, __rl_caregivers_get.limit) : {}) } }
      );
    }

    // Build where clause for filtering
    const where: any = { isVisibleInMarketplace: true };
    
    // Text search in bio or name
    if (q) {
      where.OR = [
        { bio: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } }
      ];
    }
    
    // Location filters using address relation
    if (city || state) {
      where.user = {
        addresses: {
          some: {
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(state && { state: { contains: state, mode: 'insensitive' } })
          }
        }
      };
    }
    
    // Rate range filter
    if (minRate !== null) {
      where.hourlyRate = {
        ...where.hourlyRate,
        gte: new Prisma.Decimal(minRate)
      };
    }
    
    if (maxRate !== null) {
      where.hourlyRate = {
        ...where.hourlyRate,
        lte: new Prisma.Decimal(maxRate)
      };
    }
    
    // Experience filter
    if (minExperience !== null) {
      where.yearsExperience = {
        gte: minExperience
      };
    }
    
    // Specialties filter
    if (specialties && specialties.length > 0) {
      where.specialties = {
        hasSome: specialties
      };
    }

    // Settings filter
    if (settings && settings.length > 0) {
      where.settings = {
        hasSome: settings
      };
    }

    // Care types filter
    if (careTypes && careTypes.length > 0) {
      where.careTypes = {
        hasSome: careTypes
      };
    }
    
    // Availability filtering
    // If availability filters are provided, we need to find caregivers who have availability slots matching the criteria
    let availableCaregiverIds: string[] | null = null;
    if (availableDate && availableStartTime && availableEndTime) {
      try {
        // Parse the date and time filters
        const targetDate = new Date(availableDate);
        const [startHour, startMin] = availableStartTime.split(':').map(Number);
        const [endHour, endMin] = availableEndTime.split(':').map(Number);
        
        // Create datetime objects for the requested time range
        const requestedStart = new Date(targetDate);
        requestedStart.setHours(startHour ?? 0, startMin ?? 0, 0, 0);
        
        const requestedEnd = new Date(targetDate);
        requestedEnd.setHours(endHour ?? 0, endMin ?? 0, 0, 0);
        
        // Find availability slots that overlap with the requested time
        const availableSlots = await prisma.availabilitySlot.findMany({
          where: {
            isAvailable: true,
            startTime: { lte: requestedEnd },
            endTime: { gte: requestedStart },
          },
          select: {
            userId: true,
          },
        });
        
        // Get unique user IDs
        const userIds = [...new Set(availableSlots.map(slot => slot.userId))];
        
        // Find caregiver IDs for these users
        const caregiversWithAvailability = await prisma.caregiver.findMany({
          where: {
            userId: { in: userIds },
          },
          select: {
            id: true,
          },
        });
        
        availableCaregiverIds = caregiversWithAvailability.map(cg => cg.id);
        
        // If no caregivers match availability, add a condition that will return no results
        if (availableCaregiverIds.length === 0) {
          where.id = { in: [] }; // No results
        } else {
          // Add to where clause
          where.id = { in: availableCaregiverIds };
        }
      } catch (error) {
        console.error('Error filtering by availability:', error);
        // Continue without availability filtering if there's an error
      }
    }
    
    // Radius filtering support
    const useRadius = !!(lat !== null && lng !== null && radiusMiles !== null && !Number.isNaN(radiusMiles));
    let caregivers: any[] = [];
    let totalCount = 0;
    if (useRadius) {
      // Pull a larger candidate set; include addresses for lat/lng
      const candidates = await prisma.caregiver.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
              addresses: true
            }
          }
        },
        take: 500
      });
      const withDistance = candidates.map((c: any) => {
        const addr = c.user?.addresses?.[0];
        const distance = (addr?.latitude != null && addr?.longitude != null)
          ? haversineMiles(lat!, lng!, Number(addr.latitude), Number(addr.longitude))
          : Infinity;
        return { ...c, distanceMiles: distance };
      });
      let filtered = withDistance.filter((c: any) => c.distanceMiles <= (radiusMiles as number));
      if (sortBy === 'distanceAsc') filtered.sort((a: any, b: any) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
      else if (sortBy === 'rateAsc') filtered.sort((a: any, b: any) => (Number(a.hourlyRate ?? 0) - Number(b.hourlyRate ?? 0)));
      else if (sortBy === 'rateDesc') filtered.sort((a: any, b: any) => (Number(b.hourlyRate ?? 0) - Number(a.hourlyRate ?? 0)));
      else if (sortBy === 'experienceDesc') filtered.sort((a: any, b: any) => (Number(b.yearsExperience ?? 0) - Number(a.yearsExperience ?? 0)));
      else filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      totalCount = filtered.length;
      caregivers = filtered.slice(skip, skip + pageSize);
    } else {
      // Prefer cursor-based pagination when possible
      const orderBy = (
        sortBy === 'rateAsc' ? [{ hourlyRate: 'asc' as const }, { id: 'asc' as const }] :
        sortBy === 'rateDesc' ? [{ hourlyRate: 'desc' as const }, { id: 'asc' as const }] :
        sortBy === 'experienceDesc' ? [{ yearsExperience: 'desc' as const }, { id: 'asc' as const }] :
        [{ createdAt: 'desc' as const }, { id: 'asc' as const }]
      );

      if (cursor) {
        const rows = await prisma.caregiver.findMany({
          where,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, profileImageUrl: true, addresses: true }
            }
          },
          orderBy,
          cursor: { id: cursor },
          skip: 1, // skip the cursor itself
          take: pageSize + 1,
        });
        caregivers = rows.slice(0, pageSize) as any[];
        // get total for compatibility with existing UI counters
        totalCount = await prisma.caregiver.count({ where });
        // Attach marker for nextCursor via response (below)
        (caregivers as any).__nextCursor = rows[pageSize]?.id ?? null;
      } else {
        const [rows, count] = await Promise.all([
          prisma.caregiver.findMany({
            where,
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, profileImageUrl: true, addresses: true }
              }
            },
            orderBy,
            skip,
            take: pageSize + 1,
          }),
          prisma.caregiver.count({ where })
        ]);
        caregivers = rows.slice(0, pageSize) as any[];
        totalCount = count as number;
        (caregivers as any).__nextCursor = rows[pageSize]?.id ?? null;
      }
    }
    
    /* ------------------------------------------------------------------
       Pull rating aggregates (avg + count) for this result set
    ------------------------------------------------------------------*/
    const reviewAgg = await prisma.caregiverReview.groupBy({
      by: ['caregiverId'],
      where: { caregiverId: { in: caregivers.map((c) => c.id) } },
      _avg: { rating: true },
      _count: { _all: true }
    });
    const reviewMap = new Map(
      reviewAgg.map((r) => [
        r.caregiverId,
        {
          avg: r._avg.rating ?? 0,
          count: r._count._all
        }
      ])
    );

    // helper to derive badges
    const deriveBadges = (avg: number, count: number, yearsExp: number | null, bgStatus: string) => {
      const badges: string[] = [];
      if (bgStatus === 'CLEAR') badges.push('Background Check Clear');
      if (yearsExp !== null && yearsExp >= 5) badges.push('Experienced');
      if (count >= 5 && avg >= 4.5) badges.push('Top Rated');
      return badges;
    };

    // Transform the data to a clean DTO format
    const formattedCaregivers = caregivers.map((caregiver: any) => {
      // Find the first address if available
      const address = caregiver.user.addresses && caregiver.user.addresses.length > 0 
        ? caregiver.user.addresses[0] 
        : null;
      
      // Resolve profile image URL
      let photoUrl = null;
      if (caregiver.user.profileImageUrl) {
        if (typeof caregiver.user.profileImageUrl === 'string') {
          photoUrl = caregiver.user.profileImageUrl;
        } else if (caregiver.user.profileImageUrl.medium) {
          photoUrl = caregiver.user.profileImageUrl.medium;
        } else if (caregiver.user.profileImageUrl.thumbnail) {
          photoUrl = caregiver.user.profileImageUrl.thumbnail;
        } else if (caregiver.user.profileImageUrl.large) {
          photoUrl = caregiver.user.profileImageUrl.large;
        }
      }
      
      // rating data
      const ratingInfo = reviewMap.get(caregiver.id) ?? { avg: 0, count: 0 };

      // Compute rating average safely
      const ratingAverage = typeof ratingInfo.avg === 'number'
        ? Number(ratingInfo.avg.toFixed(1))
        : 0;

      return {
        id: caregiver.id,
        userId: caregiver.user.id,
        name: `${caregiver.user.firstName} ${caregiver.user.lastName}`,
        city: address?.city || null,
        state: address?.state || null,
        hourlyRate: caregiver.hourlyRate ? parseFloat(caregiver.hourlyRate.toString()) : null,
        yearsExperience: caregiver.yearsExperience,
        specialties: caregiver.specialties || [],
        bio: caregiver.bio || null,
        backgroundCheckStatus: caregiver.backgroundCheckStatus,
        photoUrl,
        ratingAverage,
        reviewCount: ratingInfo.count,
        badges: deriveBadges(
          ratingInfo.avg ?? 0,
          ratingInfo.count,
          caregiver.yearsExperience,
          caregiver.backgroundCheckStatus
        ),
        ...(useRadius ? { distanceMiles: caregiver.distanceMiles } : {})
      };
    });
    
    // In development, if no results or error occurs, return mock data
    if (process.env.NODE_ENV === 'development' && formattedCaregivers.length === 0) {
      // Fetch specialties from DB for more realistic mock data
      let specialtyCategories: string[] = [];
      try {
        const categories = await prisma.marketplaceCategory.findMany({
          where: { type: 'SPECIALTY', isActive: true }
        });
        specialtyCategories = categories.map(cat => cat.slug);
      } catch (error) {
        // If we can't get real specialties, use defaults
        specialtyCategories = [
          'alzheimers-care', 'dementia-care', 'diabetes-care', 'hospice-care',
          'medication-management', 'mobility-assistance', 'parkinsons-care',
          'post-surgery-care', 'stroke-recovery', 'wound-care'
        ];
      }
      
      const mockCaregivers = generateMockCaregivers(12, specialtyCategories);
      
      return NextResponse.json(
        { 
          data: mockCaregivers,
          pagination: {
            page,
            pageSize,
            total: mockCaregivers.length
          }
        },
        { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60' } }
      );
    }
    
    // next-cursor calculation (only for non-radius path)
    const nextCursor = !useRadius ? ((caregivers as any).__nextCursor ?? null) : null;
    const hasMore = !useRadius ? Boolean(nextCursor) : (totalCount > skip + pageSize);

    return NextResponse.json(
      { 
        data: formattedCaregivers,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          hasMore,
          cursor: nextCursor,
        }
      },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60', ...(typeof __rl_caregivers_get !== 'undefined' ? buildRateLimitHeaders(__rl_caregivers_get.rr, __rl_caregivers_get.limit) : {}) } }
    );
  } catch (error) {
    console.error('Error fetching caregivers:', error);
    
    // In development, return mock data on error
    if (process.env.NODE_ENV === 'development') {
      const mockCaregivers = generateMockCaregivers(12);
      
      return NextResponse.json(
        { 
          data: mockCaregivers,
          pagination: {
            page: 1,
            pageSize: 20,
            total: mockCaregivers.length,
            hasMore: false,
            cursor: null,
          }
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch caregivers' },
      { status: 500 }
    );
  }
}

// Haversine distance in miles
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate mock caregivers for development
 * (exported for unit tests)
 */
export function generateMockCaregivers(
  count: number,
  specialtyOptions: string[] = []
) {
  // Default specialties if none provided
  const defaultSpecialties = [
    'alzheimers-care', 'dementia-care', 'diabetes-care', 'hospice-care',
    'medication-management', 'mobility-assistance', 'parkinsons-care',
    'post-surgery-care', 'stroke-recovery', 'wound-care'
  ];
  
  const specialties = specialtyOptions.length > 0 ? specialtyOptions : defaultSpecialties;
  
  // Mock data for caregivers
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Logan', 'Charlotte', 'Benjamin', 'Amelia', 'Mason', 'Harper', 'Elijah', 'Evelyn', 'Oliver', 'Abigail', 'Jacob'];
  
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  
  const cities = ['San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto', 'Mountain View', 'Sunnyvale', 'Santa Clara', 'Fremont', 'Hayward'];
  
  const states = ['CA'];
  
  const bios = [
    'Compassionate caregiver with years of experience in assisted living environments. Dedicated to providing personalized care.',
    'Certified nursing assistant specializing in elderly care. Patient, attentive, and committed to improving quality of life.',
    'Experienced healthcare professional with a focus on memory care. Trained in dementia and Alzheimer\'s support.',
    'Reliable caregiver with a background in home health assistance. Skilled in medication management and daily living support.',
    'Dedicated care provider with expertise in mobility assistance and rehabilitation support. Passionate about helping seniors maintain independence.',
    'Empathetic caregiver with specialized training in hospice care. Committed to providing dignity and comfort.',
    'Professional with extensive experience in post-surgery recovery care. Attentive to medical needs and emotional support.',
    'Certified caregiver with training in diabetes management and nutritional support. Focused on holistic wellness.',
    'Experienced in providing care for individuals with Parkinson\'s disease. Knowledgeable about symptom management and mobility exercises.',
    'Compassionate professional specializing in stroke recovery support. Trained in rehabilitation exercises and adaptive techniques.'
  ];
  
  const backgroundCheckStatuses = ['CLEAR', 'PENDING', 'NOT_STARTED', 'CLEAR', 'CLEAR', 'CLEAR'];
  
  // Generate random caregivers
  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const bio = bios[Math.floor(Math.random() * bios.length)];
    const hourlyRate = Math.floor(Math.random() * 20) + 20; // $20-40/hr
    const yearsExperience = Math.floor(Math.random() * 15) + 1; // 1-15 years
    
    // Select 2-4 random specialties
    const caregiverSpecialties = [];
    const specialtyCount = Math.floor(Math.random() * 3) + 2; // 2-4 specialties
    const shuffledSpecialties = [...specialties].sort(() => 0.5 - Math.random());
    for (let j = 0; j < specialtyCount && j < shuffledSpecialties.length; j++) {
      caregiverSpecialties.push(shuffledSpecialties[j]);
    }
    
    const backgroundCheckStatus =
      backgroundCheckStatuses[
        Math.floor(Math.random() * backgroundCheckStatuses.length)
      ];

    // ---------- random profile photo -------------
    const gender = Math.random() < 0.5 ? 'women' : 'men';
    const idx = Math.floor(Math.random() * 90); // 0-89 available
    const photoUrl = `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
      // rating / reviews
      const reviewCount = Math.floor(Math.random() * 50) + 5; // 5-54
      const ratingAverage = parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)); // 3.5-5.0
      const badges: string[] = [];
      if (backgroundCheckStatus === 'CLEAR') badges.push('Background Check Clear');
      if (yearsExperience >= 5) badges.push('Experienced');
      if (reviewCount >= 5 && ratingAverage >= 4.5) badges.push('Top Rated');
    
    return {
      id: `mock-${i + 1}`,
      userId: `mock-user-${i + 1}`,
      name: `${firstName} ${lastName}`,
      city,
      state,
      hourlyRate,
      yearsExperience,
      specialties: caregiverSpecialties,
      bio,
      backgroundCheckStatus,
      photoUrl,
      ratingAverage,
      reviewCount,
      badges
    };
  });
}

/**
 * Return 405 Method Not Allowed for non-GET requests
 */
export function POST() {
  return methodNotAllowed();
}

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
        Allow: 'GET',
      },
    }
  );
}
