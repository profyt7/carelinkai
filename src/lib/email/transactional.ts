/**
 * Transactional email helpers behind POST /api/email/send (OL-166d).
 *
 * Resend-backed replacement for the former SendGrid client: the same helper
 * API (sendEmail / sendWelcomeEmail / sendPasswordResetEmail /
 * sendNotificationEmail / sendAppointmentEmail / sendDocumentSharedEmail /
 * sendCustomEmail / validateEmailConfig) and the same from / reply-to /
 * category semantics, delivered through the ONE suppression-enforcing Resend
 * choke point in src/lib/email.ts. Nothing here sends on import.
 */

import { logger } from '../logger';
import { guardedResendSend } from '@/lib/email';

// Email configuration from environment (unchanged names / defaults), read at
// send time so a missing value only affects sending, never importing.
const emailFrom = () => process.env['EMAIL_FROM'] || 'noreply@carelinkai.com';
const emailFromName = () => process.env['EMAIL_FROM_NAME'] || 'CareLinkAI';
const emailReplyTo = () => process.env['EMAIL_REPLY_TO'] || 'support@carelinkai.com';

export interface EmailData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    content: string; // base64
    filename: string;
    type: string;
    disposition: 'attachment' | 'inline';
    contentId?: string;
  }>;
  /** Mapped to Resend tags (`category=<value>`); values are slugged to [a-z0-9_-]. */
  categories?: string[];
  customArgs?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: Error | unknown;
}

/** Resend tag values allow ASCII letters, numbers, underscores and dashes only. */
function tagValue(v: string): string {
  const slug = v.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return slug || 'general';
}

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
  const requiredVars = ['RESEND_API_KEY', 'EMAIL_FROM'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.error(`Missing required email configuration variables: ${missingVars.join(', ')}`);
    return false;
  }
  return true;
}

/**
 * Send an email through Resend (suppression-guarded).
 */
export async function sendEmail(emailData: EmailData): Promise<EmailResult> {
  if (!validateEmailConfig()) {
    return { success: false, error: new Error('Invalid email configuration') };
  }
  try {
    const to = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    const categories = emailData.categories && emailData.categories.length > 0 ? emailData.categories : ['carelinkai'];
    const { data, error } = await guardedResendSend({
      from: `${emailFromName()} <${emailFrom()}>`,
      to,
      replyTo: emailReplyTo(),
      subject: emailData.subject,
      html: emailData.html ?? '',
      ...(emailData.text ? { text: emailData.text } : {}),
      ...(emailData.attachments && emailData.attachments.length > 0
        ? {
            attachments: emailData.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.type,
              ...(a.contentId ? { contentId: a.contentId } : {}),
            })),
          }
        : {}),
      tags: categories.map((c) => ({ name: 'category', value: tagValue(c) })),
    });
    if (error) {
      logger.error('Failed to send email', { error: error.message ?? error.name ?? 'Resend error' });
      return { success: false, error: new Error(error.message ?? 'Resend error') };
    }
    logger.info(`Email sent successfully to ${to.join(', ')}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    logger.error('Failed to send email', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error };
  }
}

export async function sendWelcomeEmail(
  to: string,
  data: { firstName: string; lastName?: string; verificationUrl?: string },
): Promise<EmailResult> {
  const htmlBody = `
    <p>Hello ${data.firstName}${data.lastName ? ' ' + data.lastName : ''},</p>
    <p>Welcome to CareLinkAI! We're excited to have you on board.</p>
    ${
      data.verificationUrl
        ? `<p style="text-align:center;margin:30px 0;">
            <a href="${data.verificationUrl}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">
              Verify your email
            </a>
           </p>`
        : ''
    }
    <p>If you have any questions, simply reply to this email—we're always happy to help.</p>
    <p>Cheers,<br/>The CareLinkAI Team</p>
  `;
  return sendEmail({
    to,
    subject: 'Welcome to CareLinkAI',
    html: buildBasicHtml('Welcome to CareLinkAI', htmlBody),
    text: `Hello ${data.firstName},\n\nWelcome to CareLinkAI!${data.verificationUrl ? `\nPlease verify your email: ${data.verificationUrl}` : ''}\n\nCheers,\nThe CareLinkAI Team`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  data: { firstName: string; resetUrl: string; expiresInMinutes?: number },
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
    <p>If you didn't request a password reset, you can ignore this email.</p>
    <p>Stay safe,<br/>The CareLinkAI Team</p>
  `;
  return sendEmail({
    to,
    subject: 'Reset your CareLinkAI password',
    html: buildBasicHtml('Password Reset', htmlBody),
    text: `Hello ${data.firstName},\n\nReset your password using the link below (expires in ${
      data.expiresInMinutes || 30
    } minutes):\n${data.resetUrl}\n\nIf you didn't request this, please ignore.\n\nThe CareLinkAI Team`,
  });
}

export async function sendNotificationEmail(
  to: string,
  subject: string,
  data: { firstName: string; message: string; actionUrl?: string; actionText?: string; category?: string },
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
    categories: ['notification', (data.category || 'general').toLowerCase()],
  });
}

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
  },
): Promise<EmailResult> {
  const formattedDate =
    data.dateTime instanceof Date
      ? data.dateTime.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
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
    categories: ['appointment', 'calendar'],
  });
}

export async function sendDocumentSharedEmail(
  to: string,
  data: { firstName: string; sharedBy: string; documentName: string; documentUrl: string; message?: string },
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
    categories: ['document', 'collaboration'],
  });
}

export async function sendCustomEmail(to: string, subject: string, html: string, text?: string): Promise<EmailResult> {
  return sendEmail({
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags as fallback if text not provided
  });
}

const transactionalEmailProvider = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  sendAppointmentEmail,
  sendDocumentSharedEmail,
  sendCustomEmail,
  validateEmailConfig,
};

export default transactionalEmailProvider;
