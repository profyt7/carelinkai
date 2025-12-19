import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { afterInquiryCreated } from '@/lib/hooks/inquiry-hooks';

// Validation schema for creating inquiries
const createInquirySchema = z.object({
  familyId: z.string().optional(),
  homeId: z.string(),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional(),
  careRecipientName: z.string().min(1, 'Care recipient name is required'),
  careRecipientAge: z.number().int().positive().optional(),
  careNeeds: z.array(z.string()).optional().default([]),
  additionalInfo: z.string().optional(),
  message: z.string().optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  source: z.enum(['WEBSITE', 'PHONE', 'EMAIL', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN', 'OTHER']).optional().default('WEBSITE'),
  preferredContactMethod: z.enum(['EMAIL', 'PHONE', 'SMS', 'ANY']).optional().default('EMAIL'),
});

/**
 * POST /api/inquiries - Create a new inquiry
 * Supports both authenticated (family) and unauthenticated (public form) submissions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    
    // Validate request body
    const validationResult = createInquirySchema.safeParse(body);
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
    
    // Use authenticated user's family ID if available, otherwise use provided familyId
    const familyId = session?.user?.id ? 
      (await prisma.family.findUnique({ 
        where: { userId: session.user.id },
        select: { id: true }
      }))?.id : 
      data.familyId;
    
    if (!familyId) {
      return NextResponse.json(
        { success: false, error: 'Family ID is required for inquiry creation' },
        { status: 400 }
      );
    }
    
    // Create the inquiry
    const inquiry = await prisma.inquiry.create({
      data: {
        familyId,
        homeId: data.homeId,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        careRecipientName: data.careRecipientName,
        careRecipientAge: data.careRecipientAge,
        careNeeds: data.careNeeds,
        additionalInfo: data.additionalInfo,
        message: data.message,
        urgency: data.urgency,
        source: data.source,
        preferredContactMethod: data.preferredContactMethod,
        status: 'NEW',
      },
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
      },
    });
    
    // Trigger follow-up scheduling hook (non-blocking)
    afterInquiryCreated(inquiry.id).catch(err => {
      console.error('Failed to schedule follow-ups:', err);
    });
    
    return NextResponse.json(
      { success: true, inquiry },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create inquiry',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inquiries - List inquiries with filtering
 * Requires authentication
 * Role-based access:
 * - FAMILY: Only their own inquiries
 * - OPERATOR: Inquiries for their homes
 * - ADMIN: All inquiries
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    // Extract filter parameters
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const source = searchParams.get('source');
    const assignedTo = searchParams.get('assignedTo');
    const homeId = searchParams.get('homeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Build where clause based on role
    const where: any = {};
    
    // Role-based filtering
    if (session.user.role === 'FAMILY') {
      // Families can only see their own inquiries
      const family = await prisma.family.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      
      if (!family) {
        return NextResponse.json(
          { success: false, error: 'Family profile not found' },
          { status: 404 }
        );
      }
      
      where.familyId = family.id;
    } else if (session.user.role === 'OPERATOR') {
      // Operators can see inquiries for their homes
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id },
        include: { homes: { select: { id: true } } },
      });
      
      if (!operator) {
        return NextResponse.json(
          { success: false, error: 'Operator profile not found' },
          { status: 404 }
        );
      }
      
      where.homeId = { in: operator.homes.map(h => h.id) };
    }
    // ADMIN can see all inquiries (no additional filter)
    
    // Apply query parameter filters
    if (status) where.status = status;
    if (urgency) where.urgency = urgency;
    if (source) where.source = source;
    if (assignedTo) where.assignedToId = assignedTo;
    if (homeId) where.homeId = homeId;
    
    // Fetch inquiries with pagination
    const [inquiries, totalCount] = await Promise.all([
      prisma.inquiry.findMany({
        where,
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
          responses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              type: true,
              channel: true,
              status: true,
              sentAt: true,
              createdAt: true,
            },
          },
          followUps: {
            where: { status: 'PENDING' },
            orderBy: { scheduledFor: 'asc' },
            take: 1,
            select: {
              id: true,
              type: true,
              scheduledFor: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inquiry.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      inquiries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch inquiries',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
