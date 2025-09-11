import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/marketplace/applications
 * 
 * Fetches applications for a specific listing
 * Requires authentication and user must be the listing owner
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');
    const status = searchParams.get('status');
    
    // Validate required parameters
    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      );
    }
    
    // Check if listing exists and is owned by the user
    const listing = await (prisma as any).marketplaceListing.findUnique({
      where: { id: listingId }
    });
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    if (listing.postedByUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view these applications' },
        { status: 403 }
      );
    }
    
    // Build query conditions
    const where: any = { listingId };
    if (status) {
      where.status = status;
    }
    
    // Fetch applications with caregiver and user data
    const applications = await (prisma as any).marketplaceApplication.findMany({
      where,
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImageUrl: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(
      { data: applications },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/applications
 * 
 * Creates a new application for a marketplace listing
 * Requires authentication and user must have a caregiver profile
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // ---------------- Validation ----------------
    const BodySchema = z.object({
      listingId: z.string().min(1, 'Listing ID is required'),
      note: z.string().optional()
    });

    const body = BodySchema.parse(await request.json());
    
    // Check if user has a caregiver profile
    const caregiver = await (prisma as any).caregiver.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!caregiver) {
      return NextResponse.json(
        { error: 'Only caregivers can apply for listings' },
        { status: 403 }
      );
    }
    
    // Check if listing exists and is open
    const listing = await (prisma as any).marketplaceListing.findUnique({
      where: { id: body.listingId }
    });
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 400 }
      );
    }
    
    if (listing.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'This listing is no longer accepting applications' },
        { status: 400 }
      );
    }
    
    // Check for duplicate application
    const existingApplication = await (prisma as any).marketplaceApplication.findUnique({
      where: {
        listingId_caregiverId: {
          listingId: body.listingId,
          caregiverId: caregiver.id
        }
      }
    });
    
    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this listing' },
        { status: 409 }
      );
    }
    
    // Create application
    const application = await (prisma as any).marketplaceApplication.create({
      data: {
        listingId: body.listingId,
        caregiverId: caregiver.id,
        note: body.note || null,
        status: 'APPLIED'
      }
    });

    // Notify listing owner of new application (in-app notification only)
    try {
      await (prisma as any).notification.create({
        data: {
          userId: listing.postedByUserId,
          type: 'SYSTEM',
          title: 'New application received',
          message: `You received a new application for "${listing.title}"`,
          data: {
            listingId: listing.id,
            applicationId: application.id
          }
        }
      });
    } catch (notifyErr) {
      // Log and swallow notification errors so they don't block application creation
      console.error('Failed to create notification for new application:', notifyErr);
    }
    
    return NextResponse.json(
      { data: application },
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

    // Prisma known errors (field constraint, FK, etc.)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error creating application:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
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
