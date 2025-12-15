export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { createAuditLogFromRequest } from '@/lib/audit';

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
            coordinates:
              home.address.latitude != null && home.address.longitude != null
                ? { lat: home.address.latitude, lng: home.address.longitude }
                : null,
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
