/**
 * POST /api/family/tours/request
 * Request a tour for a specific home
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { sendTourConfirmationEmail } from "@/lib/notifications/tour-notifications";

const tourRequestSchema = z.object({
  homeId: z.string(),
  requestedTimes: z.array(z.string().datetime()), // ISO 8601 datetime strings
  familyNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  🎯 TOUR REQUEST API - POST REQUEST RECEIVED            ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  try {
    // === STEP 0: Environment & Database Check ===
    console.log("📋 [STEP 0] Environment & Database Check");
    console.log("  ├─ NODE_ENV:", process.env.NODE_ENV);
    console.log("  ├─ DATABASE_URL configured:", !!process.env.DATABASE_URL);
    console.log("  └─ Checking database connection...");
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("  ✅ Database connection SUCCESSFUL");
    } catch (dbError) {
      console.error("  ❌ Database connection FAILED:", dbError);
      throw new Error("Database connection failed");
    }

    // === STEP 1: Authentication ===
    console.log("\n🔐 [STEP 1] Authentication Check");
    console.log("  ├─ Fetching session...");
    
    const session = await getServerSession(authOptions);
    
    console.log("  ├─ Session exists:", !!session);
    console.log("  ├─ Session user exists:", !!session?.user);
    
    if (session?.user) {
      console.log("  ├─ User ID:", session.user.id);
      console.log("  ├─ User role:", session.user.role);
      console.log("  ├─ User email:", session.user.email);
      console.log("  └─ User name:", session.user.name);
    }
    
    if (!session?.user) {
      console.error("  ❌ AUTHENTICATION FAILED - No session or user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("  ✅ Authentication SUCCESSFUL");

    // === STEP 2: Authorization ===
    console.log("\n🔑 [STEP 2] Authorization Check");
    console.log("  ├─ User role:", session.user.role);
    console.log("  ├─ Required permission:", PERMISSIONS.TOURS_REQUEST);
    console.log("  ├─ Checking permission...");
    
    const hasRequiredPermission = hasPermission(session.user.role, PERMISSIONS.TOURS_REQUEST);
    console.log("  ├─ Has permission:", hasRequiredPermission);
    
    if (!hasRequiredPermission) {
      console.error("  ❌ AUTHORIZATION FAILED - Insufficient permissions");
      console.error("  ├─ User role:", session.user.role);
      console.error("  └─ Required permission:", PERMISSIONS.TOURS_REQUEST);
      return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 });
    }
    
    console.log("  ✅ Authorization SUCCESSFUL");

    // === STEP 3: Request Body Parsing & Validation ===
    console.log("\n📦 [STEP 3] Request Body Parsing & Validation");
    console.log("  ├─ Parsing JSON body...");
    
    let body;
    try {
      body = await request.json();
      console.log("  ├─ Body parsed successfully");
      console.log("  ├─ Raw body:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("  ❌ JSON PARSING FAILED:", parseError);
      throw new Error("Invalid JSON in request body");
    }
    
    console.log("  ├─ Validating against schema...");
    console.log("  ├─ Expected schema: { homeId: string, requestedTimes: string[], familyNotes?: string }");
    
    let validatedData;
    try {
      validatedData = tourRequestSchema.parse(body);
      console.log("  ├─ Schema validation SUCCESSFUL");
      console.log("  ├─ Validated homeId:", validatedData.homeId);
      console.log("  ├─ Validated requestedTimes:", validatedData.requestedTimes);
      console.log("  ├─ Validated familyNotes:", validatedData.familyNotes || "(none)");
      console.log("  └─ Number of requested times:", validatedData.requestedTimes.length);
    } catch (validationError) {
      console.error("  ❌ SCHEMA VALIDATION FAILED:", validationError);
      throw validationError;
    }
    
    console.log("  ✅ Request Body Validation SUCCESSFUL");

    // === STEP 4: Fetch Family Record ===
    console.log("\n👨‍👩‍👧‍👦 [STEP 4] Fetching Family Record");
    console.log("  ├─ User ID:", session.user.id);
    console.log("  ├─ Querying database for family record...");
    
    let family;
    try {
      family = await prisma.family.findUnique({
        where: { userId: session.user.id },
        include: {
          user: true,
        },
      });
      
      console.log("  ├─ Query executed successfully");
      console.log("  ├─ Family found:", !!family);
      
      if (family) {
        console.log("  ├─ Family ID:", family.id);
        console.log("  ├─ Family user ID:", family.userId);
        console.log("  ├─ Family name:", `${family.user.firstName} ${family.user.lastName}`);
        console.log("  └─ Family email:", family.user.email);
      }
    } catch (dbError) {
      console.error("  ❌ DATABASE QUERY FAILED:", dbError);
      throw new Error("Failed to fetch family record");
    }

    if (!family) {
      console.error("  ❌ FAMILY RECORD NOT FOUND");
      console.error("  └─ User ID:", session.user.id);
      return NextResponse.json({ error: "Family record not found" }, { status: 404 });
    }
    
    console.log("  ✅ Family Record Found");

    // === STEP 5: Fetch Home & Operator Details ===
    console.log("\n🏠 [STEP 5] Fetching Home & Operator Details");
    console.log("  ├─ Home ID:", validatedData.homeId);
    console.log("  ├─ Querying database for home...");
    
    let home;
    try {
      home = await prisma.assistedLivingHome.findUnique({
        where: { id: validatedData.homeId },
        include: {
          operator: {
            include: {
              user: true,
            },
          },
          address: true,
        },
      });
      
      console.log("  ├─ Query executed successfully");
      console.log("  ├─ Home found:", !!home);
      
      if (home) {
        console.log("  ├─ Home ID:", home.id);
        console.log("  ├─ Home name:", home.name);
        console.log("  ├─ Operator ID:", home.operatorId);
        console.log("  ├─ Operator name:", `${home.operator.user.firstName} ${home.operator.user.lastName}`);
        console.log("  └─ Home address:", home.address ? `${home.address.street}, ${home.address.city}` : "(none)");
      }
    } catch (dbError) {
      console.error("  ❌ DATABASE QUERY FAILED:", dbError);
      throw new Error("Failed to fetch home details");
    }

    if (!home) {
      console.error("  ❌ HOME NOT FOUND");
      console.error("  └─ Home ID:", validatedData.homeId);
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }
    
    console.log("  ✅ Home & Operator Details Found");

    // === STEP 6: Create Tour Request ===
    console.log("\n🎫 [STEP 6] Creating Tour Request");
    console.log("  ├─ Preparing data for database insert...");
    
    const createData = {
      familyId: family.id,
      homeId: home.id,
      operatorId: home.operatorId,
      requestedTimes: validatedData.requestedTimes,
      familyNotes: validatedData.familyNotes,
      status: "PENDING",
    };
    
    console.log("  ├─ Insert data:");
    console.log("  │  ├─ familyId:", createData.familyId);
    console.log("  │  ├─ homeId:", createData.homeId);
    console.log("  │  ├─ operatorId:", createData.operatorId);
    console.log("  │  ├─ requestedTimes:", createData.requestedTimes);
    console.log("  │  ├─ familyNotes:", createData.familyNotes || "(none)");
    console.log("  │  └─ status:", createData.status);
    console.log("  ├─ Executing database insert...");

    let tourRequest;
    try {
      tourRequest = await prisma.tourRequest.create({
        data: createData,
        include: {
          family: {
            include: {
              user: true,
            },
          },
          home: {
            include: {
              address: true,
            },
          },
          operator: {
            include: {
              user: true,
            },
          },
        },
      });
      
      console.log("  ├─ Database insert SUCCESSFUL!");
      console.log("  ├─ Tour Request ID:", tourRequest.id);
      console.log("  ├─ Status:", tourRequest.status);
      console.log("  ├─ Created at:", tourRequest.createdAt);
      console.log("  └─ Requested times:", tourRequest.requestedTimes);
    } catch (dbError) {
      console.error("  ❌ DATABASE INSERT FAILED!");
      console.error("  ├─ Error:", dbError);
      
      if (dbError instanceof Error) {
        console.error("  ├─ Error name:", dbError.name);
        console.error("  ├─ Error message:", dbError.message);
        console.error("  └─ Error stack:", dbError.stack);
      }
      
      throw new Error("Failed to create tour request in database");
    }
    
    console.log("  ✅ Tour Request Created Successfully");

    // === STEP 7: Send Notification ===
    console.log("\n📧 [STEP 7] Sending Notification");
    console.log("  ├─ Notification type: Tour Request Created");
    console.log("  ├─ Tour Request ID:", tourRequest.id);
    console.log("  ├─ Family:", `${family.user.firstName} ${family.user.lastName}`);
    console.log("  ├─ Home:", home.name);
    console.log("  ├─ Requested Times:", validatedData.requestedTimes.join(", "));
    console.log("  └─ Status: PENDING CONFIRMATION");
    console.log("  ✅ Notification logged (email integration pending)");

    // === STEP 8: Prepare Response ===
    console.log("\n📤 [STEP 8] Preparing API Response");
    
    const responseData = {
      success: true,
      tourRequest: {
        id: tourRequest.id,
        homeId: tourRequest.homeId,
        homeName: home.name,
        status: tourRequest.status,
        requestedTimes: tourRequest.requestedTimes,
        familyNotes: tourRequest.familyNotes,
        createdAt: tourRequest.createdAt,
      },
    };
    
    console.log("  ├─ Response data prepared:");
    console.log("  │  ├─ success:", responseData.success);
    console.log("  │  ├─ tourRequest.id:", responseData.tourRequest.id);
    console.log("  │  ├─ tourRequest.homeId:", responseData.tourRequest.homeId);
    console.log("  │  ├─ tourRequest.homeName:", responseData.tourRequest.homeName);
    console.log("  │  ├─ tourRequest.status:", responseData.tourRequest.status);
    console.log("  │  └─ tourRequest.requestedTimes:", responseData.tourRequest.requestedTimes);
    
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  ✅ TOUR REQUEST API - COMPLETED SUCCESSFULLY           ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  ❌ TOUR REQUEST API - ERROR CAUGHT                      ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    
    console.error("🚨 [ERROR HANDLER] Caught exception in tour request API");
    console.error("  ├─ Error type:", error?.constructor?.name || "Unknown");
    console.error("  ├─ Error:", error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error("  ├─ Error name:", error.name);
      console.error("  ├─ Error message:", error.message);
      console.error("  ├─ Error stack:");
      console.error(error.stack);
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error("  ├─ Zod validation error detected");
      console.error("  ├─ Validation errors:", JSON.stringify(error.errors, null, 2));
      console.error("  └─ Returning 400 Bad Request");
      
      return NextResponse.json(
        { 
          success: false,
          error: "Validation error", 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    // Determine error message based on environment
    const errorMessage = process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "Failed to create tour request";
    
    console.error("  ├─ Error message for client:", errorMessage);
    console.error("  └─ Returning 500 Internal Server Error");

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
