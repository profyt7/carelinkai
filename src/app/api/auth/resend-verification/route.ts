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
import { sendVerificationEmail } from "@/lib/email";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const TOKEN_EXPIRY_HOURS = 24;
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

// Note: sendVerificationEmail is now imported from @/lib/email
// No need to redefine it here - the imported function will be used directly

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
