// SMS Service using Twilio
// Note: Twilio is optional - service will gracefully handle missing configuration

let twilioClient: any = null;
let twilioInitialized = false;

/**
 * Lazy-load Twilio client to avoid build-time initialization
 */
function getTwilioClient(): any {
  if (twilioInitialized) {
    return twilioClient;
  }
  
  twilioInitialized = true;
  
  try {
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (accountSid && authToken) {
      twilioClient = twilio(accountSid, authToken);
    } else {
      console.warn('Twilio credentials not configured');
    }
  } catch (error) {
    console.warn('Twilio not configured or not installed:', error);
  }
  
  return twilioClient;
}

export class SMSService {
  /**
   * Check if SMS service is configured
   */
  isConfigured(): boolean {
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    return client !== null && fromNumber !== undefined;
  }
  
  /**
   * Get Twilio client (lazy-loaded)
   */
  private getClient(): any {
    return getTwilioClient();
  }
  
  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('SMS service not configured - Twilio credentials missing');
      return false;
    }
    
    try {
      const client = this.getClient();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      
      // Format phone number
      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedTo,
      });
      
      console.log('SMS sent:', result.sid);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }
  
  /**
   * Send follow-up SMS
   */
  async sendFollowUpSMS(
    to: string,
    contactName: string,
    inquiryId: string
  ): Promise<boolean> {
    const message = this.formatFollowUpMessage(contactName, inquiryId);
    return this.sendSMS(to, message);
  }
  
  /**
   * Format follow-up message
   */
  private formatFollowUpMessage(contactName: string, inquiryId: string): string {
    return `Hi ${contactName}, this is CareLinkAI following up on your senior care inquiry. We're here to help! Reply YES to speak with an advisor or visit carelinkai.com. Ref: ${inquiryId.slice(0, 8)}`;
  }
  
  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Add +1 for US numbers if not present
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    return phone; // Return as-is if already formatted
  }
  
  /**
   * Send tour reminder SMS
   */
  async sendTourReminder(
    to: string,
    contactName: string,
    homeName: string,
    tourDate: Date
  ): Promise<boolean> {
    const formattedDate = tourDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    
    const message = `Hi ${contactName}, this is a reminder for your tour at ${homeName} scheduled for ${formattedDate}. Looking forward to meeting you! - CareLinkAI`;
    
    return this.sendSMS(to, message);
  }
}

export const smsService = new SMSService();
