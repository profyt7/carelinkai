import { NextResponse } from 'next/server';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';

/**
 * GET /api/marketplace/providers
 * 
 * Fetches transportation providers with optional filters
 * Supports filtering by: q, city, state, services
 * Supports pagination with page and pageSize parameters
 */
export async function GET(request: Request) {
  // In production, return 501 Not Implemented
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Providers API not implemented in production' },
      { status: 501 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    // Rate limit: 60 req/min per IP
    {
      const key = getClientIp(request);
      const limit = 60;
      const rr = await rateLimitAsync({ name: 'providers:GET', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
      var __rl_providers_get = { rr, limit };
    }
    
    // Extract filter parameters
    const q = searchParams.get('q');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const services = searchParams.get('services')?.split(',').filter(Boolean);
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
    const radiusMiles = searchParams.get('radiusMiles') ? parseFloat(searchParams.get('radiusMiles')!) : null;
    
    // Pagination and sorting parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;
    const cursor = searchParams.get('cursor');
    const sortBy = (searchParams.get('sortBy') || 'ratingDesc') as 'ratingDesc' | 'rateAsc' | 'rateDesc' | 'distanceAsc';
    
    // Generate mock providers
    let providers = generateMockProviders(q || '');
    
    // Apply filters
    if (q) {
      const searchLower = q.toLowerCase();
      providers = providers.filter(provider => 
        provider.name.toLowerCase().includes(searchLower) ||
        provider.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (city) {
      const cityLower = city.toLowerCase();
      providers = providers.filter(provider => 
        provider.city.toLowerCase().includes(cityLower)
      );
    }
    
    if (state) {
      const stateLower = state.toLowerCase();
      providers = providers.filter(provider => 
        provider.state.toLowerCase().includes(stateLower)
      );
    }
    
    if (services && services.length > 0) {
      providers = providers.filter(provider => 
        services.some(service => provider.services.includes(service))
      );
    }
    
    // Apply optional radius filtering (dev-only mock; approximate by city center)
    const useRadius = !!(lat !== null && lng !== null && radiusMiles !== null && !Number.isNaN(radiusMiles));
    if (useRadius) {
      providers = providers
        .map((p) => ({
          ...p,
          distanceMiles: cityDistanceMiles(lat!, lng!, p.city, p.state)
        }))
        .filter((p) => p.distanceMiles <= (radiusMiles as number));
    }

    // Apply sorting
    if (sortBy === 'distanceAsc' && useRadius) {
      providers.sort((a: any, b: any) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
    } else if (sortBy === 'ratingDesc') {
      providers.sort((a, b) => {
        if (b.ratingAverage !== a.ratingAverage) return b.ratingAverage - a.ratingAverage;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      });
    } else if (sortBy === 'rateAsc' || sortBy === 'rateDesc') {
      const priceOf = (p: any) => {
        if (typeof p.hourlyRate === 'number') return p.hourlyRate;
        if (typeof p.perMileRate === 'number') return p.perMileRate * 20; // approximate conversion
        return Number.POSITIVE_INFINITY;
      };
      providers.sort((a, b) => {
        const av = priceOf(a);
        const bv = priceOf(b);
        return sortBy === 'rateAsc' ? av - bv : bv - av;
      });
    }

    // Apply pagination (prefer cursor-style for deterministic infinite scroll)
    const totalCount = providers.length;
    let startIdx = (page - 1) * pageSize;
    if (cursor) {
      const curIdx = providers.findIndex(p => p.id === cursor);
      startIdx = curIdx >= 0 ? curIdx + 1 : 0;
    }
    const slice = providers.slice(startIdx, startIdx + pageSize + 1);
    const data = slice.slice(0, pageSize);
    const nextCursor = slice[pageSize]?.id ?? null;
    const hasMore = Boolean(nextCursor);

    return NextResponse.json(
      { 
        data,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasMore,
          cursor: nextCursor,
        }
      },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60', ...(typeof __rl_providers_get !== 'undefined' ? buildRateLimitHeaders(__rl_providers_get.rr, __rl_providers_get.limit) : {}) } }
    );
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

// Approximate city coordinates for Bay Area cities used in mock data
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

/**
 * Generate mock transportation providers for development
 * Uses a seed based on query for deterministic results
 */
function generateMockProviders(seed: string): any[] {
  // Create a seeded random function
  const seededRandom = createSeededRandom(seed);
  
  // Mock data for providers
  const companyNames = [
    'Reliable Transport', 'Senior Rides', 'MediMove', 'ComfortRide', 'CareVan',
    'Golden Years Transit', 'AccessWheels', 'MobilityPlus', 'SafeJourney', 'SilverTransit',
    'Gentle Rides', 'CaringTransport', 'EasyLift', 'SeniorShuttle', 'MedExpress',
    'CompassRide', 'DignityDrive', 'AccessTransport', 'CareWheels', 'SerenityShuffle'
  ];
  
  const cities = [
    'San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto', 
    'Mountain View', 'Sunnyvale', 'Santa Clara', 'Fremont', 'Hayward'
  ];
  
  const states = ['CA'];
  
  const serviceOptions = [
    'medical-appointments', 'grocery-shopping', 'pharmacy-pickup', 'social-outings',
    'airport-transfers', 'wheelchair-accessible', 'door-to-door', 'multi-passenger',
    'long-distance', 'recurring-rides', 'same-day-service', 'scheduled-service',
    'assisted-entry', 'bariatric-transport', 'stretcher-transport'
  ];
  
  const descriptions = [
    'Specialized transportation service for seniors and individuals with mobility needs.',
    'Reliable medical transport with trained drivers and wheelchair accessibility.',
    'Door-to-door service for appointments, shopping, and social activities.',
    'Compassionate transportation solutions with personalized assistance.',
    'Safe and comfortable rides with experienced drivers familiar with senior needs.',
    'Scheduled and on-demand transportation with accessibility features.',
    'Professional medical transport with full insurance and trained staff.',
    'Reliable transportation for seniors with door-through-door assistance.',
    'Specialized medical appointment transportation with waiting service.',
    'Comfortable rides with trained drivers and accessible vehicles.'
  ];
  
  const badgeOptions = [
    'Licensed & Insured', 'On-Time Guarantee', 'Top Rated',
    'Wheelchair Accessible', 'Trained Drivers', 'HIPAA Compliant',
    'Background Checked', '24/7 Service', 'Medicaid Approved'
  ];
  
  // Generate 10-20 providers
  const count = Math.floor(seededRandom() * 11) + 10; // 10-20 providers
  
  return Array.from({ length: count }, (_, i) => {
    const name = companyNames[Math.floor(seededRandom() * companyNames.length)];
    const city = cities[Math.floor(seededRandom() * cities.length)];
    const state = states[Math.floor(seededRandom() * states.length)];
    const description = descriptions[Math.floor(seededRandom() * descriptions.length)];
    
    // Select 3-6 random services
    const providerServices = [];
    const serviceCount = Math.floor(seededRandom() * 4) + 3; // 3-6 services
    const shuffledServices = [...serviceOptions].sort(() => seededRandom() - 0.5);
    for (let j = 0; j < serviceCount && j < shuffledServices.length; j++) {
      providerServices.push(shuffledServices[j]);
    }
    
    // Select 2-4 random badges
    const badges = [];
    const badgeCount = Math.floor(seededRandom() * 3) + 2; // 2-4 badges
    const shuffledBadges = [...badgeOptions].sort(() => seededRandom() - 0.5);
    for (let j = 0; j < badgeCount && j < shuffledBadges.length; j++) {
      badges.push(shuffledBadges[j]);
    }
    
    // Determine if using hourly rate or per mile rate (70% hourly, 30% per mile)
    const useHourlyRate = seededRandom() < 0.7;
    const hourlyRate = useHourlyRate ? Math.floor(seededRandom() * 30) + 30 : null; // $30-60/hr
    const perMileRate = !useHourlyRate ? (Math.floor(seededRandom() * 200) + 150) / 100 : null; // $1.50-3.50/mile
    
    // Generate rating data
    const reviewCount = Math.floor(seededRandom() * 196) + 5; // 5-200 reviews
    const ratingAverage = parseFloat((seededRandom() * 1.5 + 3.5).toFixed(1)); // 3.5-5.0 rating
    
    return {
      id: `provider-${i + 1}`,
      name,
      type: 'TRANSPORTATION',
      city,
      state,
      services: providerServices,
      description,
      hourlyRate,
      perMileRate,
      ratingAverage,
      reviewCount,
      badges,
      coverageRadius: Math.floor(seededRandom() * 30) + 10, // 10-40 mile radius
      availableHours: '24/7'
    };
  });
}

/**
 * Creates a seeded random function for deterministic results
 */
function createSeededRandom(seed: string): () => number {
  // Convert seed string to a number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use a simple LCG algorithm for seeded random
  let state = hash || 1;
  return function() {
    state = (state * 1664525 + 1013904223) % 2147483647;
    return state / 2147483647;
  };
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
