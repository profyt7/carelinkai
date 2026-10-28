
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * PATCH /api/marketplace/listings/[id]
 * 
 * Updates a marketplace listing with partial data
 * Requires authentication and user must be the listing owner
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const listingId = params.id;
    
    // Fetch listing to verify ownership
    const listing = await (prisma as any).marketplaceListing.findUnique({
      where: { id: listingId }
    });
    
    // Check if listing exists
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    // Verify user is the listing owner
    if (listing.postedByUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this listing' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Build update data object with only provided fields
    const updateData: any = {};
    
    // Text fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.setting !== undefined) updateData.setting = body.setting;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.zipCode !== undefined) updateData.zipCode = body.zipCode;
    
    // Array fields
    if (body.careTypes !== undefined) updateData.careTypes = body.careTypes;
    if (body.services !== undefined) updateData.services = body.services;
    if (body.specialties !== undefined) updateData.specialties = body.specialties;
    
    // Number fields
    if (body.hourlyRateMin !== undefined) {
      updateData.hourlyRateMin = body.hourlyRateMin ? parseFloat(body.hourlyRateMin) : null;
    }
    if (body.hourlyRateMax !== undefined) {
      updateData.hourlyRateMax = body.hourlyRateMax ? parseFloat(body.hourlyRateMax) : null;
    }
    
    // Date fields
    if (body.startTime !== undefined) {
      updateData.startTime = body.startTime ? new Date(body.startTime) : null;
    }
    if (body.endTime !== undefined) {
      updateData.endTime = body.endTime ? new Date(body.endTime) : null;
    }
    
    // Status field - validate allowed values
    if (body.status !== undefined) {
      if (body.status !== 'OPEN' && body.status !== 'CLOSED') {
        return NextResponse.json(
          { error: 'Status must be either OPEN or CLOSED' },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    
    // If no fields to update, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // Update listing
    const updatedListing = await (prisma as any).marketplaceListing.update({
      where: { id: listingId },
      data: updateData
    });
    
    return NextResponse.json(
      { data: updatedListing },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating marketplace listing:', error);
    return NextResponse.json(
      { error: 'Failed to update marketplace listing' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketplace/listings/[id]
 * 
 * Method not allowed - return 405
 */
export function GET() {
  return methodNotAllowed();
}

/**
 * POST /api/marketplace/listings/[id]
 * 
 * Method not allowed - return 405
 */
export function POST() {
  return methodNotAllowed();
}

/**
 * PUT /api/marketplace/listings/[id]
 * 
 * Method not allowed - return 405
 */
export function PUT() {
  return methodNotAllowed();
}

/**
 * DELETE /api/marketplace/listings/[id]
 * 
 * Method not allowed - return 405
 */
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
        Allow: 'PATCH',
      },
    }
  );
}
