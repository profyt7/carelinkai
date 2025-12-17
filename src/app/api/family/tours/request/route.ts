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
  console.log('🟢🟢🟢 [TOUR API] ========================================');
  console.log('🟢 [TOUR API] Tour request received!');
  console.log('🟢 [TOUR API] Timestamp:', new Date().toISOString());
  console.log('🟢 [TOUR API] Method:', request.method);
  console.log('🟢 [TOUR API] URL:', request.url);

  try {
    // === STEP 0: Environment & Database Check ===
    console.log('🟢 [TOUR API] Step 0: Environment & Database Check');
    console.log('🟢 [TOUR API] NODE_ENV:', process.env.NODE_ENV);
    console.log('🟢 [TOUR API] DATABASE_URL configured:', !!process.env.DATABASE_URL);
    console.log('🟢 [TOUR API] Checking database connection...');
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('🟢 [TOUR API] ✅ Database connection SUCCESSFUL');
    } catch (dbError) {
      console.error('🟢 [TOUR API] ❌ Database connection FAILED:', dbError);
      throw new Error("Database connection failed");
    }

    // === STEP 1: Authentication ===
    console.log('🟢 [TOUR API] Step 1: Authentication Check');
    console.log('🟢 [TOUR API] Fetching session...');
    
    const session = await getServerSession(authOptions);
    
    console.log('🟢 [TOUR API] Session exists:', !!session);
    console.log('🟢 [TOUR API] Session user exists:', !!session?.user);
    
    if (session?.user) {
      console.log('🟢 [TOUR API] User authenticated:', {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        name: session.user.name
      });
    }
    
    if (!session?.user) {
      console.error('🟢 [TOUR API] ❌ AUTHENTICATION FAILED - No session or user');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log('🟢 [TOUR API] ✅ Authentication SUCCESSFUL');

    // === STEP 2: Authorization ===
    console.log('🟢 [TOUR API] Step 2: Authorization Check');
    console.log('🟢 [TOUR API] User role:', session.user.role);
    console.log('🟢 [TOUR API] Required permission:', PERMISSIONS.TOURS_REQUEST);
    
    const hasRequiredPermission = hasPermission(session.user.role, PERMISSIONS.TOURS_REQUEST);
    console.log('🟢 [TOUR API] Has permission:', hasRequiredPermission);
    
    if (!hasRequiredPermission) {
      console.error('🟢 [TOUR API] ❌ AUTHORIZATION FAILED');
      console.error('🟢 [TOUR API] User role:', session.user.role);
      console.error('🟢 [TOUR API] Required permission:', PERMISSIONS.TOURS_REQUEST);
      return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 });
    }
    
    console.log('🟢 [TOUR API] ✅ Authorization SUCCESSFUL');

    // === STEP 3: Request Body Parsing & Validation ===
    console.log('🟢 [TOUR API] Step 3: Request Body Parsing & Validation');
    
    let body;
    try {
      body = await request.json();
      console.log('🟢 [TOUR API] Body parsed successfully');
      console.log('🟢 [TOUR API] Raw body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('🟢 [TOUR API] ❌ JSON PARSING FAILED:', parseError);
      throw new Error("Invalid JSON in request body");
    }
    
    console.log('🟢 [TOUR API] Validating against schema...');
    console.log('🟢 [TOUR API] Expected: { homeId: string, requestedTimes: string[], familyNotes?: string }');
    
    let validatedData;
    try {
      validatedData = tourRequestSchema.parse(body);
      console.log('🟢 [TOUR API] ✅ Schema validation SUCCESSFUL');
      console.log('🟢 [TOUR API] Body fields:', {
        homeId: validatedData.homeId,
        requestedTimesCount: validatedData.requestedTimes?.length,
        hasFamilyNotes: !!validatedData.familyNotes
      });
    } catch (validationError) {
      console.error('🟢 [TOUR API] ❌ SCHEMA VALIDATION FAILED:', validationError);
      throw validationError;
    }

    // === STEP 4: Fetch Family Record ===
    console.log('🟢 [TOUR API] Step 4: Fetch Family Record');
    console.log('🟢 [TOUR API] User ID:', session.user.id);
    console.log('🟢 [TOUR API] Querying database for family record...');
    
    let family;
    try {
      family = await prisma.family.findUnique({
        where: { userId: session.user.id },
        include: {
          user: true,
        },
      });
      
      console.log('🟢 [TOUR API] Query executed');
      console.log('🟢 [TOUR API] Family found:', !!family);
      
      if (family) {
        console.log('🟢 [TOUR API] Family details:', {
          id: family.id,
          userId: family.userId,
          name: `${family.user.firstName} ${family.user.lastName}`,
          email: family.user.email
        });
      }
    } catch (dbError) {
      console.error('🟢 [TOUR API] ❌ DATABASE QUERY FAILED (Family):', dbError);
      throw new Error("Failed to fetch family record");
    }

    if (!family) {
      console.error('🟢 [TOUR API] ❌ FAMILY RECORD NOT FOUND');
      console.error('🟢 [TOUR API] User ID:', session.user.id);
      return NextResponse.json({ error: "Family record not found" }, { status: 404 });
    }
    
    console.log('🟢 [TOUR API] ✅ Family Record Found');

    // === STEP 5: Validate Home ID Format ===
    console.log('🟢 [TOUR API] Step 5: Validate Home ID Format');
    console.log('🟢 [TOUR API] Home ID:', validatedData.homeId);
    console.log('🟢 [TOUR API] Home ID type:', typeof validatedData.homeId);
    console.log('🟢 [TOUR API] Home ID length:', validatedData.homeId?.length);
    
    if (typeof validatedData.homeId !== 'string' || validatedData.homeId.trim() === '') {
      console.error('🟢 [TOUR API] ❌ INVALID HOME ID FORMAT');
      return NextResponse.json({ 
        error: "Invalid home ID format",
        homeId: validatedData.homeId 
      }, { status: 400 });
    }
    
    console.log('🟢 [TOUR API] ✅ Home ID format valid');

    // === STEP 6: Fetch Home & Operator Details (Enhanced) ===
    console.log('🟢 [TOUR API] Step 6: Fetch Home & Operator Details (Enhanced)');
    console.log('🟢 [TOUR API] Querying database for home ID:', validatedData.homeId);
    
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
      
      console.log('🟢 [TOUR API] Home query executed');
      console.log('🟢 [TOUR API] Home found:', !!home);
      
      if (home) {
        console.log('🟢 [TOUR API] Home details:', {
          id: home.id,
          name: home.name,
          status: home.status,
          operatorId: home.operatorId,
          operatorName: `${home.operator.user.firstName} ${home.operator.user.lastName}`
        });
      }
    } catch (dbError) {
      console.error('🟢 [TOUR API] ❌ DATABASE QUERY FAILED (Home):', dbError);
      throw new Error("Failed to fetch home details");
    }

    // === Enhanced Home Not Found Diagnostics ===
    if (!home) {
      console.error('🟢 [TOUR API] ❌ HOME NOT FOUND');
      console.error('🟢 [TOUR API] Home ID requested:', validatedData.homeId);
      console.error('🟢 [TOUR API] Running database diagnostics...');
      
      try {
        // Check total homes in database
        const totalHomes = await prisma.assistedLivingHome.count();
        console.error('🟢 [TOUR API] Total homes in database:', totalHomes);
        
        if (totalHomes === 0) {
          console.error('🟢 [TOUR API] ❌ DATABASE IS EMPTY - No homes available');
          return NextResponse.json({
            error: "Home not found",
            homeId: validatedData.homeId,
            totalHomes: 0,
            suggestion: "No homes in database. Please run seed script or contact administrator.",
            diagnostics: {
              databaseEmpty: true,
              requestedId: validatedData.homeId
            }
          }, { status: 404 });
        }
        
        // Get sample home IDs for debugging
        const sampleHomes = await prisma.assistedLivingHome.findMany({
          take: 10,
          select: { 
            id: true, 
            name: true,
            status: true,
            operatorId: true
          },
          orderBy: { createdAt: 'desc' }
        });
        
        console.error('🟢 [TOUR API] Sample homes from database:');
        sampleHomes.forEach((h, idx) => {
          console.error(`🟢 [TOUR API]   ${idx + 1}. ID: ${h.id}, Name: ${h.name}, Status: ${h.status}`);
        });
        
        // Check if requested ID exists with different casing
        const homesWithSimilarId = await prisma.assistedLivingHome.findMany({
          where: {
            id: {
              contains: validatedData.homeId,
              mode: 'insensitive'
            }
          },
          take: 5,
          select: { id: true, name: true }
        });
        
        if (homesWithSimilarId.length > 0) {
          console.error('🟢 [TOUR API] ⚠️ Found homes with similar IDs:');
          homesWithSimilarId.forEach(h => {
            console.error(`🟢 [TOUR API]   - ${h.id} (${h.name})`);
          });
        }
        
        return NextResponse.json({
          error: "Home not found",
          homeId: validatedData.homeId,
          totalHomes: totalHomes,
          suggestion: `Invalid home ID. Database has ${totalHomes} homes. Check the home ID or select from available homes.`,
          diagnostics: {
            requestedId: validatedData.homeId,
            totalHomesInDatabase: totalHomes,
            sampleHomeIds: sampleHomes.map(h => ({
              id: h.id,
              name: h.name,
              status: h.status
            })),
            similarIds: homesWithSimilarId.map(h => h.id)
          }
        }, { status: 404 });
        
      } catch (diagnosticError) {
        console.error('🟢 [TOUR API] ❌ Error running diagnostics:', diagnosticError);
        return NextResponse.json({ 
          error: "Home not found",
          homeId: validatedData.homeId 
        }, { status: 404 });
      }
    }
    
    console.log('🟢 [TOUR API] ✅ Home & Operator Details Found');
    
    // === Check Home Status ===
    console.log('🟢 [TOUR API] Checking home status...');
    console.log('🟢 [TOUR API] Home status:', home.status);
    
    if (home.status !== 'ACTIVE') {
      console.error('🟢 [TOUR API] ⚠️ HOME IS NOT ACTIVE');
      console.error('🟢 [TOUR API] Home status:', home.status);
      console.error('🟢 [TOUR API] Proceeding anyway (business logic TBD)');
      // Note: Currently allowing tours for non-active homes
      // Update this based on business requirements
    }

    // === STEP 7: Validate Requested Times ===
    console.log('🟢 [TOUR API] Step 7: Validate Requested Times');
    console.log('🟢 [TOUR API] Requested times:', validatedData.requestedTimes);
    console.log('🟢 [TOUR API] Number of time slots:', validatedData.requestedTimes?.length);
    
    if (!validatedData.requestedTimes || !Array.isArray(validatedData.requestedTimes) || validatedData.requestedTimes.length === 0) {
      console.error('🟢 [TOUR API] ❌ REQUESTED TIMES MISSING OR INVALID');
      return NextResponse.json({ 
        error: "Requested times are required",
        requestedTimes: validatedData.requestedTimes 
      }, { status: 400 });
    }
    
    console.log('🟢 [TOUR API] ✅ Requested times valid');

    // === STEP 8: Create Tour Request ===
    console.log('🟢 [TOUR API] Step 8: Creating Tour Request');
    
    const createData = {
      familyId: family.id,
      homeId: home.id,
      operatorId: home.operatorId,
      requestedTimes: validatedData.requestedTimes,
      familyNotes: validatedData.familyNotes,
      status: "PENDING",
    };
    
    console.log('🟢 [TOUR API] Data to insert:', {
      familyId: createData.familyId,
      homeId: createData.homeId,
      operatorId: createData.operatorId,
      requestedTimesCount: createData.requestedTimes.length,
      hasFamilyNotes: !!createData.familyNotes,
      status: createData.status
    });

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
      
      console.log('🟢 [TOUR API] ✅ Tour request created successfully!');
      console.log('🟢 [TOUR API] Tour details:', {
        id: tourRequest.id,
        homeId: tourRequest.homeId,
        familyId: tourRequest.familyId,
        status: tourRequest.status,
        createdAt: tourRequest.createdAt
      });
    } catch (dbError) {
      console.error('🟢 [TOUR API] ❌ DATABASE INSERT FAILED!');
      console.error('🟢 [TOUR API] Error:', dbError);
      
      if (dbError instanceof Error) {
        console.error('🟢 [TOUR API] Error name:', dbError.name);
        console.error('🟢 [TOUR API] Error message:', dbError.message);
        console.error('🟢 [TOUR API] Error stack:', dbError.stack);
      }
      
      throw new Error("Failed to create tour request in database");
    }

    // === STEP 9: Send Notification ===
    console.log('🟢 [TOUR API] Step 9: Notification');
    console.log('🟢 [TOUR API] Tour Request ID:', tourRequest.id);
    console.log('🟢 [TOUR API] Notification logged (email integration pending)');

    // === STEP 10: Prepare Response ===
    console.log('🟢 [TOUR API] Step 10: Sending Response');
    
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
    
    console.log('🟢 [TOUR API] Response:', {
      success: responseData.success,
      tourId: responseData.tourRequest.id,
      status: responseData.tourRequest.status
    });
    
    console.log('🟢 [TOUR API] ======================================== ✅');
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('🔴 [TOUR API] ========================================');
    console.error('🔴 [TOUR API] ERROR OCCURRED!');
    console.error('🔴 [TOUR API] Error type:', error?.constructor?.name || "Unknown");
    console.error('🔴 [TOUR API] Error:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('🔴 [TOUR API] Error name:', error.name);
      console.error('🔴 [TOUR API] Error message:', error.message);
      console.error('🔴 [TOUR API] Error stack:', error.stack);
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('🔴 [TOUR API] Zod validation error');
      console.error('🔴 [TOUR API] Validation errors:', JSON.stringify(error.errors, null, 2));
      console.error('🔴 [TOUR API] ======================================== ❌');
      
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
    
    console.error('🔴 [TOUR API] Error message for client:', errorMessage);
    console.error('🔴 [TOUR API] Returning 500 Internal Server Error');
    console.error('🔴 [TOUR API] ======================================== ❌');

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
