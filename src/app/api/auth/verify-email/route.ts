/**
 * Email Verification Token API Endpoint for CareLinkAI
 * 
 * This API handles verification of email tokens by:
 * - Validating the provided token against stored tokens
 * - Checking token expiration
 * - Activating user accounts upon successful verification
 * - Rate limiting to prevent brute force attacks
 * - Creating audit logs for all verification attempts
 * 
 * Handles edge cases like expired tokens and already verified accounts.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction, UserStatus } from "@prisma/client";
import { z } from "zod";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const MAX_VERIFICATION_ATTEMPTS = 5; // Maximum verification attempts per time window
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes rate limit window
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes block after too many attempts

// Token validation schema
const tokenSchema = z.object({
  token: z.string().min(32, "Invalid verification token")
});

// Rate limiting implementation
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// In-memory store for rate limiting
// In production, use Redis or a similar distributed store
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

/**
 * Check if a request is rate limited
 * @param key The rate limiting key (usually IP)
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
  if (entry.count > MAX_VERIFICATION_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    return true;
  }
  
  return false;
}

/**
 * GET handler to verify email token
 */
export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting and audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Get token from query parameters
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    // Validate token format
    const validationResult = tokenSchema.safeParse({ token });
    if (!validationResult.success || !token) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid verification token", 
          errors: validationResult.success ? undefined : validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    
    // Apply rate limiting by IP
    const rateLimitKey = `verify-token:${clientIp}`;
    if (isRateLimited(rateLimitKey)) {
      // Create audit log entry for rate limit
      await prisma.auditLog.create({
        data: {
          userId: "anonymous", // We don't know the user ID yet
          action: AuditAction.ACCESS_DENIED,
          resourceType: "EMAIL_VERIFICATION",
          resourceId: null,
          description: "Email token verification rate limit exceeded",
          ipAddress: clientIp,
          metadata: {
            reason: "RATE_LIMIT"
          }
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
    
    // Find user with matching verification token
    const user = await prisma.user.findFirst({
      where: { 
        verificationToken: token
      },
      select: { 
        id: true, 
        email: true, 
        emailVerified: true,
        status: true,
        verificationTokenExpiry: true
      }
    });
    
    // If no user found with this token
    if (!user) {
      // Log the attempt
      await prisma.auditLog.create({
        data: {
          userId: "anonymous",
          action: AuditAction.ACCESS_DENIED,
          resourceType: "EMAIL_VERIFICATION",
          resourceId: null,
          description: "Invalid email verification token",
          ipAddress: clientIp,
          metadata: {
            token: token.substring(0, 8) + '...' // Log partial token for debugging
          }
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid verification token. Please request a new verification email." 
        }, 
        { status: 400 }
      );
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      // Log the attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.OTHER,
          resourceType: "EMAIL_VERIFICATION",
          resourceId: user.id,
          description: "Verification attempted for already verified account",
          ipAddress: clientIp
        }
      });
      
      return NextResponse.json({
        success: true,
        message: "Your email is already verified.",
        verified: true,
        alreadyVerified: true
      });
    }
    
    // Check if token has expired
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      // Log the attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.ACCESS_DENIED,
          resourceType: "EMAIL_VERIFICATION",
          resourceId: user.id,
          description: "Expired email verification token",
          ipAddress: clientIp,
          metadata: {
            expiredAt: user.verificationTokenExpiry.toISOString()
          }
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Verification token has expired. Please request a new verification email.",
          expired: true
        }, 
        { status: 400 }
      );
    }
    
    // Token is valid - mark email as verified and update user status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
        verificationToken: null,
        verificationTokenExpiry: null
      }
    });
    
    // Log successful verification
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.UPDATE,
        resourceType: "USER",
        resourceId: user.id,
        description: "Email successfully verified",
        ipAddress: clientIp,
        metadata: {
          email: user.email,
          previousStatus: user.status,
          newStatus: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status
        }
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Email verified successfully. Your account is now active.",
      verified: true
    });
    
  } catch (error: any) {
    console.error("Verify email token error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to verify email", 
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
 * POST handler to verify email token (alternative to GET for CSRF protection)
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting and audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Parse request body
    const body = await request.json();
    
    // Validate token format
    const validationResult = tokenSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid verification token", 
          errors: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    
    const { token } = validationResult.data;
    
    // Apply rate limiting by IP
    const rateLimitKey = `verify-token:${clientIp}`;
    if (isRateLimited(rateLimitKey)) {
      // Create audit log entry for rate limit
      await prisma.auditLog.create({
        data: {
          userId: "anonymous", // We don't know the user ID yet
          action: AuditAction.ACCESS_DENIED,
          resourceType: "EMAIL_VERIFICATION",
          resourceId: null,
          description: "Email token verification rate limit exceeded",
          ipAddress: clientIp,
          metadata: {
            reason: "RATE_LIMIT"
          }
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
    
    // Find user with matching verification token
    const user = await prisma.user.findFirst({
      where: { 
        verificationToken: token
      },
      select: { 
        id: true, 
        email: true, 
        emailVerified: true,
        status: true,
        verificationTokenExpiry: true
      }
    });
    
    // If no user found with this token
    if (!user) {
      // Log the attempt
      await prisma.auditLog.create({
        data: {
          userId: "anonymous",
          action: AuditAction.ACCESS_DENIED,
          resourceType: "EMAIL_VERIFICATION",
          resourceId: null,
          description: "Invalid email verification token",
          ipAddress: clientIp,
          metadata: {
            token: token.substring(0, 8) + '...' // Log partial token for debugging
          }
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid verification token. Please request a new verification email." 
        }, 
        { status: 400 }
      );
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      // Log the attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.OTHER,
          resourceType: "EMAIL_VERIFICATION",
          resourceId: user.id,
          description: "Verification attempted for already verified account",
          ipAddress: clientIp
        }
      });
      
      return NextResponse.json({
        success: true,
        message: "Your email is already verified.",
        verified: true,
        alreadyVerified: true
      });
    }
    
    // Check if token has expired
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      // Log the attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.ACCESS_DENIED,
          resourceType: "EMAIL_VERIFICATION",
          resourceId: user.id,
          description: "Expired email verification token",
          ipAddress: clientIp,
          metadata: {
            expiredAt: user.verificationTokenExpiry.toISOString()
          }
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Verification token has expired. Please request a new verification email.",
          expired: true
        }, 
        { status: 400 }
      );
    }
    
    // Token is valid - mark email as verified and update user status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
        verificationToken: null,
        verificationTokenExpiry: null
      }
    });
    
    // Log successful verification
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.UPDATE,
        resourceType: "USER",
        resourceId: user.id,
        description: "Email successfully verified",
        ipAddress: clientIp,
        metadata: {
          email: user.email,
          previousStatus: user.status,
          newStatus: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status
        }
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Email verified successfully. Your account is now active.",
      verified: true
    });
    
  } catch (error: any) {
    console.error("Verify email token error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to verify email", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
