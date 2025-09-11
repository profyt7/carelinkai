/**
 * User Preferences Management API for CareLinkAI
 * 
 * This API handles user preferences operations:
 * - GET: Retrieve user preferences
 * - PUT: Update user preferences
 * 
 * Features:
 * - Notification preferences (email, SMS, in-app)
 * - Privacy settings
 * - Accessibility options
 * - Theme and display preferences
 * - Role-specific preferences
 * - Input validation
 * - Security checks (authentication)
 * - Audit logging for preference changes
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole, AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-db-simple";
import { z } from "zod";

// Initialize Prisma client
const prisma = new PrismaClient();

// Base notification preferences schema
const notificationPrefsSchema = z.object({
  email: z.object({
    marketing: z.boolean().default(true),
    updates: z.boolean().default(true),
    security: z.boolean().default(true),
    reminders: z.boolean().default(true)
  }).optional(),
  sms: z.object({
    marketing: z.boolean().default(false),
    updates: z.boolean().default(false),
    security: z.boolean().default(true),
    reminders: z.boolean().default(false)
  }).optional(),
  inApp: z.object({
    marketing: z.boolean().default(true),
    updates: z.boolean().default(true),
    security: z.boolean().default(true),
    reminders: z.boolean().default(true),
    messages: z.boolean().default(true)
  }).optional()
});

// Privacy settings schema
const privacySettingsSchema = z.object({
  profileVisibility: z.enum(["PUBLIC", "CONNECTIONS", "PRIVATE"]).default("CONNECTIONS"),
  shareContactInfo: z.boolean().default(false),
  shareLocation: z.boolean().default(false),
  allowDataAnalytics: z.boolean().default(true),
  allowThirdPartySharing: z.boolean().default(false)
});

// Accessibility options schema
const accessibilityOptionsSchema = z.object({
  highContrast: z.boolean().default(false),
  largeText: z.boolean().default(false),
  screenReader: z.boolean().default(false),
  reduceMotion: z.boolean().default(false),
  colorBlindMode: z.enum(["NONE", "PROTANOPIA", "DEUTERANOPIA", "TRITANOPIA"]).default("NONE")
});

// Display preferences schema
const displayPrefsSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]).default("SYSTEM"),
  language: z.string().default("en"),
  timezone: z.string().optional(),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).default("MM/DD/YYYY"),
  timeFormat: z.enum(["12H", "24H"]).default("12H")
});

// Role-specific preference schemas
const familyPrefsSchema = z.object({
  careUpdatesFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "REAL_TIME"]).default("DAILY"),
  medicationReminders: z.boolean().default(true),
  emergencyContactNotification: z.boolean().default(true)
});

const operatorPrefsSchema = z.object({
  occupancyAlerts: z.boolean().default(true),
  staffingReminders: z.boolean().default(true),
  financialReports: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("WEEKLY"),
  maintenanceAlerts: z.boolean().default(true)
});

const caregiverPrefsSchema = z.object({
  shiftReminders: z.boolean().default(true),
  availabilityUpdates: z.boolean().default(true),
  certificationReminders: z.boolean().default(true),
  trainingOpportunities: z.boolean().default(true)
});

const affiliatePrefsSchema = z.object({
  referralUpdates: z.boolean().default(true),
  commissionReports: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("WEEKLY"),
  marketingMaterials: z.boolean().default(true)
});

// Combined preferences schema
const preferencesSchema = z.object({
  notifications: notificationPrefsSchema.optional(),
  privacy: privacySettingsSchema.optional(),
  accessibility: accessibilityOptionsSchema.optional(),
  display: displayPrefsSchema.optional(),
  roleSpecific: z.union([
    familyPrefsSchema,
    operatorPrefsSchema,
    caregiverPrefsSchema,
    affiliatePrefsSchema
  ]).optional()
});

/**
 * GET handler to retrieve user preferences
 */
export async function GET(request: NextRequest) {
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
    
    // Get user from database with preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        preferences: true,
        notificationPrefs: true,
        timezone: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Get role-specific preferences based on user role
    // Combine all preferences held on the user record
    const combinedPreferences = {
      notifications: user.notificationPrefs || {},
      display: {
        timezone: user.timezone || "UTC"
      },
      ...((user.preferences as any) || {})
    };
    
    // Create audit log entry for preferences view
    await prisma.auditLog.create({
      data: {
        action: AuditAction.READ,
        resourceType: "USER_PREFERENCES",
        resourceId: userId,
        description: "User viewed their preferences",
        ipAddress: request.headers.get("x-forwarded-for") || 
                  // @ts-ignore - `ip` exists only in Node runtime requests
                  (request as any).ip || 
                  "unknown",
        userId: userId,
        actionedBy: userId
      }
    });
    
    // Return preferences data
    return NextResponse.json({
      success: true,
      data: {
        preferences: combinedPreferences,
        role: user.role
      }
    });
    
  } catch (error: any) {
    console.error("Preferences retrieval error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to retrieve preferences", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT handler to update user preferences
 */
export async function PUT(request: NextRequest) {
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
    
    // Get user to determine role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, preferences: true, notificationPrefs: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = preferencesSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid preferences data", 
          errors: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    
    // Extract different types of preferences
    const { notifications, privacy, accessibility, display, roleSpecific } = validatedData;
    
    // Update base user preferences
    const existingPreferences = (user.preferences as any) || {};
    const updatedPreferences = {
      ...existingPreferences,
      privacy: privacy || existingPreferences.privacy,
      accessibility: accessibility || existingPreferences.accessibility,
      display: display || existingPreferences.display,
      // Persist any roleSpecific section inside the main preferences JSON
      roleSpecific: roleSpecific || existingPreferences.roleSpecific
    };
    
    // Update user record with preferences
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPreferences,
        // Cast to `any` to satisfy Prisma JSON input types while preserving existing value
        notificationPrefs: (notifications as any) ?? (user.notificationPrefs as any),
        timezone: display?.timezone || undefined
      }
    });
    
    // No separate role-specific tables to update. All data now saved on User.preferences
    
    // Get client IP for audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Create audit log entry for preferences update
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "USER_PREFERENCES",
        resourceId: userId,
        description: "User updated their preferences",
        ipAddress: clientIp,
        metadata: {
          updatedSections: Object.keys(validatedData)
        },
        userId: userId,
        actionedBy: userId
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      data: {
        updatedSections: Object.keys(validatedData)
      }
    });
    
  } catch (error: any) {
    console.error("Preferences update error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update preferences", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PATCH handler - alias to PUT for partial updates
 */
export async function PATCH(request: NextRequest) {
  return PUT(request);
}
