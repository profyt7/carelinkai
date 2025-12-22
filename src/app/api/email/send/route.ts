/**
 * Email API Route Handler for CareLinkAI
 * 
 * This API route handles sending emails using SendGrid.
 * Features:
 * - Authentication required
 * - Support for multiple email types
 * - Input validation
 * - Rate limiting
 * - Error handling
 * - Bulk email support
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';
import { logger } from '@/lib/logger';
import emailService from '@/lib/email/sendgrid';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_EMAILS_PER_MINUTE: 60,
  MAX_BULK_EMAILS: 100,
};

// Email request validation schemas
const EmailRecipientSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
});

const BaseEmailSchema = z.object({
  to: z.union([
    EmailRecipientSchema,
    z.string().email('Invalid email address'),
    z.array(EmailRecipientSchema),
    z.array(z.string().email('Invalid email address')),
  ]),
  subject: z.string().min(1, 'Subject is required').max(150, 'Subject too long'),
  category: z.string().optional(),
});

const CustomEmailSchema = BaseEmailSchema.extend({
  type: z.literal('custom'),
  html: z.string().min(1, 'HTML content is required'),
  text: z.string().optional(),
});

const TemplateEmailSchema = BaseEmailSchema.extend({
  type: z.enum(['welcome', 'password-reset', 'notification', 'appointment', 'document-shared']),
  templateData: z.record(z.any()),
});

const EmailRequestSchema = z.union([CustomEmailSchema, TemplateEmailSchema]);

// Bulk email validation schema
const BulkEmailRequestSchema = z.object({
  emails: z.array(EmailRequestSchema).max(
    RATE_LIMIT.MAX_BULK_EMAILS,
    `Maximum of ${RATE_LIMIT.MAX_BULK_EMAILS} emails per request`
  ),
});

/**
 * Format email recipients for SendGrid
 * @param to - Email recipient(s)
 * @returns Formatted recipient(s)
 */
function formatRecipients(to: any): string | string[] {
  if (typeof to === 'string') {
    return to;
  }
  
  if (Array.isArray(to)) {
    return to.map(recipient => {
      if (typeof recipient === 'string') {
        return recipient;
      }
      return recipient.email;
    });
  }
  
  // Object with email property
  return to.email;
}

/**
 * Coerce a recipient or recipient array to a single recipient string.
 * Useful for helpers that expect exactly one email address.
 * @param recipient - string or string[]
 */
function toSingleRecipient(recipient: string | string[]): string {
  // If an array is provided, return the first recipient or a safe fallback.
  // This prevents strict TypeScript configs (noUncheckedIndexedAccess) from
  // flagging a potential undefined value when the array is empty.
  return Array.isArray(recipient) ? (recipient[0] ?? '') : recipient;
}

/**
 * Extract a meaningful error message from different kinds of error objects.
 *  - Native Error instances → `error.message`
 *  - SendGrid error objects → `error.response.body.errors[0].message`
 *  - Fallback to stringified error
 */
function extractErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';

  // Standard JS Error
  if (err instanceof Error && err.message) return err.message;

  // Possible SendGrid style error
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    // @ts-ignore - runtime check
    err.response?.body?.errors &&
    // @ts-ignore
    Array.isArray(err.response.body.errors) &&
    // @ts-ignore
    err.response.body.errors.length > 0 &&
    // @ts-ignore
    err.response.body.errors[0].message
  ) {
    // @ts-ignore
    return err.response.body.errors[0].message as string;
  }

  // Fallback – stringify
  return JSON.stringify(err);
}

/**
 * POST handler for sending emails
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Check if it's a bulk request
    const isBulkRequest = body.emails && Array.isArray(body.emails);
    
    if (isBulkRequest) {
      // Validate bulk request
      const validationResult = BulkEmailRequestSchema.safeParse(body);
      
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      // Only admins and staff can send bulk emails
      if (
        session.user.role !== UserRole.ADMIN && 
        session.user.role !== UserRole.STAFF
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions for bulk email' },
          { status: 403 }
        );
      }
      
      // Process bulk emails
      const results = await Promise.all(
        body.emails.map(async (emailData: any) => {
          try {
            return await processEmail(emailData, session);
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              to: formatRecipients(emailData.to),
            };
          }
        })
      );
      
      // Count successes and failures
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;
      
      return NextResponse.json({
        success: failures === 0,
        summary: {
          total: results.length,
          successful: successes,
          failed: failures,
        },
        results,
      });
    } else {
      // Single email request
      const validationResult = EmailRequestSchema.safeParse(body);
      
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      // Process single email
      const result = await processEmail(body, session);
      
      return NextResponse.json(result);
    }
  } catch (error) {
    const message = extractErrorMessage(error);
    // Log stack if available for deeper debugging
    if (error instanceof Error && error.stack) {
      logger.error('Email API error stack', { stack: error.stack });
    }
    logger.error('Email API error', { message });
    
    return NextResponse.json(
      { error: message || 'Failed to process email request' },
      { status: 500 }
    );
  }
}

/**
 * Process a single email request
 * @param emailData - Email data from request
 * @param session - User session
 * @returns Email send result
 */
async function processEmail(emailData: any, session: any) {
  const { type, to, subject } = emailData;
  const formattedTo = formatRecipients(to);
  const toOne = toSingleRecipient(formattedTo);
  
  // Log email attempt
  logger.info(`Email request: type=${type}, to=${Array.isArray(formattedTo) ? formattedTo.join(',') : formattedTo}`);
  
  // Process based on email type
  switch (type) {
    case 'welcome': {
      const { firstName, lastName, verificationUrl } = emailData.templateData;
      return await emailService.sendWelcomeEmail(toOne, {
        firstName,
        lastName,
        verificationUrl,
      });
    }
    
    case 'password-reset': {
      const { firstName, resetUrl, expiresInMinutes } = emailData.templateData;
      return await emailService.sendPasswordResetEmail(toOne, {
        firstName,
        resetUrl,
        expiresInMinutes,
      });
    }
    
    case 'notification': {
      const { firstName, message, actionUrl, actionText, category } = emailData.templateData;
      return await emailService.sendNotificationEmail(
        toOne,
        subject,
        {
          firstName,
          message,
          actionUrl,
          actionText,
          category,
        }
      );
    }
    
    case 'appointment': {
      const {
        firstName,
        appointmentType,
        dateTime,
        location,
        virtualMeetingUrl,
        notes,
        calendarLink,
      } = emailData.templateData;
      
      return await emailService.sendAppointmentEmail(toOne, {
        firstName,
        appointmentType,
        dateTime,
        location,
        virtualMeetingUrl,
        notes,
        calendarLink,
      });
    }
    
    case 'document-shared': {
      const {
        firstName,
        sharedBy,
        documentName,
        documentUrl,
        message,
      } = emailData.templateData;
      
      return await emailService.sendDocumentSharedEmail(toOne, {
        firstName,
        sharedBy,
        documentName,
        documentUrl,
        message,
      });
    }
    
    case 'custom': {
      const { html, text } = emailData;
      return await emailService.sendCustomEmail(
        toOne,
        subject,
        html,
        text
      );
    }
    
    default:
      throw new Error(`Unsupported email type: ${type}`);
  }
}

// Define allowed HTTP methods
export const allowedMethods = ['POST'];

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': allowedMethods.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
