/**
 * Push Notification Service
 * 
 * This is a minimal implementation of the push notification service
 * that provides a no-op sendPushToUser function.
 */

/**
 * Input type for sending push notifications
 */
export type PushInput = { 
  userId: string; 
  title: string; 
  body: string; 
  data?: any 
};

/**
 * Sends a push notification to a user (stub implementation)
 * 
 * @param input - The push notification input data
 * @returns A promise resolving to sent count and any errors
 */
export async function sendPushToUser(input: PushInput): Promise<{ sent: number; errors: string[] }> {
  // Log the push notification attempt (for debugging)
  console.log('[Push] Sending push notification (stub):', {
    userId: input.userId,
    title: input.title,
    // Don't log full body for brevity
    dataKeys: input.data ? Object.keys(input.data) : []
  });
  
  // Return success (no actual push notification is sent)
  return {
    sent: 1,
    errors: []
  };
}
