export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch current user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const whereClause: any = {
      userId: session.user.id,
    };

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          link: true,
          data: true,
          createdAt: true,
          readAt: true,
        },
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);

    // Format notifications for the frontend
    const formattedNotifications = notifications.map(n => ({
      id: n.id,
      type: mapNotificationType(n.type),
      title: n.title,
      message: n.message,
      timestamp: n.createdAt.toISOString(),
      isRead: n.isRead,
      priority: getPriorityFromType(n.type),
      link: n.link || undefined,
      metadata: n.data as Record<string, any> || {},
    }));

    return NextResponse.json({
      notifications: formattedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // Mark all user's notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id, // Ensure user owns these notifications
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Either notificationIds array or markAll flag is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      // Delete all user's notifications
      const result = await prisma.notification.deleteMany({
        where: { userId: session.user.id },
      });
      return NextResponse.json({ success: true, deletedCount: result.count });
    } else if (id) {
      // Delete single notification
      await prisma.notification.delete({
        where: {
          id,
          userId: session.user.id, // Ensure user owns this notification
        },
      });
      return NextResponse.json({ success: true, deletedCount: 1 });
    } else {
      return NextResponse.json(
        { error: 'Either id or clearAll parameter is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification(s)' },
      { status: 500 }
    );
  }
}

// Helper: Map database NotificationType to frontend type
function mapNotificationType(dbType: string): string {
  const typeMap: Record<string, string> = {
    'MESSAGE': 'MESSAGE',
    'BOOKING': 'TOUR_REMINDER',
    'PAYMENT': 'STATUS_CHANGE',
    'COMPLIANCE': 'SYSTEM',
    'SYSTEM': 'SYSTEM',
    'BROADCAST': 'SYSTEM',
    'ALERT': 'STATUS_CHANGE',
    'ANNOUNCEMENT': 'SYSTEM',
  };
  return typeMap[dbType] || 'SYSTEM';
}

// Helper: Get priority from notification type
function getPriorityFromType(dbType: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const highPriority = ['ALERT', 'BOOKING', 'COMPLIANCE'];
  const mediumPriority = ['MESSAGE', 'PAYMENT'];
  
  if (highPriority.includes(dbType)) return 'HIGH';
  if (mediumPriority.includes(dbType)) return 'MEDIUM';
  return 'LOW';
}
