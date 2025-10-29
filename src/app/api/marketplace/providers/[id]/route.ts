import { NextResponse } from 'next/server';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';

// Reuse the mock generator from the index route by copying minimal logic
function createSeededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash) + seed.charCodeAt(i); hash &= hash; }
  let state = hash || 1;
  return function() { state = (state * 1664525 + 1013904223) % 2147483647; return state / 2147483647; };
}

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

    // Deterministically generate a single provider from its id
    const rand = createSeededRandom(id);
    const cities = ['San Francisco','Oakland','San Jose','Berkeley','Palo Alto','Mountain View','Sunnyvale','Santa Clara','Fremont','Hayward'];
    const companyNames = ['Reliable Transport','Senior Rides','MediMove','ComfortRide','CareVan','Golden Years Transit','AccessWheels','MobilityPlus','SafeJourney','SilverTransit'];
    const services = ['medical-appointments','grocery-shopping','pharmacy-pickup','social-outings','airport-transfers','wheelchair-accessible','door-to-door','long-distance','scheduled-service'];
    const badges = ['Licensed & Insured','On-Time Guarantee','Wheelchair Accessible','Trained Drivers','Background Checked'];
    const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
    const pickMany = (arr: string[], n: number) => {
      const a = [...arr].sort(() => rand() - 0.5); return a.slice(0, Math.max(1, Math.min(n, a.length)));
    };

    const data = {
      id,
      name: pick(companyNames),
      type: 'TRANSPORTATION',
      city: pick(cities),
      state: 'CA',
      services: pickMany(services, 5),
      description: 'Safe, reliable senior transportation with accessibility support and trained drivers.',
      hourlyRate: rand() < 0.6 ? (30 + Math.floor(rand() * 31)) : null,
      perMileRate: rand() >= 0.6 ? parseFloat((1.5 + rand() * 2).toFixed(2)) : null,
      ratingAverage: parseFloat((3.5 + rand() * 1.5).toFixed(1)),
      reviewCount: 5 + Math.floor(rand() * 200),
      badges: pickMany(badges, 3),
      coverageRadius: 10 + Math.floor(rand() * 31),
      availableHours: '24/7'
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
