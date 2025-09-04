/**
 * Operator Preferences API for CareLinkAI
 * 
 * This API handles organization-level preferences operations:
 * - GET: Retrieve operator preferences
 * - PUT: Update operator preferences
 * 
 * Features:
 * - Authentication and role verification (OPERATOR only)
 * - Notification preferences for reminders
 * - Deep merging of preferences
 * - Input validation with Zod
 * - Error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-db-simple";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Reminder preferences schema
const reminderPrefsSchema = z.object({
  channels: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
  offsets: z.array(z.number().positive()).optional(),
});

// Notification preferences schema
const notificationPrefsSchema = z.object({
  reminders: reminderPrefsSchema.optional(),
});

// Overall preferences schema
const preferencesSchema = z.object({
  notifications: notificationPrefsSchema.optional(),
});

/**
 * Deep merge helper for preferences objects
 */
function deepMerge(target: any, source: any): any {
  // If either is not an object, prefer the source value
  if (
    target === null ||
    source === null ||
    typeof target !== "object" ||
    typeof source !== "object" ||
    Array.isArray(target) ||
    Array.isArray(source)
  ) {
    return source;
  }

  const result: Record<string, any> = { ...target };
  
  for (const key of Object.keys(source)) {
    if (key in target) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * GET handler to retrieve operator preferences
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
    
    // Verify user is an operator
    if (session.user.role !== "OPERATOR") {
      return NextResponse.json(
        { success: false, message: "Access denied: Operator role required" },
        { status: 403 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Find operator by user ID
    const operator = await prisma.operator.findUnique({
      where: { userId },
      select: {
        id: true,
        companyName: true,
        preferences: true
      }
    });
    
    if (!operator) {
      return NextResponse.json(
        { success: false, message: "Operator not found" },
        { status: 404 }
      );
    }
    
    // Return preferences data
    return NextResponse.json({
      success: true,
      data: {
        preferences: operator.preferences || {},
        operatorId: operator.id,
        companyName: operator.companyName
      }
    });
    
  } catch (error: any) {
    console.error("Operator preferences retrieval error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to retrieve operator preferences", 
        error: process.env['NODE_ENV'] === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT handler to update operator preferences
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
    
    // Verify user is an operator
    if (session.user.role !== "OPERATOR") {
      return NextResponse.json(
        { success: false, message: "Access denied: Operator role required" },
        { status: 403 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Find operator by user ID
    const operator = await prisma.operator.findUnique({
      where: { userId },
      select: {
        id: true,
        preferences: true
      }
    });
    
    if (!operator) {
      return NextResponse.json(
        { success: false, message: "Operator not found" },
        { status: 404 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
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
    
    // Get existing preferences or initialize empty object
    const existingPreferences = operator.preferences || {};
    
    // Deep merge the preferences
    const updatedPreferences = deepMerge(existingPreferences, validatedData);
    
    // Update operator record with new preferences
    await prisma.operator.update({
      where: { id: operator.id },
      data: { preferences: updatedPreferences }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      data: {
        preferences: updatedPreferences
      }
    });
    
  } catch (error: any) {
    console.error("Operator preferences update error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update operator preferences", 
        error: process.env['NODE_ENV'] === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - alias to PUT for partial updates
 */
export async function PATCH(request: NextRequest) {
  return PUT(request);
}
