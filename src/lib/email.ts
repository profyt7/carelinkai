/**
 * Email Service using Resend API
 * 
 * This module provides email functionality for CareLinkAI using Resend.
 * Resend is a modern email API service that simplifies transactional emails.
 * 
 * Features:
 * - Simple API integration (no SMTP configuration needed)
 * - High deliverability rates
 * - Professional HTML email templates
 * - Automatic fallback for missing API key (logs only)
 */

import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Constants
const FROM_EMAIL = 'profyt7@gmail.com'; // Will use noreply@getcarelinkai.com when domain is verified
const APP_NAME = 'CareLinkAI';
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Send a verification email to a new user
 * 
 * @param email - User's email address
 * @param firstName - User's first name for personalization
 * @param verificationToken - Unique token for email verification
 * @returns Promise<boolean> - true if email sent successfully, false otherwise
 */
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verificationToken: string
): Promise<boolean> {
  try {
    console.log(`[Resend] Sending verification email to ${email}`);
    
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY is not configured in environment variables');
      console.error('[Resend] Please set RESEND_API_KEY on Render dashboard');
      return false;
    }
    
    // Generate verification link
    const APP_URL = process.env.NEXTAUTH_URL || 'https://getcarelinkai.com';
    const verificationLink = `${APP_URL}/auth/verify?token=${verificationToken}`;
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [email],
      subject: `Verify Your ${APP_NAME} Account`,
      html: generateVerificationEmailHTML(firstName, verificationLink),
      text: generateVerificationEmailText(firstName, verificationLink),
    });
    
    if (error) {
      console.error('[Resend] Error sending email:', error);
      return false;
    }
    
    console.log('[Resend] ✅ Verification email sent successfully');
    console.log('[Resend] Email ID:', data?.id);
    return true;
    
  } catch (error) {
    console.error('[Resend] Exception while sending email:', error);
    return false;
  }
}

/**
 * Generate HTML content for verification email
 */
function generateVerificationEmailHTML(
  firstName: string,
  verificationLink: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1f2937;
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      color: #4b5563;
      margin-bottom: 16px;
      font-size: 16px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .verify-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
      transition: transform 0.2s;
    }
    .verify-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
    }
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 8px 0;
      font-size: 14px;
      color: #6b7280;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    .link-text {
      word-break: break-all;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${APP_NAME}</h1>
    </div>
    
    <div class="content">
      <h2>Verify Your Email Address</h2>
      
      <p>Hello ${firstName},</p>
      
      <p>Thank you for registering with ${APP_NAME}! We're excited to have you join our community.</p>
      
      <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
      
      <div class="button-container">
        <a href="${verificationLink}" class="verify-button">Verify Email Address</a>
      </div>
      
      <div class="info-box">
        <p><strong>⏱️ This verification link will expire in ${TOKEN_EXPIRY_HOURS} hours.</strong></p>
      </div>
      
      <p>If you did not create an account with ${APP_NAME}, please disregard this email. No further action is required.</p>
      
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
    
    <div class="footer">
      <p>Having trouble clicking the button?</p>
      <p>Copy and paste this URL into your browser:</p>
      <p class="link-text">${verificationLink}</p>
      <p style="margin-top: 20px;">
        &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text content for verification email
 */
function generateVerificationEmailText(
  firstName: string,
  verificationLink: string
): string {
  return `
Hello ${firstName},

Thank you for registering with ${APP_NAME}! We're excited to have you join our community.

To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationLink}

⏱️ This verification link will expire in ${TOKEN_EXPIRY_HOURS} hours.

If you did not create an account with ${APP_NAME}, please disregard this email. No further action is required.

Best regards,
The ${APP_NAME} Team

---
© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `.trim();
}

/**
 * Send a password reset email (for future use)
 * 
 * @param email - User's email address
 * @param firstName - User's first name
 * @param resetToken - Password reset token
 * @returns Promise<boolean> - true if email sent successfully
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetToken: string
): Promise<boolean> {
  try {
    console.log(`[Resend] Sending password reset email to ${email}`);
    
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY is not configured');
      return false;
    }
    
    const APP_URL = process.env.NEXTAUTH_URL || 'https://getcarelinkai.com';
    const resetLink = `${APP_URL}/auth/reset-password?token=${resetToken}`;
    
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [email],
      subject: `Reset Your ${APP_NAME} Password`,
      html: `
        <p>Hello ${firstName},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Hello ${firstName},\n\nReset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
    });
    
    if (error) {
      console.error('[Resend] Error sending password reset email:', error);
      return false;
    }
    
    console.log('[Resend] ✅ Password reset email sent');
    return true;
    
  } catch (error) {
    console.error('[Resend] Exception sending password reset:', error);
    return false;
  }
}
