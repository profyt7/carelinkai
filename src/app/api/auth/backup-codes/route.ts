/**
 * Two-Factor Authentication Backup Codes API Endpoint for CareLinkAI
 * 
 * This API handles backup codes for 2FA by:
 * - Generating secure random backup codes
 * - Retrieving existing backup codes
 * - Regenerating backup codes when requested
 * - Creating audit logs for all actions
 * 
 * Security features:
 * - Session validation to ensure authenticated access
 * - Cryptographically secure random code generation
 * - Requires 2FA to be enabled
 * - Detailed audit logging for security monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;
const BACKUP_CODE_FORMAT = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/;

/**
 * Generate a set of backup codes
 * @returns Array of backup codes
 */
function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 10 bytes of random data (80 bits of entropy)
    const buffer = randomBytes(BACKUP_CODE_LENGTH);
    
    // Convert to uppercase alphanumeric and format with hyphen
    let code = buffer.toString('base64')
      .replace(/[+/=]/g, '') // Remove non-alphanumeric
      .substring(0, BACKUP_CODE_LENGTH)
      .toUpperCase();
    
    // Format as XXXXX-XXXXX
    code = `${code.substring(0, 5)}-${code.substring(5, 10)}`;
    
    codes.push(code);
  }
  
  return codes;
}

/**
 * GET handler to retrieve existing backup codes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated via session
    const session = await getServerSession(authOptions);
    
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
        twoFactorEnabled: true,
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
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Two-factor authentication must be enabled to manage backup codes" 
        },
        { status: 400 }
      );
    }
    
    // Get client IP for audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: AuditAction.READ,
        resourceType: "BACKUP_CODES",
        resourceId: user.id,
        description: "Retrieved backup codes",
        ipAddress: clientIp,
        metadata: {
          count: Array.isArray(user.backupCodes) ? user.backupCodes.length : 0
        },
        userId: user.id,
        actionedBy: user.id
      }
    });
    
    // Return backup codes
    return NextResponse.json({
      success: true,
      message: "Backup codes retrieved successfully",
      data: {
        backupCodes: user.backupCodes || [],
        count: Array.isArray(user.backupCodes) ? user.backupCodes.length : 0
      }
    });
    
  } catch (error: any) {
    console.error("Backup codes retrieval error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to retrieve backup codes", 
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
 * POST handler to generate new backup codes
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
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        email: true,
        twoFactorEnabled: true,
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
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Two-factor authentication must be enabled to generate backup codes" 
        },
        { status: 400 }
      );
    }
    
    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    
    // Update user with new backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        backupCodes: backupCodes
      }
    });
    
    // Get client IP for audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        resourceType: "BACKUP_CODES",
        resourceId: user.id,
        description: "Generated new backup codes",
        ipAddress: clientIp,
        metadata: {
          count: backupCodes.length,
          regenerated: user.backupCodes !== null && Array.isArray(user.backupCodes)
        },
        userId: user.id,
        actionedBy: user.id
      }
    });
    
    // Return new backup codes
    return NextResponse.json({
      success: true,
      message: "Backup codes generated successfully",
      data: {
        backupCodes: backupCodes,
        count: backupCodes.length
      }
    });
    
  } catch (error: any) {
    console.error("Backup codes generation error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to generate backup codes", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
