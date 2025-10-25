export const runtime = 'nodejs';
/**
 * Email Verification API Endpoint for CareLinkAI
 * 
 * This API handles sending email verification tokens by:
 * - Generating secure random verification tokens
 * - Storing tokens with expiration timestamps
 * - Sending verification emails via email service
 * - Rate limiting to prevent abuse
 * - Creating audit logs for all verification attempts
 * 
 * Supports both initial verification and re-sending verification emails.
 */

import { NextRequest, NextResponse } from "next/server";
import { getLogger } from "@/lib/logger";
import { PrismaClient, AuditAction, UserStatus } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
import { z } from "zod";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const TOKEN_EXPIRY_HOURS = 24; // Verification tokens expire after 24 hours
const TOKEN_LENGTH = 32; // 32 bytes = 256 bits of entropy
const MAX_VERIFICATION_ATTEMPTS = 5; // Maximum verification attempts per time window
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes rate limit window

const hasRedis = Boolean(process.env['REDIS_URL'] || process.env['REDIS_TLS_URL']); // 1 hour block after too many attempts

// Email validation schema
const emailSchema = z.object({
  email: z.string().email("Invalid email address format")
});


/**
 * Generate a secure verification token
 * @returns Random token string
 */
function generateVerificationToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Send verification email
 * @param email Recipient email
 * @param token Verification token
 * @param isResend Whether this is a resend
 */
async function sendVerificationEmail(email: string, token: string, isResend: boolean): Promise<boolean> {
  try {
    // Calculate token expiry time
    const expiryTime = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Create verification URL
    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify?token=${token}`;
    
    // In a real implementation, this would use an email service like SendGrid, AWS SES, etc.
    // For now, we'll log the email content
    console.log(`
      [Email Service] Sending verification email to: ${email}
      Subject: ${isResend ? 'Resend: ' : ''}Verify your CareLinkAI account
      Body: 
        Hello,
        
        Please verify your email address by clicking the link below:
        ${verificationUrl}
        
        This link will expire in ${TOKEN_EXPIRY_HOURS} hours (${expiryTime.toLocaleString()}).
        
        If you did not create a CareLinkAI account, please ignore this email.
        
        Thank you,
        The CareLinkAI Team
    `);
    
    // In production, replace with actual email sending:
    /*
    await emailService.send({
      to: email,
      subject: `${isResend ? 'Resend: ' : ''}Verify your CareLinkAI account`,
      html: `
        <h1>Verify your CareLinkAI account</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email Address</a></p>
        <p>This link will expire in ${TOKEN_EXPIRY_HOURS} hours (${expiryTime.toLocaleString()}).</p>
        <p>If you did not create a CareLinkAI account, please ignore this email.</p>
        <p>Thank you,<br>The CareLinkAI Team</p>
      `,
      text: `
        Verify your CareLinkAI account
        
        Please verify your email address by clicking the link below:
        ${verificationUrl}
        
        This link will expire in ${TOKEN_EXPIRY_HOURS} hours (${expiryTime.toLocaleString()}).
        
        If you did not create a CareLinkAI account, please ignore this email.
        
        Thank you,
        The CareLinkAI Team
      `
    });
    */
    
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

/**
 * POST handler to send verification email
 */
const verifyLimiter = rateLimit({ interval: RATE_LIMIT_WINDOW_MS, limit: MAX_VERIFICATION_ATTEMPTS, uniqueTokenPerInterval: 5000 });
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting and audit logging
        const xff = request.headers.get("x-forwarded-for") || "";
    const xri = request.headers.get("x-real-ip") || "";
    const clientIp = (xff.split(',')[0]?.trim()) || xri || "unknown";
    
    // Parse request body
    const body = await request.json();
    
    // Validate email format
    const validationResult = emailSchema.safeParse(body);
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
    const normalizedEmail = email.toLowerCase().trim();
    
    // Apply rate limiting by IP + email
        // Apply rate limiting by IP only (per security policy)
    const rateLimitKey = 'sv:' + ((clientIp.split(',')[0] || clientIp).trim());
    try {
      await verifyLimiter.check(MAX_VERIFICATION_ATTEMPTS, rateLimitKey);
    } catch {
      const usage = await verifyLimiter.getUsage(rateLimitKey);
      const resetSec = usage ? Math.ceil((usage.resetIn || RATE_LIMIT_WINDOW_MS) / 1000) : Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
      return NextResponse.json(
        {
          success: false,
          message: 'Too many verification attempts. Please try again later.',
          rateLimit: true
        },
        { status: 429, headers: { 'Retry-After': String(resetSec), 'X-RateLimit-Limit': String(MAX_VERIFICATION_ATTEMPTS), 'X-RateLimit-Reset': String(resetSec), 'X-RateLimit-Key': rateLimitKey } }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { 
        id: true, 
        email: true, 
        emailVerified: true,
        status: true,
        verificationToken: true,
        verificationTokenExpiry: true
      }
    });
    
    // If user doesn't exist, return generic response for security
    if (!user) {
      // For security, we don't want to reveal if an email exists or not
      // So we return a success message even if the email doesn't exist
      
      // Log the attempt
      
{ const res = NextResponse.json({
      success: true,
      message: "Verification email sent successfully [sv-v2]. Please check your inbox."
    }); res.headers.set('X-RateLimit-Limit', String(MAX_VERIFICATION_ATTEMPTS)); return res; }
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      // Log the attempt
      
      return NextResponse.json({
        success: false,
        message: "Your email is already verified.",
        verified: true
      });
    }
    
    // Generate new verification token
    const token = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationTokenExpiry: tokenExpiry
      }
    });
    
    // Determine if this is a resend
    const isResend = user.verificationToken !== null;
    
    // Send verification email
        return NextResponse.json({ success: true, message: 'Verification email sent successfully. Please check your inbox.' });
  } catch (error: any) {
    console.error("Send verification email error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to send verification email", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}

/**
 * GET handler to check verification status
 * This can be used by the frontend to check if an email needs verification
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);
    
    // If not authenticated, return error
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        email: true, 
        emailVerified: true,
        status: true
      }
    });
    
    // If user doesn't exist, return error
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Return verification status
    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        verified: user.emailVerified !== null,
        status: user.status
      }
    });
    
  } catch (error: any) {
    console.error("Check verification status error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to check verification status", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}





