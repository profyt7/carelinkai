/**
 * In-App Notification Service
 * 
 * This service creates real database notifications that are fetched
 * by the NotificationCenter component via /api/notifications.
 */

import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

/**
 * Input type for creating in-app notifications
 */
export type InAppNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type?: 'MESSAGE' | 'BOOKING' | 'PAYMENT' | 'COMPLIANCE' | 'SYSTEM' | 'BROADCAST' | 'ALERT' | 'ANNOUNCEMENT';
  link?: string;
  data?: Record<string, any>;
};

/**
 * Creates an in-app notification in the database
 * 
 * @param input - The notification input data
 * @returns A promise resolving to success status and notification ID
 */
export async function createInAppNotification(input: InAppNotificationInput): Promise<{ success: boolean; id: string }> {
  try {
    // Validate user exists
    const userExists = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    if (!userExists) {
      console.warn('[Notifications] User not found:', input.userId);
      return { success: false, id: '' };
    }

    // Create the notification in database
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: (input.type || 'SYSTEM') as NotificationType,
        title: input.title,
        message: input.message,
        link: input.link,
        data: input.data || {},
        isRead: false,
      },
    });

    console.log('[Notifications] Created notification:', {
      id: notification.id,
      userId: input.userId,
      type: input.type || 'SYSTEM',
      title: input.title,
    });

    return {
      success: true,
      id: notification.id,
    };
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error);
    return {
      success: false,
      id: '',
    };
  }
}

/**
 * Create notification for a new message
 */
export async function notifyNewMessage(
  userId: string,
  senderName: string,
  messagePreview: string,
  conversationId?: string
): Promise<{ success: boolean; id: string }> {
  return createInAppNotification({
    userId,
    title: `New message from ${senderName}`,
    message: messagePreview.length > 100 ? messagePreview.slice(0, 100) + '...' : messagePreview,
    type: 'MESSAGE',
    link: conversationId ? `/messages/${conversationId}` : '/messages',
    data: { senderName, conversationId },
  });
}

/**
 * Create notification for tour booking
 */
export async function notifyTourBooked(
  userId: string,
  homeName: string,
  tourDate: string,
  tourTime: string,
  tourId?: string
): Promise<{ success: boolean; id: string }> {
  return createInAppNotification({
    userId,
    title: 'Tour Scheduled',
    message: `Your tour at ${homeName} is scheduled for ${tourDate} at ${tourTime}`,
    type: 'BOOKING',
    link: tourId ? `/tours/${tourId}` : '/dashboard',
    data: { homeName, tourDate, tourTime, tourId },
  });
}

/**
 * Create notification for tour reminder
 */
export async function notifyTourReminder(
  userId: string,
  homeName: string,
  tourDate: string,
  tourTime: string,
  tourId?: string
): Promise<{ success: boolean; id: string }> {
  return createInAppNotification({
    userId,
    title: 'Upcoming Tour Reminder',
    message: `Reminder: Your tour at ${homeName} is tomorrow at ${tourTime}`,
    type: 'BOOKING',
    link: tourId ? `/tours/${tourId}` : '/dashboard',
    data: { homeName, tourDate, tourTime, tourId },
  });
}

/**
 * Create notification for inquiry status change
 */
export async function notifyInquiryStatusChange(
  userId: string,
  homeName: string,
  oldStatus: string,
  newStatus: string,
  inquiryId?: string
): Promise<{ success: boolean; id: string }> {
  return createInAppNotification({
    userId,
    title: 'Inquiry Status Updated',
    message: `Your inquiry for ${homeName} has been updated from "${oldStatus}" to "${newStatus}"`,
    type: 'ALERT',
    link: inquiryId ? `/inquiries/${inquiryId}` : '/dashboard/inquiries',
    data: { homeName, oldStatus, newStatus, inquiryId },
  });
}

/**
 * Create notification for document shared
 */
export async function notifyDocumentShared(
  userId: string,
  documentName: string,
  sharedBy: string,
  documentId?: string
): Promise<{ success: boolean; id: string }> {
  return createInAppNotification({
    userId,
    title: 'New Document Shared',
    message: `${sharedBy} shared "${documentName}" with you`,
    type: 'SYSTEM',
    link: documentId ? `/documents/${documentId}` : '/documents',
    data: { documentName, sharedBy, documentId },
  });
}

/**
 * Create system announcement notification
 */
export async function notifySystemAnnouncement(
  userId: string,
  title: string,
  message: string,
  link?: string
): Promise<{ success: boolean; id: string }> {
  return createInAppNotification({
    userId,
    title,
    message,
    type: 'ANNOUNCEMENT',
    link,
  });
}

/**
 * Create broadcast notification to multiple users
 */
export async function createBroadcastNotification(
  userIds: string[],
  title: string,
  message: string,
  link?: string
): Promise<{ success: boolean; count: number }> {
  try {
    const results = await Promise.allSettled(
      userIds.map(userId =>
        createInAppNotification({
          userId,
          title,
          message,
          type: 'BROADCAST',
          link,
        })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    console.log(`[Notifications] Broadcast sent: ${successCount}/${userIds.length} successful`);

    return {
      success: successCount > 0,
      count: successCount,
    };
  } catch (error) {
    console.error('[Notifications] Broadcast failed:', error);
    return { success: false, count: 0 };
  }
}
