import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction, NotificationType } from '@prisma/client';

const createNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['MESSAGE', 'BOOKING', 'PAYMENT', 'COMPLIANCE', 'SYSTEM', 'BROADCAST', 'ALERT', 'ANNOUNCEMENT']),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  link: z.string().optional(),
});

// GET - List notifications (admin view of all system notifications or user's notifications)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const isRead = searchParams.get('isRead');

    const whereClause: any = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (type) {
      whereClause.type = type as NotificationType;
    }

    if (isRead !== null && isRead !== undefined) {
      whereClause.isRead = isRead === 'true';
    }

    const [notifications, total, typeStats] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.groupBy({
        by: ['type'],
        _count: { id: true },
        where: userId ? { userId } : {},
      }),
    ]);

    // Format type stats
    const typeStatsFormatted = typeStats.map(item => ({
      type: item.type,
      count: item._count.id,
    }));

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      typeStats: typeStatsFormatted,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST - Create a notification for a specific user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId, type, title, message, link } = validation.data;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create the notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as NotificationType,
        title,
        message,
        link,
      },
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
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      session.user.id,
      AuditAction.CREATE,
      'NOTIFICATION',
      notification.id,
      `Admin created ${type} notification for ${user.firstName} ${user.lastName}: ${title}`
    );

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notifications (bulk or single)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');

    let deleteCount = 0;

    if (id) {
      // Delete single notification
      await prisma.notification.delete({
        where: { id },
      });
      deleteCount = 1;
    } else if (ids) {
      // Delete multiple notifications
      const idArray = ids.split(',');
      const result = await prisma.notification.deleteMany({
        where: { id: { in: idArray } },
      });
      deleteCount = result.count;
    } else {
      return NextResponse.json(
        { error: 'No notification ID(s) provided' },
        { status: 400 }
      );
    }

    // Create audit log
    await createAuditLogFromRequest(
      request,
      session.user.id,
      AuditAction.DELETE,
      'NOTIFICATION',
      id || 'bulk',
      `Admin deleted ${deleteCount} notification(s)`
    );

    return NextResponse.json({
      success: true,
      deletedCount: deleteCount,
    });
  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification(s)' },
      { status: 500 }
    );
  }
}
