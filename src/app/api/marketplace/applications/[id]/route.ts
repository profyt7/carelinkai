
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * PATCH /api/marketplace/applications/[id]
 * 
 * Updates an application status based on owner action
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
    
    const applicationId = params.id;
    
    // Fetch application with listing and caregiver info
    const application = await (prisma as any).marketplaceApplication.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            postedByUserId: true
          }
        },
        caregiver: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    });
    
    // Check if application exists
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Verify user is the listing owner
    if (application.listing.postedByUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this application' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { action, message, interviewAt } = body;
    
    // Map action to status
    let newStatus;
    let notificationTitle;
    let defaultMessage;
    
    switch (action) {
      case 'INVITE':
        newStatus = 'INVITED';
        notificationTitle = 'Application update: Invited';
        defaultMessage = `You've been invited to connect about "${application.listing.title}"`;
        break;
      case 'INTERVIEW':
        newStatus = 'INTERVIEWING';
        notificationTitle = 'Application update: Interview';
        defaultMessage = `You've been selected for an interview for "${application.listing.title}"`;
        break;
      case 'OFFER':
        newStatus = 'OFFERED';
        notificationTitle = 'Application update: Offer';
        defaultMessage = `You've received an offer for "${application.listing.title}"`;
        break;
      case 'REJECT':
        newStatus = 'REJECTED';
        notificationTitle = 'Application update: Not selected';
        defaultMessage = `Your application for "${application.listing.title}" was not selected`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: INVITE, INTERVIEW, OFFER, REJECT' },
          { status: 400 }
        );
    }
    
    // Validate interviewAt if provided
    let parsedInterviewAt = null;
    if (interviewAt) {
      try {
        parsedInterviewAt = new Date(interviewAt).toISOString();
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid interview date format. Please provide a valid ISO date string.' },
          { status: 400 }
        );
      }
    }
    
    // Update application status
    const updatedApplication = await (prisma as any).marketplaceApplication.update({
      where: { id: applicationId },
      data: {
        status: newStatus
      },
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    // Create notification for caregiver
    const notificationData: any = {
      applicationId,
      listingId: application.listing.id,
      action
    };
    
    // Only include interviewAt if it's a valid date
    if (parsedInterviewAt) {
      notificationData.interviewAt = parsedInterviewAt;
    }
    
    await (prisma as any).notification.create({
      data: {
        userId: application.caregiver.userId,
        type: 'SYSTEM',
        title: notificationTitle,
        message: message || defaultMessage,
        data: notificationData
      }
    });
    
    return NextResponse.json(
      { data: updatedApplication },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketplace/applications/[id]
 * 
 * Method not allowed - return 405
 */
export function GET() {
  return methodNotAllowed();
}

/**
 * POST /api/marketplace/applications/[id]
 * 
 * Method not allowed - return 405
 */
export function POST() {
  return methodNotAllowed();
}

/**
 * PUT /api/marketplace/applications/[id]
 * 
 * Method not allowed - return 405
 */
export function PUT() {
  return methodNotAllowed();
}

/**
 * DELETE /api/marketplace/applications/[id]
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
