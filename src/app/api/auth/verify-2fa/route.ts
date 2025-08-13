/**
 * Two-Factor Authentication Verification API Endpoint for CareLinkAI (STUBBED)
 * 
 * This API provides a stubbed implementation of the 2FA verification process.
 * Currently, 2FA verification is temporarily disabled.
 * 
 * This stub:
 * - Returns appropriate messages indicating 2FA is temporarily disabled
 * - Maintains minimal audit logging for attempted access
 * - Always returns verified: false with a 200 status to avoid blocking login flows
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * POST handler for 2FA code verification (STUBBED)
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Parse request body (optional)
    let userId = "";
    try {
      const body = await request.json();
      userId = body.userId || "";
    } catch (e) {
      // Ignore parsing errors
    }
    
    // Create audit log entry if userId is provided
    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            action: AuditAction.READ,
            resourceType: "TWO_FACTOR",
            resourceId: userId,
            description: "2FA verification attempted (feature temporarily disabled)",
            ipAddress: clientIp,
            metadata: {
              method: "VERIFY_2FA",
              status: "DISABLED"
            },
            userId: userId,
            actionedBy: userId
          }
        });
      } catch (e) {
        // Ignore audit log errors to keep the function non-blocking
        console.error("Failed to create audit log:", e);
      }
    }
    
    // Return response indicating 2FA verification is temporarily disabled
    // Using 200 status to avoid blocking login flows
    return NextResponse.json({
      success: true,
      verified: false,
      message: "Two-factor authentication verification is temporarily disabled",
      temporarilyDisabled: true
    });
    
  } catch (error: any) {
    console.error("2FA verification error:", error);
    
    // Return success with verified:false even on errors to avoid blocking login flows
    return NextResponse.json({
      success: true,
      verified: false,
      message: "Two-factor authentication verification is temporarily disabled",
      temporarilyDisabled: true,
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
