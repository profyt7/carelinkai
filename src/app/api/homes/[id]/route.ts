export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing home id' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    const home = await prisma.assistedLivingHome.findUnique({
      where: { id },
      include: {
        address: true,
        photos: { orderBy: { sortOrder: 'asc' } },
        reviews: true,
        licenses: { orderBy: { expirationDate: 'desc' }, take: 1 },
        inspections: { orderBy: { inspectionDate: 'desc' }, take: 1 },
        operator: {
          select: {
            id: true,
            companyName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!home || home.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Home not found' }, { status: 404 });
    }

    // Compute ratings
    const ratings = (home.reviews || []).map((r) => r.rating);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    // Build address string and coordinates
    const addr = home.address;
    const addressString = addr
      ? [addr.street, [addr.city, addr.state].filter(Boolean).join(', '), addr.zipCode].filter(Boolean).join(', ')
      : '';

    const availability = Math.max(0, (home.capacity ?? 0) - (home.currentOccupancy ?? 0));

    // Map photos
    const photos = (home.photos || []).map((p) => ({ id: p.id, url: p.url, caption: p.caption ?? null }));

    // Map amenities -> single grouped category to satisfy frontend
    const amenities = [
      {
        category: 'Amenities',
        items: (home.amenities || []) as string[],
      },
    ];

    // License info (best-effort)
    const latestLicense = home.licenses?.[0] ?? null;
    const latestInspection = home.inspections?.[0] ?? null;
    const license = {
      number: latestLicense?.licenseNumber ?? '',
      type: latestLicense?.type ?? '',
      status: latestLicense?.status ?? 'Unknown',
      lastInspection: latestInspection?.inspectionDate?.toISOString() ?? null,
      violations: 0, // Not modeled; default 0
    };

    const data = {
      id: home.id,
      name: home.name,
      address: addressString,
      description: home.description,
      longDescription: home.description, // No separate longDescription in schema
      careLevel: home.careLevel,
      priceRange: {
        min: home.priceMin ? Number(home.priceMin) : null,
        max: home.priceMax ? Number(home.priceMax) : null,
      },
      capacity: home.capacity,
      availability,
      gender: home.genderRestriction ?? 'ALL',
      rating: averageRating,
      reviewsCount: ratings.length,
      aiMatchScore: null as number | null,
      photos,
      amenities,
      pricing: [] as any[],
      oneTimeFees: [] as any[],
      pricingNotes: null as string | null,
      virtualTour: null as string | null,
      contactInfo: {
        phone: '',
        email: '',
        website: '',
        administrator: [home.operator?.user?.firstName, home.operator?.user?.lastName].filter(Boolean).join(' '),
      },
      license,
      reviewsList: (home.reviews || []).slice(0, 10).map((r) => ({
        id: r.id,
        author: 'Resident/Family',
        relationship: '',
        rating: r.rating,
        date: r.createdAt.toISOString(),
        content: r.content ?? '',
      })),
      availableDates: [] as string[],
      coordinates: addr && addr.latitude && addr.longitude ? { lat: addr.latitude, lng: addr.longitude } : null,
      staff: [] as any[],
      activities: [] as any[],
    };

    if (userId) {
      await createAuditLog({
        userId,
        action: 'READ',
        resourceType: 'AssistedLivingHome',
        resourceId: home.id,
        description: `Viewed home details for ${home.name}`,
        metadata: undefined,
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/homes/[id]:', error);
    return NextResponse.json({ success: false, message: 'Failed to load home' }, { status: 500 });
  }
}
