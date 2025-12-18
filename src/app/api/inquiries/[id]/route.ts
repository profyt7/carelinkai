import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for updating inquiries
const updateInquirySchema = z.object({
  status: z.enum([
    'NEW',
    'CONTACTED',
    'TOUR_SCHEDULED',
    'TOUR_COMPLETED',
    'QUALIFIED',
    'CONVERTING',
    'CONVERTED',
    'PLACEMENT_OFFERED',
    'PLACEMENT_ACCEPTED',
    'CLOSED_LOST'
  ]).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().nullable().optional(),
  internalNotes: z.string().optional(),
  tourDate: z.string().datetime().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  careRecipientName: z.string().optional(),
  careRecipientAge: z.number().int().positive().optional(),
  careNeeds: z.array(z.string()).optional(),
  additionalInfo: z.string().optional(),
  preferredContactMethod: z.enum(['EMAIL', 'PHONE', 'SMS', 'ANY']).optional(),
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
 * GET /api/inquiries/[id] - Get detailed inquiry information
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
    
    // Fetch inquiry with full details
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: {
        family: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        home: {
          select: {
            id: true,
            name: true,
            description: true,
            careLevel: true,
            address: true,
            operator: {
              select: {
                id: true,
                companyName: true,
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
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        responses: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            type: true,
            channel: true,
            status: true,
            sentBy: true,
            sentAt: true,
            subject: true,
            createdAt: true,
          },
        },
        followUps: {
          orderBy: { scheduledFor: 'asc' },
          select: {
            id: true,
            type: true,
            scheduledFor: true,
            status: true,
            subject: true,
            completedAt: true,
            completedBy: true,
            createdAt: true,
          },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            documentType: true,
            description: true,
            uploadedAt: true,
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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
    
    return NextResponse.json({ success: true, inquiry });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch inquiry',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inquiries/[id] - Update inquiry
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
    
    // Validate request body
    const validationResult = updateInquirySchema.safeParse(body);
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
    
    if (data.status) updateData.status = data.status;
    if (data.urgency) updateData.urgency = data.urgency;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.internalNotes) updateData.internalNotes = data.internalNotes;
    if (data.tourDate) updateData.tourDate = new Date(data.tourDate);
    if (data.contactName) updateData.contactName = data.contactName;
    if (data.contactEmail) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone) updateData.contactPhone = data.contactPhone;
    if (data.careRecipientName) updateData.careRecipientName = data.careRecipientName;
    if (data.careRecipientAge) updateData.careRecipientAge = data.careRecipientAge;
    if (data.careNeeds) updateData.careNeeds = data.careNeeds;
    if (data.additionalInfo) updateData.additionalInfo = data.additionalInfo;
    if (data.preferredContactMethod) updateData.preferredContactMethod = data.preferredContactMethod;
    
    // Update inquiry
    const inquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data: updateData,
      include: {
        family: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        home: {
          select: {
            id: true,
            name: true,
            operator: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json({ success: true, inquiry });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update inquiry',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
