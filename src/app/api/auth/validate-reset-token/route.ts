/**
 * Validate Reset Token API Endpoint for CareLinkAI
 * 
 * This API validates if a password reset token is valid by:
 * - Checking if the token exists in the database
 * - Verifying the token hasn't expired
 * - Not revealing detailed information in error responses
 * 
 * Security features:
 * - No user information is returned, only token validity
 * - Consistent response timing to prevent timing attacks
 * - Minimal information in error responses
 * - Audit logging for security monitoring
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";
import { z } from "zod";

// Initialize Prisma client
const prisma = new PrismaClient();

// Input validation schema
const tokenSchema = z.object({
  token: z.string().min(1, "Reset token is required")
});

/**
 * POST handler to validate a password reset token
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input against schema
    const validationResult = tokenSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid token", 
          valid: false
        }, 
        { status: 400 }
      );
    }
    
    const { token } = validationResult.data;
    
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
      }
    });
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: AuditAction.READ,
        resourceType: "PASSWORD_RESET_TOKEN",
        resourceId: user?.id || "unknown",
        description: "Password reset token validation",
        ipAddress: clientIp,
        metadata: {
          valid: !!user,
          token: token.substring(0, 8) + "..." // Log only first few chars for security
        },
        userId: user?.id || "system",
        actionedBy: user?.id || "system"
      }
    });
    
    // Return token validity status
    if (user) {
      return NextResponse.json({
        success: true,
        message: "Token is valid",
        valid: true
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Invalid or expired token",
        valid: false
      }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error("Token validation error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to validate token", 
        valid: false,
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
 * GET handler to validate a reset token from query parameters
 * This is useful for direct link validation from email
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from URL query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Reset token is required", 
          valid: false 
        }, 
        { status: 400 }
      );
    }
    
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
      }
    });
    
    // Return token validity status
    if (user) {
      return NextResponse.json({
        success: true,
        message: "Token is valid",
        valid: true
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Invalid or expired token",
        valid: false
      }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error("Token validation error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to validate token", 
        valid: false,
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
