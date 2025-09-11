/**
 * In-App Notification Service
 * 
 * This is a minimal implementation of the notifications service
 * that provides a no-op createInAppNotification function.
 */

/**
 * Input type for creating in-app notifications
 */
export type InAppNotificationInput = {
  userId: string;
  title: string;
  message: string;
  data?: any;
};

/**
 * Creates an in-app notification (stub implementation)
 * 
 * @param input - The notification input data
 * @returns A promise resolving to success status and mock ID
 */
export async function createInAppNotification(input: InAppNotificationInput): Promise<{ success: boolean; id: string }> {
  // Log the notification attempt (for debugging)
  console.log('[Notifications] Creating in-app notification (stub):', {
    userId: input.userId,
    title: input.title,
    // Don't log full message for brevity
  });
  
  // Return success with a mock ID
  return {
    success: true,
    id: `mock-notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  };
}
