
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { rateLimit } from '@/lib/rate-limit';
/**
 * Forgot Password API Endpoint for CareLinkAI
 * 
 * This API handles password reset requests by:
 * - Validating the email address
 * - Generating a secure reset token
 * - Storing the token with expiration time
 * - Sending a password reset email
 * - Creating an audit log entry
 * 
 * Security features:
 * - Does not reveal if email exists in system
 * - Uses cryptographically secure random tokens
 * - Short-lived tokens (1 hour expiration)
 * - Rate limiting considerations in documentation
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as nodemailer from "nodemailer";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const TOKEN_EXPIRY_HOURS = 1; // Short-lived token for security
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:5002';

// Input validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address")
});

/**
 * Create a password reset token and store it in the database
 */
async function createResetToken(userId: string): Promise<string> {
  // Generate a secure random token (32 bytes = 64 hex chars)
  const token = randomBytes(32).toString('hex');
  
  // Set expiration time (1 hour from now)
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);
  
  // Use a dedicated Prisma instance to avoid connection issues
  const localPrisma = new PrismaClient();
  try {
    // Update user record with reset token and expiry
    await localPrisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: expires,
      },
    });
    
    return token;
  } finally {
    await localPrisma.$disconnect();
  }
}

/**
 * Send a password reset email using nodemailer
 */
async function sendResetEmail(userId: string): Promise<boolean> {
  try {
    // Use a dedicated Prisma instance to avoid connection issues
    const localPrisma = new PrismaClient();
    
    // Get user information
    const user = await localPrisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        resetPasswordToken: true,
      },
    });
    
    await localPrisma.$disconnect();
    
    if (!user || !user.resetPasswordToken) {
      console.error('Cannot send reset email: User not found or missing reset token');
      return false;
    }
    
    // Generate reset link with token
    const resetLink = `${APP_URL}/auth/reset-password?token=${user.resetPasswordToken}`;
    if (process.env['NODE_ENV'] === 'production' && !(process.env['SMTP_HOST'] && process.env['SMTP_USER'] && process.env['SMTP_PASS'])) {
      console.warn('SMTP not configured in production; skipping password reset email send.');
      return true;
    }
    
    // Create test account for development
    const testAccount = await nodemailer.createTestAccount();
    
    // Create reusable transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: '"CareLinkAI Security" <security@carelinkai.com>',
      to: user.email,
      subject: "Reset Your CareLinkAI Password",
      text: `
Hello ${user.firstName},

We received a request to reset your CareLinkAI password. To reset your password, please click the link below:

${resetLink}

This link will expire in ${TOKEN_EXPIRY_HOURS} hour${TOKEN_EXPIRY_HOURS > 1 ? 's' : ''}.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The CareLinkAI Security Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3b82f6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; 
              border-radius: 4px; margin: 20px 0; font-weight: bold; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
    .warning { color: #b91c1c; font-size: 13px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="color: white; margin: 0;">CareLinkAI Security</h2>
  </div>
  <div class="content">
    <h2>Password Reset Request</h2>
    <p>Hello ${user.firstName},</p>
    <p>We received a request to reset your CareLinkAI password. To create a new password, please click the button below:</p>
    
    <a href="${resetLink}" class="button">Reset Password</a>
    
    <p>This link will expire in ${TOKEN_EXPIRY_HOURS} hour${TOKEN_EXPIRY_HOURS > 1 ? 's' : ''}.</p>
    <p class="warning">If you did not request a password reset, please ignore this email or contact support if you have concerns about your account security.</p>
    <p>Best regards,<br>The CareLinkAI Security Team</p>
    
    <div class="footer">
      <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
    </div>
  </div>
</body>
</html>
      `,
    });
    
    // Log email details in development
    console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â§ Password reset email sent:');
    console.log('- To:', user.email);
    console.log('- Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

/**
 * POST handler for forgot password requests
 */
export async function POST(request: NextRequest) {
  // Basic per-IP rate limiting to prevent abuse
  {
    const ip = (request.headers.get('x-forwarded-for') || (request as any).ip || 'unknown').split(',')[0].trim();
    const limiter = rateLimit({ interval: 60_000, limit: 5, uniqueTokenPerInterval: 5000 });
    const usage = await limiter.getUsage('fp:' + ip);
    if (usage && usage.count >= 5) {
      const __rl_reset = Math.ceil(((usage?.resetIn as number) ?? 60000) / 1000); return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(__rl_reset), 'X-RateLimit-Limit': '5', 'X-RateLimit-Reset': String(__rl_reset) } })
    }
    try {
      await limiter.check(5, 'fp:' + ip);
    } catch {
      const __rl_reset = Math.ceil(((usage?.resetIn as number) ?? 60000) / 1000); return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(__rl_reset), 'X-RateLimit-Limit': '5', 'X-RateLimit-Reset': String(__rl_reset) } })
    }
  }
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input against schema
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid email address", 
          errors: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    
    const { email } = validationResult.data;
    const normalizedEmail = email.toLowerCase();
    
    // Get client IP for rate limiting and audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, firstName: true, email: true }
    });
    
    // SECURITY: Always return success even if email not found
    // This prevents email enumeration attacks
    if (!user) {
      
      // Return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: "If your email is registered, you will receive password reset instructions shortly."
      });
    }
    
    // Generate reset token
    const token = await createResetToken(user.id);
    
    // Send reset email
    const emailSent = await sendResetEmail(user.id);
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        resourceType: "PASSWORD_RESET",
        resourceId: user.id,
        description: "Password reset requested",
        ipAddress: clientIp,
        metadata: {
          emailSent: emailSent
        },
        userId: user.id,
        actionedBy: user.id
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "If your email is registered, you will receive password reset instructions shortly."
    });
    
  } catch (error: any) {
    console.error("Forgot password error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Unable to process your request at this time. Please try again later.", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}





