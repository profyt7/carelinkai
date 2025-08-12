/**
 * SendGrid Email Service for CareLinkAI
 * 
 * This service provides email functionality using SendGrid, including:
 * - Core email sending with HTML/text content
 * - Template-based emails
 * - Helper functions for common email types
 */

import sgMail from '@sendgrid/mail';
import { logger } from '../logger';

// Initialize SendGrid with API key from environment
if (!process.env.SENDGRID_API_KEY) {
  logger.warn('SENDGRID_API_KEY is not defined. Email functionality will not work.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email configuration from environment
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@carelinkai.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'CareLinkAI';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@carelinkai.com';

// Types for email templates and options
export interface EmailData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: 'attachment' | 'inline';
    contentId?: string;
  }>;
  categories?: string[];
  customArgs?: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: Error | unknown;
}

// Available email templates
export const EmailTemplates = {
  WELCOME: {
    id: 'd-welcome-template-id', // Replace with actual SendGrid template ID
    name: 'welcome',
    description: 'Welcome email for new users'
  },
  PASSWORD_RESET: {
    id: 'd-password-reset-template-id', // Replace with actual SendGrid template ID
    name: 'password-reset',
    description: 'Password reset email'
  },
  NOTIFICATION: {
    id: 'd-notification-template-id', // Replace with actual SendGrid template ID
    name: 'notification',
    description: 'General notification email'
  },
  APPOINTMENT_CONFIRMATION: {
    id: 'd-appointment-confirmation-template-id', // Replace with actual SendGrid template ID
    name: 'appointment-confirmation',
    description: 'Appointment confirmation email'
  },
  DOCUMENT_SHARED: {
    id: 'd-document-shared-template-id', // Replace with actual SendGrid template ID
    name: 'document-shared',
    description: 'Document shared notification'
  }
} as const;

/**
 * Build a very simple branded HTML email wrapper.
 * @param title Heading for the email
 * @param body Main HTML body string (already escaped / trusted)
 */
function buildBasicHtml(title: string, body: string) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f7f7f7; padding:30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#2563eb;padding:20px 30px;color:#ffffff;text-align:center;">
          <h1 style="margin:0;font-size:24px;">CareLinkAI</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:30px;">
          <h2 style="font-size:20px;margin:0 0 15px 0;color:#111111;">${title}</h2>
          ${body}
        </td>
      </tr>
      <tr>
        <td style="background:#fafafa;padding:20px 30px;text-align:center;font-size:12px;color:#777777;">
          © ${new Date().getFullYear()} CareLinkAI. All rights reserved.
        </td>
      </tr>
    </table>
  </div>
  `;
}

/**
 * Validate email configuration
 * @returns {boolean} True if configuration is valid
 */
export function validateEmailConfig(): boolean {
  const requiredVars = ['SENDGRID_API_KEY', 'EMAIL_FROM'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`Missing required email configuration variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * Send an email using SendGrid
 * @param {EmailData} emailData - The email data
 * @returns {Promise<EmailResult>} Result of the send operation
 */
export async function sendEmail(emailData: EmailData): Promise<EmailResult> {
  // Validate configuration
  if (!validateEmailConfig()) {
    return { 
      success: false, 
      error: new Error('Invalid email configuration') 
    };
  }

  try {
    // Prepare the message
    const msg = {
      to: emailData.to,
      from: {
        email: EMAIL_FROM,
        name: EMAIL_FROM_NAME
      },
      replyTo: EMAIL_REPLY_TO,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      templateId: emailData.templateId,
      dynamicTemplateData: emailData.dynamicTemplateData,
      attachments: emailData.attachments,
      categories: emailData.categories || ['carelinkai'],
      customArgs: emailData.customArgs
    };

    // Send the email
    const [response] = await sgMail.send(msg);
    
    logger.info(`Email sent successfully to ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}`);
    
    return {
      success: true,
      messageId: response.headers['x-message-id']
    };
  } catch (error) {
    logger.error('Failed to send email:', error);
    return {
      success: false,
      error
    };
  }
}

/**
 * Send a welcome email to a new user
 * @param {string} to - Recipient email
 * @param {object} data - Template data including user's name
 * @returns {Promise<EmailResult>} Result of the send operation
 */
export async function sendWelcomeEmail(
  to: string, 
  data: { firstName: string; lastName?: string; verificationUrl?: string }
): Promise<EmailResult> {
  const htmlBody = `
    <p>Hello ${data.firstName}${data.lastName ? ' ' + data.lastName : ''},</p>
    <p>Welcome to CareLinkAI! We’re excited to have you on board.</p>
    ${
      data.verificationUrl
        ? `<p style="text-align:center;margin:30px 0;">
            <a href="${data.verificationUrl}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">
              Verify your email
            </a>
           </p>`
        : ''
    }
    <p>If you have any questions, simply reply to this email—we’re always happy to help.</p>
    <p>Cheers,<br/>The CareLinkAI Team</p>
  `;
  return sendEmail({
    to,
    subject: 'Welcome to CareLinkAI',
    html: buildBasicHtml('Welcome to CareLinkAI', htmlBody),
    text: `Hello ${data.firstName},\n\nWelcome to CareLinkAI!${data.verificationUrl ? `\nPlease verify your email: ${data.verificationUrl}` : ''}\n\nCheers,\nThe CareLinkAI Team`
  });
}

/**
 * Send a password reset email
 * @param {string} to - Recipient email
 * @param {object} data - Template data including reset token/URL
 * @returns {Promise<EmailResult>} Result of the send operation
 */
export async function sendPasswordResetEmail(
  to: string, 
  data: { firstName: string; resetUrl: string; expiresInMinutes?: number }
): Promise<EmailResult> {
  const htmlBody = `
    <p>Hello ${data.firstName},</p>
    <p>We received a request to reset your CareLinkAI password.</p>
    <p style="text-align:center;margin:30px 0;">
      <a href="${data.resetUrl}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">
        Reset Password
      </a>
    </p>
    <p>This link will expire in ${data.expiresInMinutes || 30} minutes.</p>
    <p>If you didn’t request a password reset, you can ignore this email.</p>
    <p>Stay safe,<br/>The CareLinkAI Team</p>
  `;
  return sendEmail({
    to,
    subject: 'Reset your CareLinkAI password',
    html: buildBasicHtml('Password Reset', htmlBody),
    text: `Hello ${data.firstName},\n\nReset your password using the link below (expires in ${
      data.expiresInMinutes || 30
    } minutes):\n${data.resetUrl}\n\nIf you didn’t request this, please ignore.\n\nThe CareLinkAI Team`
  });
}

/**
 * Send a notification email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {object} data - Template data including notification details
 * @returns {Promise<EmailResult>} Result of the send operation
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  data: { 
    firstName: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    category?: string;
  }
): Promise<EmailResult> {
  const htmlBody = `
    <p>Hello ${data.firstName},</p>
    <p>${data.message}</p>
    ${
      data.actionUrl
        ? `<p style="text-align:center;margin:30px 0;">
             <a href="${data.actionUrl}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">
               ${data.actionText || 'View Details'}
             </a>
           </p>`
        : ''
    }
    <p>Best regards,<br/>The CareLinkAI Team</p>
  `;
  return sendEmail({
    to,
    subject,
    html: buildBasicHtml('Notification', htmlBody),
    text: `Hello ${data.firstName},\n\n${data.message}\n${
      data.actionUrl ? `\n${data.actionText || 'View Details'}: ${data.actionUrl}` : ''
    }\n\nBest regards,\nThe CareLinkAI Team`,
    categories: ['notification', (data.category || 'general').toLowerCase()]
  });
}

/**
 * Send an appointment confirmation email
 * @param {string} to - Recipient email
 * @param {object} data - Template data including appointment details
 * @returns {Promise<EmailResult>} Result of the send operation
 */
export async function sendAppointmentEmail(
  to: string,
  data: {
    firstName: string;
    appointmentType: string;
    dateTime: string | Date;
    location?: string;
    virtualMeetingUrl?: string;
    notes?: string;
    calendarLink?: string;
  }
): Promise<EmailResult> {
  // Format date if it's a Date object
  const formattedDate = data.dateTime instanceof Date 
    ? data.dateTime.toLocaleString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : data.dateTime;

  const htmlBody = `
    <p>Hello ${data.firstName},</p>
    <p>This is a confirmation for your <strong>${data.appointmentType}</strong> appointment.</p>
    <ul style="padding-left:20px;">
      <li><strong>Date & Time:</strong> ${formattedDate}</li>
      ${data.location ? `<li><strong>Location:</strong> ${data.location}</li>` : ''}
      ${
        data.virtualMeetingUrl
          ? `<li><strong>Virtual Meeting:</strong> <a href="${data.virtualMeetingUrl}">${data.virtualMeetingUrl}</a></li>`
          : ''
      }
    </ul>
    ${data.notes ? `<p><em>${data.notes}</em></p>` : ''}
    ${
      data.calendarLink
        ? `<p style="text-align:center;margin:30px 0;">
             <a href="${data.calendarLink}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">
               Add to Calendar
             </a>
           </p>`
        : ''
    }
    <p>We look forward to seeing you.</p>
    <p>Regards,<br/>The CareLinkAI Team</p>
  `;
  return sendEmail({
    to,
    subject: `Your ${data.appointmentType} appointment confirmation`,
    html: buildBasicHtml('Appointment Confirmation', htmlBody),
    text: `Hello ${data.firstName},\n\nThis is a confirmation for your ${data.appointmentType} appointment.\nDate & Time: ${formattedDate}${
      data.location ? `\nLocation: ${data.location}` : ''
    }${data.virtualMeetingUrl ? `\nVirtual Meeting: ${data.virtualMeetingUrl}` : ''}\n\n${
      data.notes ? data.notes + '\n\n' : ''
    }${data.calendarLink ? `Add to calendar: ${data.calendarLink}\n\n` : ''}Regards,\nCareLinkAI Team`,
    categories: ['appointment', 'calendar']
  });
}

/**
 * Send a document shared notification email
 * @param {string} to - Recipient email
 * @param {object} data - Template data including document details
 * @returns {Promise<EmailResult>} Result of the send operation
 */
export async function sendDocumentSharedEmail(
  to: string,
  data: {
    firstName: string;
    sharedBy: string;
    documentName: string;
    documentUrl: string;
    message?: string;
  }
): Promise<EmailResult> {
  const htmlBody = `
    <p>Hello ${data.firstName},</p>
    <p><strong>${data.sharedBy}</strong> has shared a document with you.</p>
    <p style="text-align:center;margin:30px 0;">
      <a href="${data.documentUrl}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">
        View "${data.documentName}"
      </a>
    </p>
    ${data.message ? `<p><em>${data.message}</em></p>` : ''}
    <p>Best regards,<br/>The CareLinkAI Team</p>
  `;
  return sendEmail({
    to,
    subject: `${data.sharedBy} shared "${data.documentName}" with you`,
    html: buildBasicHtml('Document Shared', htmlBody),
    text: `Hello ${data.firstName},\n\n${data.sharedBy} has shared a document "${data.documentName}" with you.\nView: ${data.documentUrl}\n\n${
      data.message ? data.message + '\n\n' : ''
    }Best regards,\nThe CareLinkAI Team`,
    categories: ['document', 'collaboration']
  });
}

/**
 * Send a custom HTML email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content (fallback)
 * @returns {Promise<EmailResult>} Result of the send operation
 */
export async function sendCustomEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags as fallback if text not provided
  });
}

// Export the email service
export default {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  sendAppointmentEmail,
  sendDocumentSharedEmail,
  sendCustomEmail,
  validateEmailConfig,
  EmailTemplates
};
