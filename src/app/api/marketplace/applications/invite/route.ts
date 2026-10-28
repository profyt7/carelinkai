
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * POST /api/marketplace/applications/invite
 * 
 * Invites a caregiver to a marketplace listing
 * Requires authentication and user must be the listing owner
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
      caregiverId: z.string().min(1, 'Caregiver ID is required'),
      message: z.string().optional()
    });

    const body = BodySchema.parse(await request.json());
    
    // Check if listing exists and is owned by the user
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: body.listingId }
    });
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    if (listing.postedByUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to invite caregivers to this listing' },
        { status: 403 }
      );
    }
    
    // Check if caregiver exists
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: body.caregiverId },
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    });
    
    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found' },
        { status: 404 }
      );
    }
    
    // Check for existing application
    const existingApplication = await prisma.marketplaceApplication.findUnique({
      where: {
        listingId_caregiverId: {
          listingId: body.listingId,
          caregiverId: body.caregiverId
        }
      }
    });
    
    let application;
    let statusCode = 200;
    
    if (existingApplication) {
      // Idempotent case - application already exists
      // Update status to INVITED if currently APPLIED
      if (existingApplication.status === 'APPLIED') {
        application = await prisma.marketplaceApplication.update({
          where: { id: existingApplication.id },
          data: { status: 'INVITED' }
        });
      } else {
        // If status is already INVITED or beyond, return as-is
        application = existingApplication;
      }
    } else {
      // Create new application with INVITED status
      application = await prisma.marketplaceApplication.create({
        data: {
          listingId: body.listingId,
          caregiverId: body.caregiverId,
          status: 'INVITED',
          note: body.message || null
        }
      });
      statusCode = 201; // Created
    }

    // Create notification for caregiver
    const defaultMessage = `You've been invited to apply for "${listing.title}"`;
    
    await prisma.notification.create({
      data: {
        userId: caregiver.user.id,
        type: 'SYSTEM',
        title: 'You were invited to a listing',
        message: body.message || defaultMessage,
        data: {
          listingId: listing.id,
          applicationId: application.id
        }
      }
    });
    
    return NextResponse.json(
      { data: application },
      { status: statusCode }
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
      console.error('Prisma error inviting caregiver:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error('Error inviting caregiver:', error);
    return NextResponse.json(
      { error: 'Failed to invite caregiver' },
      { status: 500 }
    );
  }
}

/**
 * Return 405 Method Not Allowed for non-POST requests
 */
export function GET() {
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
        Allow: 'POST',
      },
    }
  );
}