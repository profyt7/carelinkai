import { rateLimit } from '@/lib/rate-limit';
/**
 * Reset Password API Endpoint for CareLinkAI
 * 
 * This API handles password reset by:
 * - Validating the reset token
 * - Checking token expiration
 * - Validating the new password
 * - Updating the user's password
 * - Clearing the reset token after use
 * - Creating an audit log entry
 * 
 * Security features:
 * - Strong password requirements
 * - Secure password hashing with bcrypt
 * - One-time use tokens (cleared after reset)
 * - Token expiration (1 hour)
 * - Audit logging for security tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";
import { z } from "zod";
import { hash } from "bcryptjs";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const SALT_ROUNDS = 12;

// Input validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

/**
 * POST handler for password reset
 */
export async function POST(request: NextRequest) {
  // Basic per-IP rate limiting to prevent abuse
  {
    const ip = (request.headers.get('x-forwarded-for') || (request as any).ip || 'unknown').split(',')[0].trim();
    const limiter = rateLimit({ interval: 60_000, limit: 8, uniqueTokenPerInterval: 5000 });
    try {
      await limiter.check(8, 'rp:' + ip);
    } catch {
      const __usage = await limiter.getUsage('rp:' + ip).catch(() => null as any); const __reset = __usage ? Math.ceil((((__usage.resetIn) as number ?? 60000) / 1000)) : 60; return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(__reset), 'X-RateLimit-Limit': '8', 'X-RateLimit-Reset': String(__reset) } });
    }
  }
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input against schema
    const validationResult = resetPasswordSchema.safeParse(body);
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
    
    const { token, password } = validationResult.data;
    
    // Get client IP for audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Find user with valid (non-expired) reset token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: {
          gt: new Date() // not expired
        }
      },
      select: {
        id: true,
        email: true
      }
    });
    
    // Invalid or expired token
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid or expired reset token. Please request a new password reset." 
        }, 
        { status: 400 }
      );
    }
    
    // Hash the new password
    const passwordHash = await hash(password, SALT_ROUNDS);
    
    // Update user with new password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
      }
    });
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "USER_PASSWORD",
        resourceId: user.id,
        description: "Password reset via token",
        ipAddress: clientIp,
        metadata: {
          method: "RESET_TOKEN"
        },
        userId: user.id,
        actionedBy: user.id
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully. You can now log in with your new password."
    });
    
  } catch (error: any) {
    console.error("Password reset error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to reset password. Please try again later.", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}

