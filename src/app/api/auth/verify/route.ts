/**
 * Email Verification API Endpoint for CareLinkAI
 * 
 * This API handles email verification by:
 * - Validating the verification token
 * - Updating the user's status to ACTIVE
 * - Clearing the verification token after use
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction, UserStatus } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * POST handler for email verification
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { token } = body;
    
    // Check if token is provided
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Verification token is required" },
        { status: 400 }
      );
    }
    
    // ------------------------------------------------------------------
    // Inline email-token verification to avoid external import problems
    // ------------------------------------------------------------------
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date(), // not expired
        },
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid or expired verification token. Please request a new verification email.",
        },
        { status: 400 },
      );
    }

    // mark verified & clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        status: UserStatus.ACTIVE,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    const userId = user.id;
    
    // Create audit log entry for successful verification
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "USER",
        resourceId: userId,
        description: "Email verified and account activated",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        metadata: {
          method: "API",
          verificationMethod: "EMAIL"
        },
        userId: userId,
        actionedBy: userId
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Email verified successfully. Your account is now active.",
    });
    
  } catch (error: any) {
    console.error("Email verification error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Verification failed", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
