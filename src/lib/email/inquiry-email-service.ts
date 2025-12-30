import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class InquiryEmailService {
  private resend: Resend | null = null;
  
  /**
   * Lazy-load Resend client to avoid build-time initialization
   */
  private getResend(): Resend {
    if (!this.resend) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }
      this.resend = new Resend(apiKey);
    }
    return this.resend;
  }
  
  /**
   * Send inquiry response email
   */
  async sendInquiryResponse(
    to: string,
    contactName: string,
    content: string,
    inquiryId: string
  ): Promise<boolean> {
    try {
      const html = this.formatResponseEmail(contactName, content, inquiryId);
      const text = this.stripHtml(content);
      
      const resend = this.getResend();
      const from = process.env.RESEND_FROM_EMAIL || 'noreply@carelinkai.com';
      
      await resend.emails.send({
        from: `CareLinkAI <${from}>`,
        to,
        subject: 'Thank you for your inquiry - CareLinkAI',
        html,
        text,
      });
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }
  
  /**
   * Format email with HTML template
   */
  private formatResponseEmail(
    contactName: string,
    content: string,
    inquiryId: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareLinkAI Response</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin: 0;">CareLinkAI</h1>
    <p style="color: #7f8c8d; margin: 5px 0 0 0;">Finding the Perfect Care for Your Loved Ones</p>
  </div>
  
  <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
    <p style="margin-top: 0;">Dear ${contactName},</p>
    
    <div style="white-space: pre-wrap;">${content}</div>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 14px; color: #7f8c8d;">
      <strong>Need immediate assistance?</strong><br>
      Call us at: (555) 123-4567<br>
      Email: support@carelinkai.com<br>
      Visit: <a href="https://carelinkai.onrender.com" style="color: #3498db;">carelinkai.onrender.com</a>
    </p>
    
    <p style="font-size: 12px; color: #95a5a6; margin-top: 20px;">
      Reference ID: ${inquiryId}<br>
      This email was sent in response to your inquiry on CareLinkAI.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #95a5a6;">
    <p>&copy; 2025 CareLinkAI. All rights reserved.</p>
  </div>
</body>
</html>
    `;
  }
  
  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}

// Export singleton instance
export const inquiryEmailService = new InquiryEmailService();
