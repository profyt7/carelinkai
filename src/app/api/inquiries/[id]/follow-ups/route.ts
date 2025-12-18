import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for creating follow-ups
const createFollowUpSchema = z.object({
  scheduledFor: z.string().datetime('Invalid datetime format'),
  type: z.enum(['EMAIL', 'SMS', 'PHONE_CALL', 'TASK', 'REMINDER']).default('EMAIL'),
  subject: z.string().optional(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Validation schema for updating follow-ups
const updateFollowUpSchema = z.object({
  scheduledFor: z.string().datetime().optional(),
  type: z.enum(['EMAIL', 'SMS', 'PHONE_CALL', 'TASK', 'REMINDER']).optional(),
  subject: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(['PENDING', 'SENT', 'COMPLETED', 'CANCELLED', 'OVERDUE']).optional(),
  completedAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Helper function to check if user has access to inquiry
 */
async function hasInquiryAccess(userId: string, userRole: string, inquiryId: string): Promise<boolean> {
  if (userRole === 'ADMIN') {
    return true;
  }
  
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      family: { select: { userId: true } },
      home: { select: { operatorId: true } },
    },
  });
  
  if (!inquiry) {
    return false;
  }
  
  if (userRole === 'FAMILY') {
    return inquiry.family.userId === userId;
  }
  
  if (userRole === 'OPERATOR') {
    const operator = await prisma.operator.findUnique({
      where: { userId },
      select: { id: true },
    });
    return operator?.id === inquiry.home.operatorId;
  }
  
  return false;
}

/**
 * POST /api/inquiries/[id]/follow-ups - Schedule a follow-up for an inquiry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const hasAccess = await hasInquiryAccess(
      session.user.id,
      session.user.role,
      params.id
    );
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate request body
    const validationResult = createFollowUpSchema.safeParse(body);
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
    
    // Verify inquiry exists
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    
    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: 'Inquiry not found' },
        { status: 404 }
      );
    }
    
    // Parse and validate scheduledFor date
    const scheduledForDate = new Date(data.scheduledFor);
    const now = new Date();
    
    if (scheduledForDate <= now) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Scheduled time must be in the future' 
        },
        { status: 400 }
      );
    }
    
    // Create follow-up
    const followUp = await prisma.followUp.create({
      data: {
        inquiryId: params.id,
        scheduledFor: scheduledForDate,
        type: data.type,
        subject: data.subject,
        content: data.content,
        status: 'PENDING',
        metadata: data.metadata || {},
      },
    });
    
    return NextResponse.json(
      { success: true, followUp },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create follow-up',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inquiries/[id]/follow-ups - List all follow-ups for an inquiry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const hasAccess = await hasInquiryAccess(
      session.user.id,
      session.user.role,
      params.id
    );
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Build where clause
    const where: any = { inquiryId: params.id };
    if (status) {
      where.status = status;
    }
    
    // Fetch follow-ups
    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
      select: {
        id: true,
        type: true,
        scheduledFor: true,
        status: true,
        subject: true,
        content: true,
        completedAt: true,
        completedBy: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({ success: true, followUps });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch follow-ups',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inquiries/[id]/follow-ups/[followUpId] - Update a follow-up
 * Note: This would be in a separate file at /api/inquiries/[id]/follow-ups/[followUpId]/route.ts
 * but we're including the logic here for now
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const hasAccess = await hasInquiryAccess(
      session.user.id,
      session.user.role,
      params.id
    );
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const followUpId = body.followUpId;
    
    if (!followUpId) {
      return NextResponse.json(
        { success: false, error: 'Follow-up ID is required' },
        { status: 400 }
      );
    }
    
    // Validate request body
    const validationResult = updateFollowUpSchema.safeParse(body);
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
    
    // Prepare update data
    const updateData: any = {};
    
    if (data.scheduledFor) updateData.scheduledFor = new Date(data.scheduledFor);
    if (data.type) updateData.type = data.type;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'COMPLETED' || data.status === 'SENT') {
        updateData.completedAt = new Date();
        updateData.completedBy = session.user.id;
      }
    }
    if (data.completedAt) updateData.completedAt = new Date(data.completedAt);
    if (data.metadata) updateData.metadata = data.metadata;
    
    // Update follow-up
    const followUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: updateData,
    });
    
    return NextResponse.json({ success: true, followUp });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update follow-up',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
