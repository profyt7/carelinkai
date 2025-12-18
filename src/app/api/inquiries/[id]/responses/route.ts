import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for creating inquiry responses
const createResponseSchema = z.object({
  content: z.string().min(1, 'Response content is required'),
  type: z.enum(['AI_GENERATED', 'MANUAL', 'AUTOMATED', 'TEMPLATE']).default('MANUAL'),
  channel: z.enum(['EMAIL', 'SMS', 'PHONE', 'IN_APP']).default('EMAIL'),
  subject: z.string().optional(),
  toAddress: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  sendImmediately: z.boolean().default(false),
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
 * POST /api/inquiries/[id]/responses - Create a response to an inquiry
 * This endpoint creates a response record and optionally sends it via the specified channel
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
    const validationResult = createResponseSchema.safeParse(body);
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
    });
    
    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: 'Inquiry not found' },
        { status: 404 }
      );
    }
    
    // Determine status based on sendImmediately flag
    const status = data.sendImmediately ? 'SENT' : 'DRAFT';
    const sentAt = data.sendImmediately ? new Date() : null;
    
    // Determine recipient address
    let toAddress = data.toAddress;
    if (!toAddress) {
      if (data.channel === 'EMAIL' || data.channel === 'IN_APP') {
        toAddress = inquiry.contactEmail || inquiry.family.user.email;
      } else if (data.channel === 'SMS' || data.channel === 'PHONE') {
        toAddress = inquiry.contactPhone || inquiry.family.user.phone || undefined;
      }
    }
    
    // Create response record
    const response = await prisma.inquiryResponse.create({
      data: {
        inquiryId: params.id,
        content: data.content,
        type: data.type,
        channel: data.channel,
        subject: data.subject,
        toAddress,
        status,
        sentBy: session.user.id,
        sentAt,
        metadata: data.metadata || {},
      },
    });
    
    // TODO: In Phase 2, integrate with actual email/SMS sending services
    // For now, we just create the record
    if (data.sendImmediately) {
      console.log(`[Inquiry Response] Would send ${data.channel} to ${toAddress}`);
      console.log(`Subject: ${data.subject || 'No subject'}`);
      console.log(`Content: ${data.content.substring(0, 100)}...`);
    }
    
    // Update inquiry status to CONTACTED if this is the first response
    const responseCount = await prisma.inquiryResponse.count({
      where: { inquiryId: params.id },
    });
    
    if (responseCount === 1 && inquiry.status === 'NEW') {
      await prisma.inquiry.update({
        where: { id: params.id },
        data: { status: 'CONTACTED' },
      });
    }
    
    return NextResponse.json(
      { 
        success: true, 
        response,
        message: data.sendImmediately 
          ? 'Response sent successfully' 
          : 'Response draft created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inquiry response:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inquiries/[id]/responses - List all responses for an inquiry
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
    
    // Fetch responses
    const responses = await prisma.inquiryResponse.findMany({
      where: { inquiryId: params.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        type: true,
        channel: true,
        status: true,
        subject: true,
        toAddress: true,
        sentBy: true,
        sentAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({ success: true, responses });
  } catch (error) {
    console.error('Error fetching inquiry responses:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch responses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
