/**
 * SMS Service
 * 
 * This is a minimal implementation of the SMS service
 * that provides a no-op sendSms function.
 */

/**
 * Input type for sending SMS messages
 */
export type SmsInput = { 
  to: string; 
  body: string 
};

/**
 * Sends an SMS message (stub implementation)
 * 
 * @param input - The SMS input data containing recipient and message body
 * @returns A promise resolving to success status
 */
export async function sendSms(input: SmsInput): Promise<{ success: boolean; error?: string }> {
  // Log the SMS attempt (for debugging)
  console.log('[SMS] Sending SMS (stub):', {
    to: input.to,
    // Don't log full message body for privacy
    bodyLength: input.body.length
  });
  
  // Return success (no actual SMS is sent)
  return {
    success: true
  };
}
