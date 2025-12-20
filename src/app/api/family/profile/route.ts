/**
 * Family Profile Management API for CareLinkAI
 * 
 * This API handles Family-specific profile operations:
 * - GET: Retrieve Family profile with care context
 * - PATCH: Update or create Family profile information
 * 
 * Features:
 * - RBAC enforcement (FAMILY role only)
 * - Input validation with Zod
 * - Auto-creation of Family record if doesn't exist
 * - Care context management (recipient details, mobility, diagnosis)
 * - Audit logging for profile changes
 * 
 * Related Models:
 * - Family (primaryContactName, phone, relationshipToRecipient, etc.)
 * - User (base profile linked to Family)
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";
import { requireAnyRole } from "@/lib/rbac";
import { z } from "zod";

// Initialize Prisma client
const prisma = new PrismaClient();

// Family profile validation schema
const familyProfileUpdateSchema = z.object({
  // Primary contact information
  primaryContactName: z.string()
    .min(2, "Primary contact name must be at least 2 characters")
    .max(100, "Primary contact name must not exceed 100 characters")
    .optional()
    .nullable(),
  
  phone: z.string()
    .regex(/^[\d\s\-\+\(\)]+$/, "Phone number must contain only digits and standard formatting characters")
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must not exceed 20 characters")
    .optional()
    .nullable(),
  
  relationshipToRecipient: z.string()
    .min(1, "Relationship is required")
    .max(50, "Relationship must not exceed 50 characters")
    .optional()
    .nullable(),
  
  // Care recipient details
  recipientAge: z.number()
    .int("Age must be a whole number")
    .min(0, "Age must be 0 or greater")
    .max(150, "Age must be less than 150")
    .optional()
    .nullable(),
  
  primaryDiagnosis: z.string()
    .max(1000, "Primary diagnosis must not exceed 1000 characters")
    .optional()
    .nullable(),
  
  mobilityLevel: z.string()
    .min(1, "Mobility level is required")
    .max(50, "Mobility level must not exceed 50 characters")
    .optional()
    .nullable(),
  
  careNotes: z.string()
    .max(2000, "Care notes must not exceed 2000 characters")
    .optional()
    .nullable(),
});

/**
 * GET handler to retrieve Family profile
 * 
 * @returns Family profile data with care context
 * @throws 401 if not authenticated
 * @throws 403 if not FAMILY role
 * @throws 404 if Family record doesn't exist yet
 */
export async function GET(request: NextRequest) {
  try {
    // Enforce RBAC - only FAMILY role can access
    const { session, error } = await requireAnyRole([]);
    if (error) return error;

    const userId = session!.user!.id!;

    // Fetch Family record with User relation
    const family = await prisma.family.findUnique({
      where: { userId },
      select: {
        id: true,
        primaryContactName: true,
        phone: true,
        relationshipToRecipient: true,
        recipientAge: true,
        primaryDiagnosis: true,
        mobilityLevel: true,
        careNotes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          }
        }
      }
    });

    // Handle case where Family record doesn't exist yet
    if (!family) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Family profile not found. Please complete your profile setup.",
          needsSetup: true
        },
        { status: 404 }
      );
    }

    // Create audit log entry for profile view
    await prisma.auditLog.create({
      data: {
        action: AuditAction.READ,
        resourceType: "FAMILY_PROFILE",
        resourceId: family.id,
        description: "Family user viewed their profile",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userId: userId,
        actionedBy: userId
      }
    });

    // Return Family profile data
    return NextResponse.json({
      success: true,
      data: family
    });

  } catch (error: any) {
    console.error("Family profile retrieval error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve Family profile",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PATCH handler to update or create Family profile
 * 
 * @param request Contains Family profile fields to update
 * @returns Updated Family profile
 * @throws 401 if not authenticated
 * @throws 403 if not FAMILY role
 * @throws 400 if validation fails
 */
export async function PATCH(request: NextRequest) {
  try {
    // Enforce RBAC - only FAMILY role can update
    const { session, error } = await requireAnyRole([]);
    if (error) return error;

    const userId = session!.user!.id!;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = familyProfileUpdateSchema.safeParse(body);

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

    const validatedData = validationResult.data;

    // Prepare update data (only include fields that were provided)
    const updateData: any = {};
    if (validatedData.primaryContactName !== undefined) {
      updateData.primaryContactName = validatedData.primaryContactName;
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone;
    }
    if (validatedData.relationshipToRecipient !== undefined) {
      updateData.relationshipToRecipient = validatedData.relationshipToRecipient;
    }
    if (validatedData.recipientAge !== undefined) {
      updateData.recipientAge = validatedData.recipientAge;
    }
    if (validatedData.primaryDiagnosis !== undefined) {
      updateData.primaryDiagnosis = validatedData.primaryDiagnosis;
    }
    if (validatedData.mobilityLevel !== undefined) {
      updateData.mobilityLevel = validatedData.mobilityLevel;
    }
    if (validatedData.careNotes !== undefined) {
      updateData.careNotes = validatedData.careNotes;
    }

    // Use upsert to create or update Family record
    const family = await prisma.family.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData
      },
      select: {
        id: true,
        primaryContactName: true,
        phone: true,
        relationshipToRecipient: true,
        recipientAge: true,
        primaryDiagnosis: true,
        mobilityLevel: true,
        careNotes: true,
        updatedAt: true,
      }
    });

    // Get client IP for audit logging
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";

    // Create audit log entry for profile update
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "FAMILY_PROFILE",
        resourceId: family.id,
        description: "Family user updated their profile",
        ipAddress: clientIp,
        metadata: {
          updatedFields: Object.keys(updateData)
        },
        userId: userId,
        actionedBy: userId
      }
    });

    // Return success response with updated data
    return NextResponse.json({
      success: true,
      message: "Family profile updated successfully",
      data: family
    });

  } catch (error: any) {
    console.error("Family profile update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update Family profile",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
