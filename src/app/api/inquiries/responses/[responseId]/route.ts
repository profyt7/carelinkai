
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating draft responses
const updateDraftSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  subject: z.string().optional(),
  toAddress: z.string().optional(),
});

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
 * DELETE /api/inquiries/responses/[responseId] - Delete a draft response
 * Only draft responses can be deleted
 */
export async function DELETE(
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
    });

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response not found' },
        { status: 404 }
      );
    }

    // Only allow deleting draft responses
    if (response.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft responses can be deleted' },
        { status: 400 }
      );
    }

    // Delete the response
    await prisma.inquiryResponse.delete({
      where: { id: params.responseId },
    });

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting draft response:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete draft',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inquiries/responses/[responseId] - Update a draft response
 * Only draft responses can be edited
 */
export async function PATCH(
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

    const body = await request.json();
    
    // Validate request body
    const validationResult = updateDraftSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get the response to check if it's a draft
    const response = await prisma.inquiryResponse.findUnique({
      where: { id: params.responseId },
    });

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response not found' },
        { status: 404 }
      );
    }

    // Only allow editing draft responses
    if (response.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft responses can be edited' },
        { status: 400 }
      );
    }

    // Update the response
    const updatedResponse = await prisma.inquiryResponse.update({
      where: { id: params.responseId },
      data: {
        content: data.content,
        subject: data.subject,
        toAddress: data.toAddress,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      response: updatedResponse,
      message: 'Draft updated successfully',
    });
  } catch (error) {
    console.error('Error updating draft response:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update draft',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


