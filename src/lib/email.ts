/**
 * Email Service for CareLinkAI
 * 
 * This service handles all email functionality including:
 * - Email verification
 * - Password reset
 * - Notifications
 * - Marketing emails
 * 
 * In development mode, emails are logged to the console.
 * In production, emails are sent via configured email provider.
 */

import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as nodemailer from 'nodemailer';

// Initialize Prisma client
const prisma = new PrismaClient();

// Email configuration
const EMAIL_FROM = process.env["EMAIL_FROM"] || 'noreply@carelinkai.com';
const EMAIL_FROM_NAME = process.env["EMAIL_FROM_NAME"] || 'CareLinkAI';
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

// App URLs
const APP_URL = process.env["NEXTAUTH_URL"] || 'http://localhost:5002';
const VERIFICATION_URL = `${APP_URL}/auth/verify`;

/**
 * Email transport configuration
 * In development: Use ethereal.email fake SMTP service
 * In production: Use configured SMTP service
 */
let transporter: nodemailer.Transporter;

// Initialize email transporter based on environment
async function initializeEmailTransporter() {
  if (process.env["NODE_ENV"] === 'production') {
    // Production email service
    transporter = nodemailer.createTransport({
      host: process.env["EMAIL_SERVER_HOST"],
      port: parseInt(process.env["EMAIL_SERVER_PORT"] || '587'),
      secure: process.env["EMAIL_SERVER_SECURE"] === 'true',
      auth: {
        user: process.env["EMAIL_SERVER_USER"],
        pass: process.env["EMAIL_SERVER_PASSWORD"],
      },
    });
  } else {
    // Development email service using Ethereal (fake SMTP service)
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log('Development email account created:', {
      user: testAccount.user,
      pass: testAccount.pass,
      preview: 'https://ethereal.email'
    });
  }
  
  return transporter;
}

/**
 * Generate a secure random token
 * @returns A URL-safe random token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate an expiration date for tokens
 * @param hours Number of hours until expiration
 * @returns Date object representing expiration time
 */
export function generateTokenExpiry(hours: number): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

/**
 * Create and store a verification token for a user
 * @param userId The ID of the user to create a token for
 * @returns The generated verification token
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const token = generateToken();
  const expires = generateTokenExpiry(VERIFICATION_TOKEN_EXPIRY_HOURS);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: token,
      verificationTokenExpiry: expires,
    },
  });
  
  return token;
}

/**
 * Create and store a password reset token for a user
 * @param userId The ID of the user to create a reset token for
 * @returns The generated reset token
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  /* ------------------------------------------------------------------
   * The User model currently does NOT contain resetPasswordToken fields.
   * When we implement the full password-reset flow we will either:
   *   a) add those fields to the User table, OR
   *   b) create a dedicated PasswordResetToken table.
   * For now we just return the token so the caller can send it via email.
   * ------------------------------------------------------------------ */
  // TODO: Persist password-reset token in DB once schema is updated.

  return token;
}

/**
 * Verify a user's email verification token
 * @param token The token to verify
 * @returns The user ID if valid, null if invalid
 */
export async function verifyEmailToken(token: string): Promise<string | null> {
  // Find user with matching token that hasn't expired
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationTokenExpiry: {
        gt: new Date(), // Token must not be expired
      },
    },
  });
  
  if (!user) return null;
  
  // Mark email as verified and clear the token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      status: 'ACTIVE',
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  });
  
  return user.id;
}

/**
 * Generate HTML content for verification email
 * @param userName User's first name
 * @param verificationLink Full verification link with token
 * @returns HTML content for the email
 */
function generateVerificationEmailHtml(userName: string, verificationLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #3b82f6;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header img {
          max-width: 200px;
        }
        .content {
          background-color: #ffffff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${APP_URL}/logo-white.svg" alt="CareLinkAI Logo">
      </div>
      <div class="content">
        <h2>Verify Your Email Address</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for registering with CareLinkAI. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
        
        <a href="${verificationLink}" class="button">Verify Email Address</a>
        
        <p>This verification link will expire in ${VERIFICATION_TOKEN_EXPIRY_HOURS} hours.</p>
        
        <p>If you did not create an account with CareLinkAI, please ignore this email.</p>
        
        <p>Best regards,<br>The CareLinkAI Team</p>
        
        <div class="footer">
          <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
          <p>&copy; ${new Date().getFullYear()} CareLinkAI. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text content for verification email (fallback)
 * @param userName User's first name
 * @param verificationLink Full verification link with token
 * @returns Plain text content for the email
 */
function generateVerificationEmailText(userName: string, verificationLink: string): string {
  return `
Hello ${userName},

Thank you for registering with CareLinkAI. To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in ${VERIFICATION_TOKEN_EXPIRY_HOURS} hours.

If you did not create an account with CareLinkAI, please ignore this email.

Best regards,
The CareLinkAI Team

Â© ${new Date().getFullYear()} CareLinkAI. All rights reserved.
  `.trim();
}

/**
 * Send an email verification email to a user
 * @param userId User ID to send verification email to
 * @returns True if email was sent successfully, false otherwise
 */
export async function sendVerificationEmail(userId: string): Promise<boolean> {
  try {
    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        verificationToken: true,
      },
    });
    
    if (!user || !user.verificationToken) {
      console.error('Cannot send verification email: User not found or missing verification token');
      return false;
    }
    
    // Generate verification link with token
    const verificationLink = `${VERIFICATION_URL}?token=${user.verificationToken}`;
    
    // Generate email content
    const htmlContent = generateVerificationEmailHtml(user.firstName, verificationLink);
    const textContent = generateVerificationEmailText(user.firstName, verificationLink);
    
    // Ensure transporter is initialized
    if (!transporter) {
      await initializeEmailTransporter();
    }
    
    // Send email
    const info = await transporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: user.email,
      subject: "Verify Your CareLinkAI Account",
      text: textContent,
      html: htmlContent,
    });
    
    // Log email details in development
    if (process.env["NODE_ENV"] !== 'production') {
      console.log('ðŸ“§ Verification email sent:');
      console.log('- To:', user.email);
      console.log('- Token:', user.verificationToken);
      console.log('- Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

/**
 * Resend a verification email to a user
 * @param email User's email address
 * @returns True if email was sent successfully, false otherwise
 */
export async function resendVerificationEmail(email: string): Promise<boolean> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });
    
    if (!user) {
      console.error('Cannot resend verification email: User not found');
      return false;
    }
    
    if (user.status !== 'PENDING') {
      console.error('Cannot resend verification email: User already verified or not in PENDING status');
      return false;
    }
    
    // Create new verification token
    await createVerificationToken(user.id);
    
    // Send verification email
    return await sendVerificationEmail(user.id);
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    return false;
  }
}

/**
 * Initialize the email service
 * Should be called during app startup
 */
export async function initializeEmailService(): Promise<void> {
  await initializeEmailTransporter();
  console.log('âœ… Email service initialized');
}

// Named export object to satisfy eslint import/no-anonymous-default-export
const emailService = {
  sendVerificationEmail,
  resendVerificationEmail,
  verifyEmailToken,
  createVerificationToken,
  createPasswordResetToken,
  initializeEmailService,
};

export default emailService;
