import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';

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
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      );
    }
    
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
    
    return NextResponse.json(
      { data: application },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
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
