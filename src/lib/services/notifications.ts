import type { Notification, NotificationType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publish } from '@/lib/server/sse';

/**
 * Creates an in-app notification and publishes SSE event
 */
export async function createInAppNotification(params: {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}): Promise<Notification> {
  const { userId, type = 'SYSTEM', title, message, data } = params;

  // Create notification in database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      isRead: false,
      data: data as Prisma.JsonObject,
    },
  });

  // Publish SSE event to user-specific topic
  try {
    publish(`user:${userId}`, 'notification:created', {
      notification,
    });
  } catch (error) {
    console.error('Failed to publish notification SSE event:', error);
    // Non-critical error, continue execution
  }

  return notification;
}

/**
 * Marks notifications as read (all or specific IDs)
 */
export async function markNotificationsRead(params: {
  userId: string;
  ids?: string[];
  all?: boolean;
}): Promise<{ updated: number }> {
  const { userId, ids, all } = params;
  const now = new Date();

  let updated = 0;

  if (all) {
    // Mark all unread notifications as read
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });
    updated = result.count;

    // Publish SSE event
    try {
      publish(`user:${userId}`, 'notification:updated', {
        allMarkedRead: true,
        count: updated,
      });
    } catch (error) {
      console.error('Failed to publish notification update SSE event:', error);
    }
  } else if (ids && ids.length > 0) {
    // Mark specific notifications as read
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId, // Security: ensure notifications belong to the user
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });
    updated = result.count;

    // Publish SSE event
    try {
      publish(`user:${userId}`, 'notification:updated', {
        markedRead: ids,
        count: updated,
      });
    } catch (error) {
      console.error('Failed to publish notification update SSE event:', error);
    }
  }

  return { updated };
}

/**
 * Fetches paginated notifications for a user
 */
export async function fetchNotifications(params: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const { userId, page = 1, limit = 20 } = params;
  
  // Ensure positive values
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const skip = (safePage - 1) * safeLimit;

  // Get total count
  const total = await prisma.notification.count({
    where: { userId },
  });

  // Get notifications with pagination
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: safeLimit,
  });

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    hasMore: skip + items.length < total,
  };
}
