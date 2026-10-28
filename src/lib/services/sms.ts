/**
 * SMS Service
 * 
 * This is a minimal implementation of the SMS service
 * that provides a no-op sendSms function.
 */

import { checkSmsConsent, maskSmsNumber } from '@/lib/consent/sms-consent-gate';

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
  // OL-193: the consent gate applies even though this stub sends nothing.
  const consent = await checkSmsConsent(input.to);
  if (!consent.ok) {
    console.warn('[SMS] skipped (stub)', { reason: consent.reason, to: maskSmsNumber(input.to) });
    return { success: false, error: consent.reason };
  }

  // Log the SMS attempt (for debugging)
  console.log('[SMS] Sending SMS (stub):', {
    to: maskSmsNumber(input.to),
    // Don't log full message body for privacy
    bodyLength: input.body.length
  });
  
  // Return success (no actual SMS is sent)
  return {
    success: true
  };
}
