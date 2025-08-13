/**
 * Change Password API for CareLinkAI
 * 
 * This API handles secure password changes for authenticated users:
 * - Requires current password verification
 * - Validates new password strength
 * - Implements rate limiting for security
 * - Logs all password change attempts
 * - Follows HIPAA security requirements
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-db-simple";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const SALT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Password change request schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: z.string().min(1, "Password confirmation is required")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Rate limiter for password change attempts
const limiter = rateLimit({
  interval: WINDOW_MS,
  uniqueTokenPerInterval: 500,
  limit: MAX_ATTEMPTS,
});

/**
 * POST handler for changing password
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated via session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Get client IP for rate limiting and audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Apply rate limiting
    try {
      await limiter.check(MAX_ATTEMPTS, `${clientIp}_password_change`);
    } catch (error) {
      // Create audit log entry for rate limit exceeded
      await prisma.auditLog.create({
        data: {
          action: AuditAction.ACCESS_DENIED,
          resourceType: "USER",
          resourceId: userId,
          description: "Password change rate limit exceeded",
          ipAddress: clientIp,
          userId: userId,
          actionedBy: userId,
          metadata: {
            status: "RATE_LIMITED",
            attempts: MAX_ATTEMPTS
          }
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Too many password change attempts. Please try again after 15 minutes.` 
        }, 
        { status: 429 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = passwordChangeSchema.safeParse(body);
    
    if (!validationResult.success) {
      // Create audit log entry for validation failure
      await prisma.auditLog.create({
        data: {
          action: AuditAction.ACCESS_DENIED,
          resourceType: "USER",
          resourceId: userId,
          description: "Password change validation failed",
          ipAddress: clientIp,
          userId: userId,
          actionedBy: userId,
          metadata: {
            status: "VALIDATION_FAILED",
            fields: Object.keys(validationResult.error.flatten().fieldErrors)
          }
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid input data", 
          errors: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    
    // Extract validated data
    const { currentPassword, newPassword } = validationResult.data;
    
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Verify current password
    const isPasswordValid = await compare(currentPassword, user.passwordHash);
    
    if (!isPasswordValid) {
      // Create audit log entry for incorrect password
      await prisma.auditLog.create({
        data: {
          action: AuditAction.ACCESS_DENIED,
          resourceType: "USER",
          resourceId: userId,
          description: "Password change failed - incorrect current password",
          ipAddress: clientIp,
          userId: userId,
          actionedBy: userId,
          metadata: {
            status: "INCORRECT_PASSWORD",
            email: user.email
          }
        }
      });
      
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 401 }
      );
    }
    
    // Check if new password is same as current password
    const isSamePassword = await compare(newPassword, user.passwordHash);
    
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, message: "New password must be different from current password" },
        { status: 400 }
      );
    }
    
    // Hash new password
    const newPasswordHash = await hash(newPassword, SALT_ROUNDS);
    
    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      }
    });
    
    // Create audit log entry for successful password change
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "USER_PASSWORD",
        resourceId: userId,
        description: "User changed their password",
        ipAddress: clientIp,
        userId: userId,
        actionedBy: userId,
        metadata: {
          status: "SUCCESS",
          email: user.email
        }
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Password changed successfully"
    });
    
  } catch (error: any) {
    console.error("Password change error:", error);
    
    // Try to get user ID from session for audit logging
    let userId = "unknown";
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch (sessionError) {
      console.error("Error getting session for audit logging:", sessionError);
    }
    
    // Create audit log entry for error
    try {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.ERROR,
          resourceType: "USER_PASSWORD",
          resourceId: userId,
          description: "Password change error",
          ipAddress: request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown",
          userId,
          actionedBy: userId,
          metadata: {
            error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
          }
        }
      });
    } catch (auditError) {
      console.error("Error creating audit log:", auditError);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to change password", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
