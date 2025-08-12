/**
 * Two-Factor Authentication Verification API Endpoint for CareLinkAI
 * 
 * This API handles 2FA code verification during login by:
 * - Validating the provided TOTP code against the user's secret
 * - Supporting backup codes as an alternative verification method
 * - Implementing rate limiting to prevent brute force attacks
 * - Creating detailed audit logs for security monitoring
 * 
 * Security features:
 * - Rate limiting (5 attempts per 5 minutes per IP/user)
 * - Constant-time comparison for code validation
 * - Backup code support with one-time use
 * - Detailed audit logging for security monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";
import { authenticator } from "otplib";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { timingSafeEqual } from "crypto";

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
const verifySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  code: z.string().min(1, "Verification code is required"),
  isBackupCode: z.boolean().optional().default(false)
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
 * Verify a TOTP code against a secret
 * @param token The TOTP code to verify
 * @param secret The user's TOTP secret
 * @returns boolean indicating if the code is valid
 */
function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

/**
 * Verify a backup code using constant-time comparison
 * @param providedCode The backup code provided by the user
 * @param storedCodes Array of valid backup codes
 * @returns The used backup code if valid, or null if invalid
 */
function verifyBackupCode(providedCode: string, storedCodes: string[]): string | null {
  // Normalize the provided code (trim whitespace, remove hyphens)
  const normalizedCode = providedCode.replace(/\s+|-/g, "").toUpperCase();
  
  // Check each backup code using constant-time comparison
  for (const code of storedCodes) {
    const normalizedStoredCode = code.replace(/\s+|-/g, "").toUpperCase();
    
    // Skip if lengths don't match (this doesn't leak timing info)
    if (normalizedCode.length !== normalizedStoredCode.length) continue;
    
    // Use timingSafeEqual to prevent timing attacks
    try {
      const codeBuffer = Buffer.from(normalizedCode);
      const storedBuffer = Buffer.from(normalizedStoredCode);
      
      if (timingSafeEqual(codeBuffer, storedBuffer)) {
        return code; // Return the original code format
      }
    } catch (error) {
      console.error("Backup code verification error:", error);
    }
  }
  
  return null;
}

/**
 * POST handler to verify a 2FA code
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate input against schema
    const validationResult = verifySchema.safeParse(body);
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
    
    const { userId, code, isBackupCode } = validationResult.data;
    
    // Get client IP for rate limiting and audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Create rate limit key combining IP and userId
    const rateLimitKey = `2fa:${clientIp}:${userId}`;
    
    // Check rate limiting
    if (isRateLimited(rateLimitKey)) {
      // Create audit log entry for rate limit
      await prisma.auditLog.create({
        data: {
          action: AuditAction.ACCESS_DENIED,
          resourceType: "TWO_FACTOR",
          resourceId: userId,
          description: "2FA verification rate limit exceeded",
          ipAddress: clientIp,
          metadata: {
            method: isBackupCode ? "BACKUP_CODE" : "TOTP",
            reason: "RATE_LIMIT"
          },
          userId: userId,
          actionedBy: userId
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
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true // This field should be added to the schema
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
    
    let isValid = false;
    let usedBackupCode: string | null = null;
    
    // Verify the code based on type
    if (isBackupCode) {
      // Verify backup code
      const backupCodes = user.backupCodes as string[] || [];
      usedBackupCode = verifyBackupCode(code, backupCodes);
      isValid = !!usedBackupCode;
    } else {
      // Verify TOTP code
      isValid = verifyTOTP(code, user.twoFactorSecret);
    }
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: isValid ? AuditAction.ACCESS_GRANTED : AuditAction.ACCESS_DENIED,
        resourceType: "TWO_FACTOR",
        resourceId: user.id,
        description: isValid 
          ? `2FA verification successful using ${isBackupCode ? "backup code" : "TOTP"}`
          : `2FA verification failed using ${isBackupCode ? "backup code" : "TOTP"}`,
        ipAddress: clientIp,
        metadata: {
          method: isBackupCode ? "BACKUP_CODE" : "TOTP",
          success: isValid
        },
        userId: user.id,
        actionedBy: user.id
      }
    });
    
    // If using a backup code and verification was successful, remove the used code
    if (isValid && isBackupCode && usedBackupCode) {
      const backupCodes = (user.backupCodes as string[]) || [];
      const updatedBackupCodes = backupCodes.filter(code => code !== usedBackupCode);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          backupCodes: updatedBackupCodes
        }
      });
    }
    
    // Return appropriate response
    if (isValid) {
      return NextResponse.json({
        success: true,
        message: "Two-factor authentication verified successfully",
        verified: true
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid verification code. Please try again.",
          verified: false
        }, 
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error("2FA verification error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to verify two-factor authentication", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
