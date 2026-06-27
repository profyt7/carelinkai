// SMS Service using Twilio
// Twilio is optional — all methods fail silently if credentials are missing.

let twilioClient: any = null;
let twilioInitialized = false;

function getTwilioClient(): any {
  if (twilioInitialized) return twilioClient;
  twilioInitialized = true;
  try {
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (accountSid && authToken) {
      twilioClient = twilio(accountSid, authToken);
    } else {
      console.warn('[SMS] Twilio credentials not configured');
    }
  } catch (error) {
    console.warn('[SMS] Twilio not available:', error);
  }
  return twilioClient;
}

export class SMSService {
  isConfigured(): boolean {
    return getTwilioClient() !== null && !!process.env.TWILIO_PHONE_NUMBER;
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('[SMS] Not configured — skipping message to', to);
      return false;
    }
    try {
      const result = await getTwilioClient().messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: this.formatPhoneNumber(to),
      });
      console.log('[SMS] Sent:', result.sid);
      return true;
    } catch (error) {
      console.error('[SMS] Send failed:', error);
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return phone;
  }

  // ── Operator: new inquiry received ────────────────────────────────────────
  async sendNewInquiryAlert(
    to: string,
    operatorFirstName: string,
    familyName: string,
    recipientName: string,
    homeName: string
  ): Promise<boolean> {
    const msg = `Hi ${operatorFirstName}, new inquiry on CareLinkAI! ${familyName} is looking for care for ${recipientName} at ${homeName}. Log in to respond: getcarelinkai.com/operator/inquiries`;
    return this.sendSMS(to, msg);
  }

  // ── Operator: tour booked ──────────────────────────────────────────────────
  async sendTourBookedAlert(
    to: string,
    operatorFirstName: string,
    familyName: string,
    homeName: string
  ): Promise<boolean> {
    const msg = `Hi ${operatorFirstName}, ${familyName} has requested a tour at ${homeName}. Log in to confirm a time: getcarelinkai.com/operator/tours`;
    return this.sendSMS(to, msg);
  }

  // ── Family: inquiry response received ─────────────────────────────────────
  async sendInquiryResponseReceived(
    to: string,
    familyFirstName: string,
    homeName: string
  ): Promise<boolean> {
    const msg = `Hi ${familyFirstName}, ${homeName} has responded to your care inquiry on CareLinkAI. Log in to read their message: getcarelinkai.com/family/inquiries`;
    return this.sendSMS(to, msg);
  }

  // ── Family: tour reminder 24hr before ─────────────────────────────────────
  async sendTourReminder(
    to: string,
    familyFirstName: string,
    homeName: string,
    tourDate: Date
  ): Promise<boolean> {
    const formatted = tourDate.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
    const msg = `Hi ${familyFirstName}, reminder: your tour at ${homeName} is tomorrow — ${formatted}. See you then! - CareLinkAI`;
    return this.sendSMS(to, msg);
  }

  // ── Operator: payment failed ───────────────────────────────────────────────
  async sendPaymentFailedAlert(
    to: string,
    operatorFirstName: string
  ): Promise<boolean> {
    const msg = `Hi ${operatorFirstName}, your CareLinkAI subscription payment failed. Update your billing to keep access: getcarelinkai.com/operator/billing`;
    return this.sendSMS(to, msg);
  }

  // ── Operator (UNCLAIMED listing): inquiry→claim nudge (OL-083) ─────────────
  // HIPAA: generic only — names the facility + a generic "family is trying to
  // reach you", never inquiry/health details. The claim link IS the CTA.
  async sendInquiryClaimNudge(
    to: string,
    facilityName: string,
    claimUrl: string
  ): Promise<boolean> {
    const msg = `A family is trying to reach ${facilityName} on CareLinkAI. Claim your free listing (~2 min) to respond securely: ${claimUrl}`;
    return this.sendSMS(to, msg);
  }

  // ── Operator (UNCLAIMED listing): TOUR→claim nudge — hottest lead, urgent copy ──
  async sendTourClaimNudge(
    to: string,
    facilityName: string,
    claimUrl: string
  ): Promise<boolean> {
    const msg = `A family wants to TOUR ${facilityName} on CareLinkAI. Claim your free listing (~2 min) to confirm the visit: ${claimUrl}`;
    return this.sendSMS(to, msg);
  }

  // Legacy — kept for backward compatibility
  async sendFollowUpSMS(to: string, contactName: string, inquiryId: string): Promise<boolean> {
    const msg = `Hi ${contactName}, this is CareLinkAI following up on your senior care inquiry. We're here to help! Reply YES to speak with an advisor or visit carelinkai.com. Ref: ${inquiryId.slice(0, 8)}`;
    return this.sendSMS(to, msg);
  }
}

export const smsService = new SMSService();
