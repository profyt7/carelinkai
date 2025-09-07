import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { z, ZodError } from 'zod';
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
    
    // Extract filter parameters
    const q = searchParams.get('q');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const zip = searchParams.get('zip');
    const status = searchParams.get('status');
    const setting = searchParams.get('setting');
    const careTypes = searchParams.get('careTypes')?.split(',').filter(Boolean);
    const services = searchParams.get('services')?.split(',').filter(Boolean);
    const specialties = searchParams.get('specialties')?.split(',').filter(Boolean);
    const postedByMe = searchParams.get('postedByMe') === 'true';
    
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
    
    // Setting filter
    if (setting) where.setting = setting;
    
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
    
    // Fetch listings with counts
    const listings = await (prisma as any).marketplaceListing.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            applications: true,
            hires: true
          }
        }
      }
    });
    
    // Transform the data to include counts directly
    const formattedListings = listings.map((listing: any) => {
      const { _count, ...listingData } = listing;
      return {
        ...listingData,
        applicationCount: _count.applications,
        hireCount: _count.hires
      };
    });
    
    return NextResponse.json(
      { data: formattedListings },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace listings' },
      { status: 500 }
    );
  }
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
      { status: 201 }
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
