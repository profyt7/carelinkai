/**
 * Disable Two-Factor Authentication API Endpoint for CareLinkAI
 * 
 * This API handles disabling 2FA by:
 * - Verifying the user's identity with either:
 *   a) Their current password, or
 *   b) A valid 2FA code from their authenticator app
 * - Removing all 2FA data from the user's account
 * - Creating audit log entries for security monitoring
 * 
 * Security features:
 * - Requires secondary verification (password or valid 2FA code)
 * - Session validation to ensure authenticated access
 * - Complete cleanup of all 2FA-related data
 * - Rate limiting to prevent brute force attacks
 * - Detailed audit logging for security monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { authenticator } from "otplib";
import { z } from "zod";
import { compare } from "bcryptjs";

// Initialize Prisma client
const prisma = new PrismaClient();

// Rate limiting implementation
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// In-memory store for rate limiting
// In production, use Redis or a similar distributed store
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Input validation schema
const disableSchema = z.object({
  verificationMethod: z.enum(["password", "totp"]),
  verificationValue: z.string().min(1, "Verification value is required")
});

/**
 * Check if a request is rate limited
 * @param key The rate limiting key (usually IP + userId)
 * @returns boolean indicating if the request should be blocked
 */
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // No previous attempts
  if (!entry) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return false;
  }
  
  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return true;
  }
  
  // Reset count if window has passed
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return false;
  }
  
  // Increment count and check if limit exceeded
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    return true;
  }
  
  return false;
}

/**
 * POST handler to disable 2FA
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated via session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    // Validate input against schema
    const validationResult = disableSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid input data", 
          errors: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    
    const { verificationMethod, verificationValue } = validationResult.data;
    
    // Get client IP for rate limiting and audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        email: true,
        passwordHash: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Check if 2FA is enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Two-factor authentication is not enabled for this account" 
        },
        { status: 400 }
      );
    }
    
    // Create rate limit key combining IP and userId
    const rateLimitKey = `disable2fa:${clientIp}:${user.id}`;
    
    // Check rate limiting
    if (isRateLimited(rateLimitKey)) {
      // Create audit log entry for rate limit
      await prisma.auditLog.create({
        data: {
          action: AuditAction.ACCESS_DENIED,
          resourceType: "TWO_FACTOR",
          resourceId: user.id,
          description: "2FA disable attempt rate limit exceeded",
          ipAddress: clientIp,
          metadata: {
            method: "DISABLE_2FA",
            reason: "RATE_LIMIT"
          },
          userId: user.id,
          actionedBy: user.id
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Too many verification attempts. Please try again later.",
          rateLimit: true
        }, 
        { status: 429 }
      );
    }
    
    // Verify the user's identity based on the verification method
    let isVerified = false;
    
    if (verificationMethod === "password") {
      // Verify password
      if (user.passwordHash) {
        isVerified = await compare(verificationValue, user.passwordHash);
      }
    } else if (verificationMethod === "totp") {
      // Verify TOTP code
      if (user.twoFactorSecret) {
        isVerified = authenticator.verify({ 
          token: verificationValue, 
          secret: user.twoFactorSecret 
        });
      }
    }
    
    // If verification failed, log and return error
    if (!isVerified) {
      // Create audit log entry for failed verification
      await prisma.auditLog.create({
        data: {
          action: AuditAction.ACCESS_DENIED,
          resourceType: "TWO_FACTOR",
          resourceId: user.id,
          description: "Failed 2FA disable verification",
          ipAddress: clientIp,
          metadata: {
            method: "DISABLE_2FA",
            verificationMethod,
            reason: "INVALID_CREDENTIALS"
          },
          userId: user.id,
          actionedBy: user.id
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid ${verificationMethod === "password" ? "password" : "verification code"}. Please try again.` 
        },
        { status: 400 }
      );
    }
    
    // Disable 2FA and clear all related data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: Prisma.DbNull
      }
    });
    
    // Create audit log entry for successful disable
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "TWO_FACTOR",
        resourceId: user.id,
        description: "Two-factor authentication disabled",
        ipAddress: clientIp,
        metadata: {
          method: "DISABLE_2FA",
          verificationMethod
        },
        userId: user.id,
        actionedBy: user.id
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Two-factor authentication has been successfully disabled for your account"
    });
    
  } catch (error: any) {
    console.error("Disable 2FA error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to disable two-factor authentication", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
