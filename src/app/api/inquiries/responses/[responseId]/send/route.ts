
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Helper function to check if user has access to the response's inquiry
 */
async function hasResponseAccess(userId: string, userRole: string, responseId: string): Promise<boolean> {
  if (userRole === 'ADMIN') {
    return true;
  }
  
  const response = await prisma.inquiryResponse.findUnique({
    where: { id: responseId },
    include: {
      inquiry: {
        include: {
          family: { select: { userId: true } },
          home: { select: { operatorId: true } },
        },
      },
    },
  });
  
  if (!response) {
    return false;
  }
  
  if (userRole === 'FAMILY') {
    return response.inquiry.family.userId === userId;
  }
  
  if (userRole === 'OPERATOR') {
    const operator = await prisma.operator.findUnique({
      where: { userId },
      select: { id: true },
    });
    return operator?.id === response.inquiry.home.operatorId;
  }
  
  return false;
}

/**
 * POST /api/inquiries/responses/[responseId]/send - Send a draft response
 * Converts a draft to sent status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { responseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check access rights
    const hasAccess = await hasResponseAccess(
      session.user.id,
      session.user.role,
      params.responseId
    );
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get the response to check if it's a draft
    const response = await prisma.inquiryResponse.findUnique({
      where: { id: params.responseId },
      include: {
        inquiry: {
          include: {
            family: {
              include: {
                user: {
                  select: {
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response not found' },
        { status: 404 }
      );
    }

    // Only allow sending draft responses
    if (response.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft responses can be sent' },
        { status: 400 }
      );
    }

    // TODO: Integrate with actual email/SMS sending services
    // For now, just update the status
    console.log(`[Send Draft] Would send ${response.channel} to ${response.toAddress}`);
    console.log(`Subject: ${response.subject || 'No subject'}`);
    console.log(`Content: ${response.content.substring(0, 100)}...`);

    // Update the response status
    const updatedResponse = await prisma.inquiryResponse.update({
      where: { id: params.responseId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentBy: session.user.id,
      },
    });

    // Update inquiry status to CONTACTED if this is the first sent response
    const sentResponseCount = await prisma.inquiryResponse.count({
      where: { 
        inquiryId: response.inquiryId,
        status: 'SENT',
      },
    });
    
    if (sentResponseCount === 1 && response.inquiry.status === 'NEW') {
      await prisma.inquiry.update({
        where: { id: response.inquiryId },
        data: { status: 'CONTACTED' },
      });
    }

    return NextResponse.json({
      success: true,
      response: updatedResponse,
      message: 'Response sent successfully',
    });
  } catch (error) {
    console.error('Error sending draft response:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
