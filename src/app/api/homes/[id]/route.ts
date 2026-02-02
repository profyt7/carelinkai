export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { createAuditLogFromRequest } from '@/lib/audit';

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
  // State-level fallbacks
  'ca': { lat: 36.7783, lng: -119.4179 },
  'wa': { lat: 47.7511, lng: -120.7401 },
  'or': { lat: 43.8041, lng: -120.5542 },
  'az': { lat: 34.0489, lng: -111.0937 },
  'tx': { lat: 31.9686, lng: -99.9018 },
  'fl': { lat: 27.6648, lng: -81.5158 },
  'ny': { lat: 40.7128, lng: -74.0060 },
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

    // Compute rating
    const ratings = home.reviews?.map((r) => r.rating) ?? [];
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;

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

    const data = {
      id: home.id,
      name: home.name,
      description: home.description,
      address: home.address
        ? {
            street: home.address.street,
            street2: home.address.street2,
            city: home.address.city,
            state: home.address.state,
            zipCode: home.address.zipCode,
            coordinates,
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
      availability: home.capacity - home.currentOccupancy,
      gender: home.genderRestriction || 'ALL',
      amenities: home.amenities,
      primaryPhoto,
      photos: (home.photos || []).map((p) => ({ id: p.id, url: p.url, caption: p.caption || '' })),
      operator: home.operator
        ? {
            name: `${home.operator.user.firstName} ${home.operator.user.lastName}`,
            email: home.operator.user.email,
            company: home.operator.companyName,
          }
        : null,
      rating: averageRating,
      reviewCount: ratings.length,
      isFavorited,
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
