/**
 * Resend Email Verification API Endpoint
 * 
 * This API handles resending verification emails to users who:
 * - Have registered but not verified their email
 * - Lost or didn't receive the original verification email
 * 
 * Features:
 * - Rate limiting (max 3 attempts per 15 minutes per email)
 * - Only works for PENDING users
 * - Generates new verification token
 * - Sends verification email
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserStatus } from "@prisma/client";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as nodemailer from "nodemailer";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const TOKEN_EXPIRY_HOURS = 24;
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:5002';
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;

// Input validation schema
const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// In-memory rate limiting (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for email
 */
function checkRateLimit(email: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase();
  
  const record = rateLimitMap.get(normalizedEmail);
  
  if (!record) {
    // First attempt
    rateLimitMap.set(normalizedEmail, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (now > record.resetAt) {
    // Window expired, reset
    rateLimitMap.set(normalizedEmail, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    // Rate limit exceeded
    const resetIn = Math.ceil((record.resetAt - now) / 1000 / 60); // minutes
    return { allowed: false, resetIn };
  }
  
  // Increment count
  record.count++;
  return { allowed: true };
}

/**
 * Create a verification token and store it in the database
 */
async function createVerificationToken(userId: string): Promise<string> {
  console.log(`[resendVerification] Generating token for userId=${userId}`);
  const token = randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: token,
      verificationTokenExpiry: expires,
    },
  });

  console.log(
    `[resendVerification] Token persisted for userId=${userId} ` +
    `expires=${expires.toISOString()}`
  );
  return token;
}

/**
 * Send a verification email using nodemailer
 */
async function sendVerificationEmail(
  email: string, 
  firstName: string, 
  token: string
): Promise<boolean> {
  try {
    console.log(`[resendVerification] Sending email to ${email}`);

    // Generate verification link with token
    const verificationLink = `${APP_URL}/auth/verify?token=${token}`;
    
    // Check if we should use production SMTP
    const useProductionSMTP = process.env.SMTP_HOST && 
                             process.env.SMTP_USER && 
                             process.env.SMTP_PASSWORD;
    
    let transporter;
    
    if (useProductionSMTP) {
      // Use production SMTP (Gmail, SendGrid, etc.)
      console.log('[resendVerification] Using production SMTP');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    } else {
      // Use Ethereal for development
      console.log('[resendVerification] Using Ethereal test account');
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
    }
    
    // Send email
    const info = await transporter.sendMail({
      from: '"CareLinkAI" <noreply@carelinkai.com>',
      to: email,
      subject: "Verify Your CareLinkAI Account",
      text: `
Hello ${firstName},

Thank you for registering with CareLinkAI. To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in ${TOKEN_EXPIRY_HOURS} hours.

If you did not create an account with CareLinkAI, please ignore this email.

Best regards,
The CareLinkAI Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3b82f6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; 
              border-radius: 4px; margin: 20px 0; font-weight: bold; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="color: white; margin: 0;">CareLinkAI</h2>
  </div>
  <div class="content">
    <h2>Verify Your Email Address</h2>
    <p>Hello ${firstName},</p>
    <p>Thank you for registering with CareLinkAI. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
    
    <a href="${verificationLink}" class="button">Verify Email Address</a>
    
    <p>This verification link will expire in ${TOKEN_EXPIRY_HOURS} hours.</p>
    <p>If you did not create an account with CareLinkAI, please ignore this email.</p>
    <p>Best regards,<br>The CareLinkAI Team</p>
    
    <div class="footer">
      <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
    </div>
  </div>
</body>
</html>
      `,
    });
    
    // Log email details
    console.log('📧 Verification email sent:');
    console.log('- To:', email);
    if (!useProductionSMTP) {
      console.log('- Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('[resendVerification] Failed:', error);
    return false;
  }
}

/**
 * POST handler for resending verification email
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate input
    const validationResult = resendSchema.safeParse(body);
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
    
    // Check rate limit
    const rateLimitCheck = checkRateLimit(normalizedEmail);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Too many requests. Please try again in ${rateLimitCheck.resetIn} minutes.`
        }, 
        { status: 429 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        status: true,
      }
    });
    
    // For security, don't reveal if user exists or not
    // Always return success message
    if (!user) {
      console.log(`[resendVerification] User not found: ${normalizedEmail}`);
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification link has been sent."
      });
    }
    
    // Check if user is already active
    if (user.status === UserStatus.ACTIVE) {
      console.log(`[resendVerification] User already active: ${normalizedEmail}`);
      return NextResponse.json({
        success: true,
        message: "Your account is already verified. You can log in now."
      });
    }
    
    // Check if user is pending
    if (user.status !== UserStatus.PENDING) {
      console.log(`[resendVerification] User not pending: ${normalizedEmail}, status: ${user.status}`);
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification link has been sent."
      });
    }
    
    // Generate new token
    const token = await createVerificationToken(user.id);
    
    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, user.firstName, token);
    
    if (!emailSent) {
      console.error(`[resendVerification] Failed to send email to ${normalizedEmail}`);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to send verification email. Please try again later."
        }, 
        { status: 500 }
      );
    }
    
    console.log(`[resendVerification] Success for ${normalizedEmail}`);
    
    return NextResponse.json({
      success: true,
      message: "Verification email sent! Please check your inbox (and spam folder)."
    });
    
  } catch (error: any) {
    console.error("Resend verification error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "An error occurred. Please try again later.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
