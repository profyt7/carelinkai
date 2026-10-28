// Admin Inquiries API - Full CRUD with filtering
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, InquiryStatus, InquiryUrgency, InquirySource, Prisma } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Filter parameters
    const status = searchParams.get('status');
    const statuses = searchParams.get('statuses'); // comma-separated
    const urgency = searchParams.get('urgency');
    const source = searchParams.get('source');
    const homeId = searchParams.get('homeId');
    const operatorId = searchParams.get('operatorId');
    const assignedTo = searchParams.get('assignedTo');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const converted = searchParams.get('converted');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: Prisma.InquiryWhereInput = {};

    // Status filters
    if (statuses) {
      where.status = { in: statuses.split(',').map(s => s.trim() as InquiryStatus) };
    } else if (status) {
      where.status = status as InquiryStatus;
    }

    // Urgency filter
    if (urgency && urgency !== 'all') {
      where.urgency = urgency as InquiryUrgency;
    }

    // Source filter
    if (source && source !== 'all') {
      where.source = source as InquirySource;
    }

    // Home filter
    if (homeId) {
      where.homeId = homeId;
    }

    // Operator filter
    if (operatorId) {
      where.home = { operatorId };
    }

    // Assigned to filter
    if (assignedTo === 'unassigned') {
      where.assignedToId = null;
    } else if (assignedTo && assignedTo !== 'all') {
      where.assignedToId = assignedTo;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Conversion filter
    if (converted === 'true') {
      where.convertedToResidentId = { not: null };
    } else if (converted === 'false') {
      where.convertedToResidentId = null;
    }

    // Search filter
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search, mode: 'insensitive' } },
        { careRecipientName: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { home: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy
    const orderBy: Prisma.InquiryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count
    const total = await prisma.inquiry.count({ where });

    // Get inquiries with relations
    const inquiries = await prisma.inquiry.findMany({
      where,
      include: {
        home: {
          select: {
            id: true,
            name: true,
            address: {
              select: {
                city: true,
                state: true,
              },
            },
            operator: {
              select: {
                id: true,
                companyName: true,
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        family: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        convertedResident: {
          select: { id: true, firstName: true, lastName: true },
        },
        followUps: {
          where: { status: 'PENDING' },
          select: { id: true, scheduledFor: true, type: true },
          orderBy: { scheduledFor: 'asc' },
          take: 1,
        },
        _count: {
          select: { documents: true, responses: true, followUps: true },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get statistics
    const stats = await prisma.inquiry.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const urgencyStats = await prisma.inquiry.groupBy({
      by: ['urgency'],
      _count: { id: true },
    });

    return NextResponse.json({
      inquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        byStatus: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count.id }), {}),
        byUrgency: urgencyStats.reduce((acc, u) => ({ ...acc, [u.urgency || 'MEDIUM']: u._count.id }), {}),
      },
    });
  } catch (error) {
    console.error('Admin inquiries fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inquiries' },
      { status: 500 }
    );
  }
}
