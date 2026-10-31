export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { createAuditLogFromRequest } from '@/lib/audit';
import { isUnclaimedHome } from '@/lib/claim-engine/inquiry-claim-notification';
import { listingClaimState } from '@/lib/claims/self-serve';
import { availabilityView } from '@/lib/availability/availability';
import { pricingView, computeFamilyAvg } from '@/lib/pricing/pricing';
import { medicaidWaiverPublicView } from '@/lib/medicaid/waiver';
import { verifiedFieldsFromEvents, PROVENANCE_FIELDS, VERIFIED_FIELD_SOURCES } from '@/lib/homes/listing-facts';
import { isFeaturedActive } from '@/lib/directory/featured-rank';

/**
 * City coordinates lookup for homes without geo data
 * Used to provide approximate map markers when addresses lack lat/lng
 */
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // California
  'san francisco, ca': { lat: 37.7749, lng: -122.4194 },
  'los angeles, ca': { lat: 34.0522, lng: -118.2437 },
  'san diego, ca': { lat: 32.7157, lng: -117.1611 },
  'san jose, ca': { lat: 37.3382, lng: -121.8863 },
  'oakland, ca': { lat: 37.8044, lng: -122.2712 },
  'sacramento, ca': { lat: 38.5816, lng: -121.4944 },
  'fresno, ca': { lat: 36.7378, lng: -119.7871 },
  'palo alto, ca': { lat: 37.4419, lng: -122.1430 },
  // Other states
  'seattle, wa': { lat: 47.6062, lng: -122.3321 },
  'portland, or': { lat: 45.5051, lng: -122.6750 },
  'phoenix, az': { lat: 33.4484, lng: -112.0740 },
  'denver, co': { lat: 39.7392, lng: -104.9903 },
  'austin, tx': { lat: 30.2672, lng: -97.7431 },
  'dallas, tx': { lat: 32.7767, lng: -96.7970 },
  'miami, fl': { lat: 25.7617, lng: -80.1918 },
  'new york, ny': { lat: 40.7128, lng: -74.0060 },
  'chicago, il': { lat: 41.8781, lng: -87.6298 },
  'boston, ma': { lat: 42.3601, lng: -71.0589 },
  // Ohio
  'cleveland, oh': { lat: 41.4993, lng: -81.6944 },
  'columbus, oh': { lat: 39.9612, lng: -82.9988 },
  'cincinnati, oh': { lat: 39.1031, lng: -84.5120 },
  'akron, oh': { lat: 41.0814, lng: -81.5190 },
  'toledo, oh': { lat: 41.6528, lng: -83.5379 },
  'dayton, oh': { lat: 39.7589, lng: -84.1916 },
  'youngstown, oh': { lat: 41.0998, lng: -80.6495 },
  'canton, oh': { lat: 40.7989, lng: -81.3784 },
  'lorain, oh': { lat: 41.4523, lng: -82.1824 },
  'parma, oh': { lat: 41.3845, lng: -81.7290 },
  'euclid, oh': { lat: 41.5931, lng: -81.5268 },
  'mentor, oh': { lat: 41.6661, lng: -81.3396 },
  // Greater Cleveland suburbs (OL-173) — city centroids, so a listing map lands
  // in the right town instead of the state-level fallback.
  'beachwood, oh': { lat: 41.4645, lng: -81.5087 },
  'lakewood, oh': { lat: 41.4820, lng: -81.7982 },
  'shaker heights, oh': { lat: 41.4739, lng: -81.5371 },
  'cleveland heights, oh': { lat: 41.5200, lng: -81.5562 },
  'university heights, oh': { lat: 41.4978, lng: -81.5379 },
  'south euclid, oh': { lat: 41.5231, lng: -81.5185 },
  'lyndhurst, oh': { lat: 41.5200, lng: -81.4887 },
  'mayfield heights, oh': { lat: 41.5192, lng: -81.4579 },
  'solon, oh': { lat: 41.3898, lng: -81.4412 },
  'garfield heights, oh': { lat: 41.4170, lng: -81.6057 },
  'independence, oh': { lat: 41.3687, lng: -81.6379 },
  'seven hills, oh': { lat: 41.3953, lng: -81.6762 },
  'brecksville, oh': { lat: 41.3198, lng: -81.6268 },
  'broadview heights, oh': { lat: 41.3139, lng: -81.6851 },
  'strongsville, oh': { lat: 41.3145, lng: -81.8357 },
  'middleburg heights, oh': { lat: 41.3614, lng: -81.8129 },
  'berea, oh': { lat: 41.3662, lng: -81.8543 },
  'brook park, oh': { lat: 41.3984, lng: -81.8046 },
  'fairview park, oh': { lat: 41.4414, lng: -81.8643 },
  'rocky river, oh': { lat: 41.4756, lng: -81.8393 },
  'north olmsted, oh': { lat: 41.4156, lng: -81.9235 },
  'westlake, oh': { lat: 41.4553, lng: -81.9179 },
  'bay village, oh': { lat: 41.4848, lng: -81.9220 },
  // State-level fallbacks
  'ca': { lat: 36.7783, lng: -119.4179 },
  'wa': { lat: 47.7511, lng: -120.7401 },
  'or': { lat: 43.8041, lng: -120.5542 },
  'az': { lat: 34.0489, lng: -111.0937 },
  'tx': { lat: 31.9686, lng: -99.9018 },
  'fl': { lat: 27.6648, lng: -81.5158 },
  'ny': { lat: 40.7128, lng: -74.0060 },
  'oh': { lat: 40.4173, lng: -82.9071 },
  'il': { lat: 40.6331, lng: -89.3985 },
  'co': { lat: 39.5501, lng: -105.7821 },
  'ma': { lat: 42.4072, lng: -71.3824 },
  'pa': { lat: 41.2033, lng: -77.1945 },
  'mi': { lat: 44.3148, lng: -85.6024 },
  'ga': { lat: 32.1656, lng: -82.9001 },
  'nc': { lat: 35.7596, lng: -79.0193 },
  'va': { lat: 37.4316, lng: -78.6569 },
};

/**
 * Get approximate coordinates for an address without lat/lng
 * Uses city lookup first, then state fallback
 */
function getApproximateCoordinates(city: string | null, state: string | null): { lat: number; lng: number } | null {
  if (!city && !state) return null;
  
  // Try city + state first
  if (city && state) {
    const key = `${city.toLowerCase()}, ${state.toLowerCase()}`;
    if (CITY_COORDINATES[key]) {
      // Add small random offset to prevent markers from stacking exactly
      const offset = () => (Math.random() - 0.5) * 0.02; // ~1-2km offset
      return {
        lat: CITY_COORDINATES[key].lat + offset(),
        lng: CITY_COORDINATES[key].lng + offset()
      };
    }
  }
  
  // Try state fallback
  if (state) {
    const stateKey = state.toLowerCase();
    if (CITY_COORDINATES[stateKey]) {
      const offset = () => (Math.random() - 0.5) * 0.5; // Larger offset for state-level
      return {
        lat: CITY_COORDINATES[stateKey].lat + offset(),
        lng: CITY_COORDINATES[stateKey].lng + offset()
      };
    }
  }
  
  return null;
}

// Curated fallback images from Cloudinary (align with search API)
const HOME_IMAGES: string[] = [
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830428/carelinkai/homes/home-1.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830435/carelinkai/homes/home-2.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830437/carelinkai/homes/home-3.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830439/carelinkai/homes/home-4.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830441/carelinkai/homes/home-5.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830443/carelinkai/homes/home-6.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830445/carelinkai/homes/home-7.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830447/carelinkai/homes/home-8.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830449/carelinkai/homes/home-9.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830430/carelinkai/homes/home-10.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830431/carelinkai/homes/home-11.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830433/carelinkai/homes/home-12.jpg',
];

function sanitizeImageUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const blockedHosts = ['example.com'];
    if (blockedHosts.includes(host)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing home id' },
      { status: 400 }
    );
  }

  try {
    const session = await getServerSession(authOptions);

    // Fetch home with related data
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id },
      include: {
        address: true,
        photos: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        operator: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (!home) {
      return NextResponse.json(
        { success: false, error: 'Home not found' },
        { status: 404 }
      );
    }

    // OL-112: demo/tutorial fixtures are not part of the public directory.
    // A logged-out viewer (crawler, shared link) gets the same 404 the
    // listing APIs imply; signed-in users (tutorial demo accounts, admins)
    // are unaffected.
    if (home.isDemo && !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Home not found' },
        { status: 404 }
      );
    }

    // Favorite homes for current family user
    let isFavorited = false;
    if (session?.user?.email) {
      const favUser = await prisma.user.findUnique({
        where: { email: session.user.email as string },
        include: { family: { include: { favorites: true } } },
      });
      if (favUser?.family) {
        isFavorited = favUser.family.favorites.some((f) => f.homeId === home.id);
      }
    }

    // Is the viewer the operator who owns this (claimed) home? Lets them reply to reviews.
    let viewerIsOwner = false;
    if (session?.user?.email) {
      const viewerUser = await prisma.user.findUnique({
        where: { email: session.user.email as string },
        select: { operator: { select: { id: true } } },
      });
      viewerIsOwner = Boolean(viewerUser?.operator && viewerUser.operator.id === home.operatorId);
    }

    // Compute rating
    const ratings = home.reviews?.map((r) => r.rating) ?? [];
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;

    // Inquiry→claim "pull" engine (OL-083): on UNCLAIMED listings, surface a
    // waiting-leads counter as the organic claim driver. HIPAA: count ONLY — no
    // inquiry/health details are exposed publicly.
    const unclaimed = isUnclaimedHome(home.operator?.user?.email);
    const pendingInquiryCount = unclaimed
      ? await prisma.inquiry.count({ where: { homeId: home.id, status: 'NEW' } })
      : 0;
    // Self-serve claim (fix/self-serve-claim): open / under review / managed by its community. No claimant details.
    const claimState = await listingClaimState({ id: home.id, operatorEmail: home.operator?.user?.email });

    // Choose primary image with fallback
    const primary = sanitizeImageUrl(home.photos?.find((p) => p.isPrimary)?.url ?? null);
    const fallback = HOME_IMAGES[home.id.length % HOME_IMAGES.length];
    const primaryPhoto = primary ?? fallback;

    // Build response object aligned with search API structure where possible
    // Use fallback coordinates if address lacks lat/lng
    const dbCoords = home.address?.latitude != null && home.address?.longitude != null
      ? { lat: home.address.latitude, lng: home.address.longitude }
      : null;
    const fallbackCoords = !dbCoords && home.address
      ? getApproximateCoordinates(home.address.city, home.address.state)
      : null;
    const coordinates = dbCoords || fallbackCoords;

    // OL-173: field provenance from the append-only event log — which of
    // capacity / amenities an operator, admin or VA call actually set. Seeds
    // (directory import, dev endpoint) write no events, so their defaults
    // (e.g. capacity 100) never render as fact on the listing page.
    // Fails closed: if the history read errors, every field reads as unverified.
    const provenanceEvents = await (async () => prisma.entityEvent.findMany({
      where: {
        entityType: 'OPERATOR_PROFILE',
        entityId: home.id,
        eventType: { in: ['field.changed', 'field.confirmed'] },
        field: { in: [...PROVENANCE_FIELDS] },
        source: { in: [...VERIFIED_FIELD_SOURCES] },
      },
      select: { field: true, source: true },
      distinct: ['field'],
    }))().catch(() => [] as Array<{ field: string | null; source: string }>);
    const verifiedFields = verifiedFieldsFromEvents(provenanceEvents);

    const data = {
      id: home.id,
      name: home.name,
      description: home.description,
      tagline: home.tagline,
      // Direct phone is gated to CLAIMED listings: on unclaimed/directory homes
      // we keep the inquiry-capture + claim-nudge flow primary (OL-083), so the
      // facility's line isn't surfaced (or scrapable via this API) until claimed.
      phone: unclaimed ? null : home.phone,
      address: home.address
        ? {
            street: home.address.street,
            street2: home.address.street2,
            city: home.address.city,
            state: home.address.state,
            zipCode: home.address.zipCode,
            coordinates,
            // City/state centroid (not geocoded) — the map shows it as approximate.
            coordinatesApproximate: !dbCoords && Boolean(fallbackCoords),
          }
        : null,
      careLevel: home.careLevel,
      priceRange: {
        min: home.priceMin ? Number(home.priceMin) : null,
        max: home.priceMax ? Number(home.priceMax) : null,
        formattedMin: home.priceMin ? formatCurrency(Number(home.priceMin)) : null,
        formattedMax: home.priceMax ? formatCurrency(Number(home.priceMax)) : null,
      },
      capacity: home.capacity,
      // Legacy static math (seed defaults, stale). The listing page no longer
      // renders it (OL-173) — it uses availabilityFreshness + verifiedFields.
      availability: home.capacity - home.currentOccupancy,
      // OL-173: which fields an OPERATOR / ADMIN / VA_CALL write backs.
      verifiedFields,
      // Live-ish verified availability (OL-110) — honest freshness, never fake "live".
      // Prefer this over the static capacity math when fresh; else "contact to confirm".
      availabilityFreshness: availabilityView(home),
      // Honest source-labeled pricing (OL-111) incl. FAMILY_AVG when past threshold.
      pricing: pricingView(home, await computeFamilyAvg(home.id)),
      // Medicaid Assisted Living Waiver line + "pending accepted" (sprint W5-2).
      // Public facts only; line is null for NOT_ON_LIST / UNKNOWN.
      medicaidWaiver: medicaidWaiverPublicView(home),
      // OL-176: raw value — null when never set. The page shows it only when an
      // accountable source wrote it (verifiedFields); it used to default to 'ALL'.
      gender: home.genderRestriction ?? null,
      amenities: home.amenities,
      // VA-collected (phone) price/amenities are approximate until the operator
      // confirms — surfaced as "pending operator confirmation", cleared on claim+edit.
      pricePending: (home.preFilledFields as Record<string, unknown> | null)?.priceRange === 'VA_UNVERIFIED',
      amenitiesPending: (home.preFilledFields as Record<string, unknown> | null)?.amenities === 'VA_UNVERIFIED',
      primaryPhoto,
      photos: (home.photos || []).map((p) => ({ id: p.id, url: p.url, caption: p.caption || '' })),
      // OL-176: an unclaimed listing's operator is the directory placeholder
      // account — never present it (or its system email) as the facility contact.
      operator: home.operator && !unclaimed
        ? {
            name: `${home.operator.user.firstName} ${home.operator.user.lastName}`,
            email: home.operator.user.email,
            company: home.operator.companyName,
          }
        : null,
      rating: averageRating,
      reviewCount: ratings.length,
      isFavorited,
      viewerIsOwner,
      unclaimed,
      claimState,
      // OL-191: active featured window → "Featured" badge on the listing page.
      featured: isFeaturedActive(home),
      // Google aggregate rating (trust badge) — rating + count + place id only, no review text.
      googleRating: home.googleRating ?? null,
      googleRatingCount: home.googleRatingCount ?? null,
      googlePlaceId: home.googlePlaceId ?? null,
      pendingInquiryCount,
    };

    // Best-effort audit log (non-blocking)
    await createAuditLogFromRequest(
      req,
      'READ' as any,
      'AssistedLivingHome',
      home.id,
      `Viewed home details: ${home.name}`,
      { availability: data.availability }
    );

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Home detail API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while fetching home details',
        details: process.env['NODE_ENV'] === 'development' ? String((error as any)?.message ?? error) : undefined,
      },
      { status: 500 }
    );
  }
}
