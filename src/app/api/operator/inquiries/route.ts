import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, InquiryStatus, Prisma } from '@prisma/client';
import { differenceInDays, subDays, startOfWeek, endOfWeek } from 'date-fns';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Multi-status filter (comma-separated)
    const statusesParam = searchParams.get('statuses');
    const statuses: InquiryStatus[] = statusesParam 
      ? statusesParam.split(',').map(s => s.trim() as InquiryStatus)
      : [];
    
    const homeId = searchParams.get('homeId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const assignedTo = searchParams.get('assignedTo');
    const ageFilter = searchParams.get('ageFilter');
    const tourStatus = searchParams.get('tourStatus');
    const followupStatus = searchParams.get('followupStatus');
    const search = searchParams.get('search');
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    let operator = null;
    if (user.role === UserRole.OPERATOR) {
      operator = await prisma.operator.findUnique({
        where: { userId: user.id },
      });
      if (!operator) {
        return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
      }
    }

    const where: Prisma.InquiryWhereInput = {};

    // Filter by operator's homes
    if (operator) {
      where.home = { operatorId: operator.id };
    }

    // Filter by statuses (multi-select)
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }

    // Filter by home
    if (homeId) {
      where.homeId = homeId;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Filter by age
    if (ageFilter && ageFilter !== 'all') {
      const now = new Date();
      switch (ageFilter) {
        case 'new': // 0-3 days
          where.createdAt = { gte: subDays(now, 3) };
          break;
        case 'recent': // 4-7 days
          where.createdAt = {
            gte: subDays(now, 7),
            lt: subDays(now, 3),
          };
          break;
        case 'aging': // 8-14 days
          where.createdAt = {
            gte: subDays(now, 14),
            lt: subDays(now, 7),
          };
          break;
        case 'old': // 15+ days
          where.createdAt = { lt: subDays(now, 14) };
          break;
      }
    }

    // Filter by tour status
    if (tourStatus && tourStatus !== 'all') {
      switch (tourStatus) {
        case 'scheduled':
          where.status = 'TOUR_SCHEDULED';
          where.tourDate = { not: null };
          break;
        case 'completed':
          where.status = 'TOUR_COMPLETED';
          break;
        case 'none':
          where.tourDate = null;
          where.status = { notIn: ['TOUR_SCHEDULED', 'TOUR_COMPLETED'] };
          break;
      }
    }

    // Filter by follow-up status (this would require a followupDate field in the schema)
    // For now, we'll skip this as it's not in the current schema
    // TODO: Add followupDate field to Inquiry model

    // Search filter (name, email, phone, notes)
    if (search) {
      where.OR = [
        {
          family: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          family: {
            primaryContactName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          family: {
            phone: {
              contains: search,
            },
          },
        },
        {
          message: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          internalNotes: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build order by
    let orderBy: Prisma.InquiryOrderByWithRelationInput = {};
    
    switch (sortBy) {
      case 'name':
        orderBy = { family: { name: sortOrder } };
        break;
      case 'status':
        // Sort by status in pipeline order
        orderBy = { status: sortOrder };
        break;
      case 'tourDate':
        orderBy = { tourDate: sortOrder };
        break;
      case 'updatedAt':
        orderBy = { updatedAt: sortOrder };
        break;
      case 'priority':
        // Sort by age (newer = higher priority for NEW status)
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { [sortBy]: sortOrder };
    }

    // Fetch inquiries with pagination
    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          home: {
            select: { id: true, name: true },
          },
          family: {
            select: { 
              id: true, 
              name: true,
              primaryContactName: true,
              phone: true,
              emergencyPhone: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.inquiry.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      inquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
