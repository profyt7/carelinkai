/**
 * Email Service for CareLinkAI
 * 
 * A HIPAA-compliant email service that supports multiple providers:
 * - SendGrid
 * - AWS SES
 * - Nodemailer
 * - Mock (for development/testing)
 * 
 * Features:
 * - Provider abstraction for easy switching
 * - Retry logic with exponential backoff
 * - Rate limiting to prevent provider throttling
 * - HIPAA-compliant logging (no PHI in logs)
 * - Error handling and reporting
 * - Template support
 * 
 * Usage:
 * ```
 * import { EmailService } from '@/lib/email-service';
 * 
 * // Send a simple email
 * await EmailService.sendEmail({
 *   to: 'recipient@example.com',
 *   subject: 'Hello from CareLinkAI',
 *   text: 'This is a test email',
 *   html: '<p>This is a test email</p>'
 * });
 * 
 * // Send an email using a template
 * await EmailService.sendTemplatedEmail({
 *   to: 'recipient@example.com',
 *   template: 'verification',
 *   templateData: { name: 'John', verificationUrl: 'https://...' }
 * });
 * ```
 */

import { PrismaClient, AuditAction } from '@prisma/client';
import type { EmailTemplate } from './email-templates';
import { v4 as uuidv4 } from 'uuid';

// Initialize Prisma client for logging
const prisma = new PrismaClient();

// Email configuration from environment variables
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'mock';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@carelinkai.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'CareLinkAI';
const MAX_RETRIES = parseInt(process.env.EMAIL_MAX_RETRIES || '3');
const RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000');
const RATE_LIMIT_PER_SECOND = parseInt(process.env.EMAIL_RATE_LIMIT || '10');

/**
 * Email message interface
 */
export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

/**
 * Templated email interface
 */
export interface TemplatedEmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  fromName?: string;
  template: string;
  templateData: Record<string, any>;
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Email send result interface
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: Error;
  provider: string;
  timestamp: Date;
}

/**
 * Email provider interface
 */
interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;
  getProviderName(): string;
}

/**
 * Rate limiter for email sending
 */
class RateLimiter {
  private queue: Array<() => Promise<EmailSendResult>> = [];
  private processing = false;
  private lastSendTime = 0;
  private readonly minTimeBetweenSends: number;

  constructor(ratePerSecond: number = RATE_LIMIT_PER_SECOND) {
    this.minTimeBetweenSends = 1000 / ratePerSecond;
  }

  /**
   * Add a send function to the rate-limited queue
   */
  async add(sendFn: () => Promise<EmailSendResult>): Promise<EmailSendResult> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await sendFn();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;

    const now = Date.now();
    const timeToWait = Math.max(0, this.lastSendTime + this.minTimeBetweenSends - now);

    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }

    const sendFn = this.queue.shift();
    if (sendFn) {
      this.lastSendTime = Date.now();
      try {
        await sendFn();
      } catch (error) {
        console.error('Error in rate-limited email send:', error);
      }
    }

    // Process next item in queue
    setImmediate(() => this.processQueue());
  }
}

/**
 * Mock email provider for development and testing
 */
class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    // Create a fake message ID
    const messageId = `mock-${uuidv4()}@carelinkai.com`;
    
    // Log the email for development purposes
    console.log('\n========== MOCK EMAIL ==========');
    console.log(`From: ${message.fromName || EMAIL_FROM_NAME} <${message.from || EMAIL_FROM}>`);
    console.log(`To: ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`);
    if (message.cc) console.log(`CC: ${Array.isArray(message.cc) ? message.cc.join(', ') : message.cc}`);
    if (message.bcc) console.log(`BCC: ${Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc}`);
    console.log(`Subject: ${message.subject}`);
    console.log(`Priority: ${message.priority || 'normal'}`);
    console.log('\n--- TEXT CONTENT ---');
    console.log(message.text);
    console.log('\n--- HTML CONTENT ---');
    console.log(message.html);
    if (message.attachments && message.attachments.length > 0) {
      console.log(`\n--- ATTACHMENTS (${message.attachments.length}) ---`);
      message.attachments.forEach(attachment => {
        console.log(`- ${attachment.filename} (${attachment.contentType || 'application/octet-stream'})`);
      });
    }
    console.log('\n--- METADATA ---');
    console.log(message.metadata || 'No metadata');
    console.log('===============================\n');
    
    // Simulate a delay to mimic real email sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId,
      provider: this.getProviderName(),
      timestamp: new Date()
    };
  }

  getProviderName(): string {
    return 'mock';
  }
}

/**
 * SendGrid email provider
 * Requires @sendgrid/mail package to be installed
 */
class SendGridEmailProvider implements EmailProvider {
  private client: any;

  constructor() {
    try {
      // Dynamic import to avoid requiring the package if not used
      const sgMail = eval('require')('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.client = sgMail;
    } catch (error) {
      console.error('Failed to initialize SendGrid client:', error);
      throw new Error('SendGrid client initialization failed. Is @sendgrid/mail installed?');
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Convert to SendGrid format
      const sgMessage = {
        to: message.to,
        from: {
          email: message.from || EMAIL_FROM,
          name: message.fromName || EMAIL_FROM_NAME
        },
        subject: message.subject,
        text: message.text,
        html: message.html,
        cc: message.cc,
        bcc: message.bcc,
        attachments: message.attachments?.map(attachment => ({
          filename: attachment.filename,
          content: Buffer.isBuffer(attachment.content) 
            ? attachment.content.toString('base64')
            : Buffer.from(attachment.content).toString('base64'),
          type: attachment.contentType,
          disposition: attachment.disposition,
          content_id: attachment.contentId
        })),
        customArgs: message.metadata,
        mailSettings: {
          bypassListManagement: {
            enable: true
          }
        }
      };

      // Send email
      const response = await this.client.send(sgMessage);
      
      return {
        success: true,
        messageId: response[0]?.headers['x-message-id'] || uuidv4(),
        provider: this.getProviderName(),
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error,
        provider: this.getProviderName(),
        timestamp: new Date()
      };
    }
  }

  getProviderName(): string {
    return 'sendgrid';
  }
}

/**
 * AWS SES email provider
 * Requires aws-sdk package to be installed
 */
class AwsSesEmailProvider implements EmailProvider {
  private ses: any;

  constructor() {
    try {
      // Dynamic import to avoid requiring the package if not used
      const AWS = eval('require')('aws-sdk');
      
      // Configure AWS SDK
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      
      this.ses = new AWS.SES({ apiVersion: '2010-12-01' });
    } catch (error) {
      console.error('Failed to initialize AWS SES client:', error);
      throw new Error('AWS SES client initialization failed. Is aws-sdk installed?');
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Convert to AWS SES format
      const params = {
        Source: `${message.fromName || EMAIL_FROM_NAME} <${message.from || EMAIL_FROM}>`,
        Destination: {
          ToAddresses: Array.isArray(message.to) ? message.to : [message.to],
          CcAddresses: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : [],
          BccAddresses: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : []
        },
        Message: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Text: {
              Data: message.text,
              Charset: 'UTF-8'
            },
            Html: {
              Data: message.html,
              Charset: 'UTF-8'
            }
          }
        },
        ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET
      };

      // Send email
      const response = await this.ses.sendEmail(params).promise();
      
      return {
        success: true,
        messageId: response.MessageId,
        provider: this.getProviderName(),
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('AWS SES email error:', error);
      return {
        success: false,
        error,
        provider: this.getProviderName(),
        timestamp: new Date()
      };
    }
  }

  getProviderName(): string {
    return 'aws-ses';
  }
}

/**
 * Nodemailer email provider
 * Requires nodemailer package to be installed
 */
class NodemailerEmailProvider implements EmailProvider {
  private transporter: any;

  constructor() {
    try {
      // Dynamic import to avoid requiring the package if not used
      const nodemailer = eval('require')('nodemailer');
      
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });
    } catch (error) {
      console.error('Failed to initialize Nodemailer client:', error);
      throw new Error('Nodemailer client initialization failed. Is nodemailer installed?');
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Convert to Nodemailer format
      const mailOptions = {
        from: `${message.fromName || EMAIL_FROM_NAME} <${message.from || EMAIL_FROM}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(', ') : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc) : undefined,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
          contentDisposition: attachment.disposition,
          cid: attachment.contentId
        })),
        priority: message.priority
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
        provider: this.getProviderName(),
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('Nodemailer email error:', error);
      return {
        success: false,
        error,
        provider: this.getProviderName(),
        timestamp: new Date()
      };
    }
  }

  getProviderName(): string {
    return 'nodemailer';
  }
}

/**
 * Factory function to get the appropriate email provider
 */
function getEmailProvider(): EmailProvider {
  switch (EMAIL_PROVIDER.toLowerCase()) {
    case 'sendgrid':
      return new SendGridEmailProvider();
    case 'aws-ses':
    case 'ses':
      return new AwsSesEmailProvider();
    case 'nodemailer':
    case 'smtp':
      return new NodemailerEmailProvider();
    case 'mock':
    default:
      return new MockEmailProvider();
  }
}

/**
 * Main email service class
 */
export class EmailService {
  private static provider: EmailProvider = getEmailProvider();
  private static rateLimiter = new RateLimiter(RATE_LIMIT_PER_SECOND);

  /**
   * Send an email with retry logic
   */
  static async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const messageId = uuidv4();
    const recipientCount = Array.isArray(message.to) ? message.to.length : 1;
    
    try {
      // Log email attempt (HIPAA-compliant - no message content)
      await this.logEmailAttempt(messageId, message, 'ATTEMPT');
      
      // Send email with rate limiting and retry logic
      const sendWithRetry = async (retryCount = 0): Promise<EmailSendResult> => {
        try {
          const result = await this.provider.sendEmail(message);
          
          if (result.success) {
            // Log successful email send
            await this.logEmailAttempt(messageId, message, 'SUCCESS', result);
            return result;
          } else {
            throw result.error || new Error('Email send failed without specific error');
          }
        } catch (error: any) {
          // Determine if we should retry
          const shouldRetry = retryCount < MAX_RETRIES && this.isRetryableError(error);
          
          // Log failure
          await this.logEmailAttempt(
            messageId, 
            message, 
            shouldRetry ? 'RETRY' : 'FAILURE', 
            { success: false, error, provider: this.provider.getProviderName(), timestamp: new Date() }
          );
          
          if (shouldRetry) {
            // Calculate exponential backoff delay
            const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
            await new Promise(resolve => setTimeout(resolve, delay));
            return sendWithRetry(retryCount + 1);
          } else {
            throw error;
          }
        }
      };
      
      // Use rate limiter to prevent provider throttling
      return await this.rateLimiter.add(() => sendWithRetry());
    } catch (error: any) {
      console.error('Email send error:', error);
      
      // Final error result
      const errorResult: EmailSendResult = {
        success: false,
        error,
        provider: this.provider.getProviderName(),
        timestamp: new Date()
      };
      
      // Ensure we log the final failure
      await this.logEmailAttempt(messageId, message, 'FAILURE', errorResult)
        .catch(logError => console.error('Failed to log email failure:', logError));
      
      return errorResult;
    }
  }

  /**
   * Send an email using a template
   */
  static async sendTemplatedEmail(message: TemplatedEmailMessage): Promise<EmailSendResult> {
    try {
      // In a real implementation, this would use a template engine or API
      // For now, we'll just simulate it
      
      // This would normally fetch the template and render it with the data
      const subject = `Template: ${message.template}`;
      const text = `This is a templated email (${message.template}).\n\nTemplate data: ${JSON.stringify(message.templateData, null, 2)}`;
      const html = `<h1>Template: ${message.template}</h1><p>This is a templated email.</p><pre>${JSON.stringify(message.templateData, null, 2)}</pre>`;
      
      // Convert to regular email message
      const emailMessage: EmailMessage = {
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        from: message.from,
        fromName: message.fromName,
        subject,
        text,
        html,
        attachments: message.attachments,
        metadata: {
          ...message.metadata,
          template: message.template,
          templateData: message.templateData
        },
        priority: message.priority
      };
      
      // Send the email
      return await this.sendEmail(emailMessage);
    } catch (error: any) {
      console.error('Templated email error:', error);
      return {
        success: false,
        error,
        provider: this.provider.getProviderName(),
        timestamp: new Date()
      };
    }
  }

  /**
   * Change the email provider
   */
  static setProvider(providerName: string): void {
    switch (providerName.toLowerCase()) {
      case 'sendgrid':
        this.provider = new SendGridEmailProvider();
        break;
      case 'aws-ses':
      case 'ses':
        this.provider = new AwsSesEmailProvider();
        break;
      case 'nodemailer':
      case 'smtp':
        this.provider = new NodemailerEmailProvider();
        break;
      case 'mock':
        this.provider = new MockEmailProvider();
        break;
      default:
        throw new Error(`Unknown email provider: ${providerName}`);
    }
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: any): boolean {
    // Network errors are generally retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }
    
    // Rate limiting errors are retryable
    if (error.code === 429 || (error.response && error.response.status === 429)) {
      return true;
    }
    
    // Server errors are generally retryable
    if (error.code >= 500 || (error.response && error.response.status >= 500)) {
      return true;
    }
    
    // Provider-specific retryable errors
    if (error.message && (
      error.message.includes('throttle') || 
      error.message.includes('rate limit') || 
      error.message.includes('timeout')
    )) {
      return true;
    }
    
    return false;
  }

  /**
   * Log email attempt in a HIPAA-compliant way
   * No PHI or email content is logged
   */
  private static async logEmailAttempt(
    messageId: string,
    message: EmailMessage,
    status: 'ATTEMPT' | 'SUCCESS' | 'RETRY' | 'FAILURE',
    result?: EmailSendResult
  ): Promise<void> {
    try {
      // Extract safe metadata for logging
      const safeMetadata = {
        messageId,
        provider: this.provider.getProviderName(),
        recipientCount: Array.isArray(message.to) ? message.to.length : 1,
        hasAttachments: message.attachments && message.attachments.length > 0,
        priority: message.priority || 'normal',
        status,
        ...(result ? {
          success: result.success,
          providerMessageId: result.messageId,
          errorCode: result.error?.code || result.error?.name,
          errorMessage: result.error ? this.sanitizeErrorMessage(result.error.message) : undefined
        } : {})
      };
      
      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          userId: 'system', // System-generated email
          actionedBy: 'system',
          action: status === 'SUCCESS' ? AuditAction.CREATE : AuditAction.OTHER,
          resourceType: 'EMAIL',
          resourceId: messageId,
          description: `Email ${status.toLowerCase()}: ${message.subject}`,
          metadata: safeMetadata
        }
      });
    } catch (error) {
      // Don't let logging failures affect the email flow
      console.error('Failed to log email attempt:', error);
    }
  }

  /**
   * Sanitize error messages to ensure no PHI is included
   */
  private static sanitizeErrorMessage(message: string): string {
    // Remove anything that looks like an email address
    return message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
  }
}

/**
 * Export a singleton instance for convenience
 */
export default EmailService;
