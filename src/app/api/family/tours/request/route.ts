/**
 * POST /api/family/tours/request
 * Request a tour for a specific home
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { smsService } from "@/lib/sms/sms-service";
import { sendTourConfirmationEmail } from "@/lib/notifications/tour-notifications";
import { captureError } from '@/lib/sentry';
import { errorSummary } from '@/lib/log-safe';
import { notifyUnclaimedHomeInquiry, isUnclaimedHome } from "@/lib/claim-engine/inquiry-claim-notification";
import { recordLeadConsent } from "@/lib/consent/lead-consent";
import { LEAD_CONSENT_FORMS } from "@/lib/consent/lead-consent-text";
import { sendNewLeadOperatorEmail } from "@/lib/email";
import { routeUnclaimedInquiry } from "@/lib/leads/web-inquiry-lead";

const tourRequestSchema = z.object({
  homeId: z.string(),
  requestedTimes: z.array(z.string().datetime()), // ISO 8601 datetime strings
  familyNotes: z.string().optional(),
  // TCPA/marketing consent from LeadConsentCheckbox — z.unknown so a missing/
  // malformed payload can never fail validation; server normalizes to false.
  consent: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // === STEP 0: Environment & Database Check ===
    
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      captureError(dbError instanceof Error ? dbError : new Error(String(dbError)), {
        tags: { route: 'family:tours:request' },
      });
      console.error('🟢 [TOUR API] ❌ Database connection FAILED:', errorSummary(dbError));
      throw new Error("Database connection failed");
    }

    // === STEP 1: Authentication ===
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error('🟢 [TOUR API] ❌ AUTHENTICATION FAILED - No session or user');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    

    // === STEP 2: Authorization ===
    
    const hasRequiredPermission = hasPermission(session.user.role, PERMISSIONS.TOURS_REQUEST);
    
    if (!hasRequiredPermission) {
      console.error('🟢 [TOUR API] ❌ AUTHORIZATION FAILED');
      console.error('🟢 [TOUR API] User role:', session.user.role);
      console.error('🟢 [TOUR API] Required permission:', PERMISSIONS.TOURS_REQUEST);
      return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 });
    }
    

    // === STEP 3: Request Body Parsing & Validation ===
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      captureError(parseError instanceof Error ? parseError : new Error(String(parseError)), {
        tags: { route: 'family:tours:request' },
      });
      console.error('🟢 [TOUR API] ❌ JSON PARSING FAILED:', errorSummary(parseError));
      throw new Error("Invalid JSON in request body");
    }
    
    
    let validatedData;
    try {
      validatedData = tourRequestSchema.parse(body);
    } catch (validationError) {
      captureError(validationError instanceof Error ? validationError : new Error(String(validationError)), {
        tags: { route: 'family:tours:request' },
      });
      console.error('🟢 [TOUR API] ❌ SCHEMA VALIDATION FAILED:', errorSummary(validationError));
      throw validationError;
    }

    // === STEP 4: Fetch Family Record ===
    
    let family;
    try {
      family = await prisma.family.findUnique({
        where: { userId: session.user.id },
        include: {
          user: true,
        },
      });
    } catch (dbError) {
      captureError(dbError instanceof Error ? dbError : new Error(String(dbError)), {
        tags: { route: 'family:tours:request' },
      });
      console.error('🟢 [TOUR API] ❌ DATABASE QUERY FAILED (Family):', errorSummary(dbError));
      throw new Error("Failed to fetch family record");
    }

    if (!family) {
      console.error('🟢 [TOUR API] ❌ FAMILY RECORD NOT FOUND');
      console.error('🟢 [TOUR API] User ID:', session.user.id);
      return NextResponse.json({ error: "Family record not found" }, { status: 404 });
    }
    

    // === STEP 5: Validate Home ID Format ===
    
    if (typeof validatedData.homeId !== 'string' || validatedData.homeId.trim() === '') {
      console.error('🟢 [TOUR API] ❌ INVALID HOME ID FORMAT');
      return NextResponse.json({ 
        error: "Invalid home ID format",
        homeId: validatedData.homeId 
      }, { status: 400 });
    }
    

    // === STEP 6: Fetch Home & Operator Details (Enhanced - Supports Slug & UUID) ===
    
    let home;
    try {
      // 🎯 CRITICAL FIX: Query by slug OR id to support both formats
      // This handles:
      // - UUID format: "cmj23f02j0001ru4npd..." (from real database)
      // - Slug format: "home_1" (from mock data or friendly URLs)
      home = await prisma.assistedLivingHome.findFirst({
        where: {
          OR: [
            { slug: validatedData.homeId },      // Try slug first (e.g., "home_1")
            { id: validatedData.homeId }         // Fallback to UUID
          ],
          status: 'ACTIVE'                       // Only active homes
        },
        include: {
          operator: {
            include: {
              user: true,
            },
          },
          address: true,
        },
      });
    } catch (dbError) {
      captureError(dbError instanceof Error ? dbError : new Error(String(dbError)), {
        tags: { route: 'family:tours:request' },
      });
      console.error('🟢 [TOUR API] ❌ DATABASE QUERY FAILED (Home):', errorSummary(dbError));
      throw new Error("Failed to fetch home details");
    }

    // === Enhanced Home Not Found Diagnostics ===
    if (!home) {
      console.error('🟢 [TOUR API] ❌ HOME NOT FOUND');
      console.error('🟢 [TOUR API] Home ID requested:', validatedData.homeId);
      console.error('🟢 [TOUR API] Searched by: slug AND id');
      console.error('🟢 [TOUR API] Running database diagnostics...');
      
      try {
        // Check total homes in database
        const totalHomes = await prisma.assistedLivingHome.count();
        const activeHomes = await prisma.assistedLivingHome.count({ where: { status: 'ACTIVE' } });
        console.error('🟢 [TOUR API] Total homes in database:', totalHomes);
        console.error('🟢 [TOUR API] Active homes in database:', activeHomes);
        
        if (totalHomes === 0) {
          console.error('🟢 [TOUR API] ❌ DATABASE IS EMPTY - No homes available');
          return NextResponse.json({
            error: "Home not found",
            homeId: validatedData.homeId,
            totalHomes: 0,
            suggestion: "No homes in database. Please run seed script or contact administrator.",
            diagnostics: {
              databaseEmpty: true,
              requestedId: validatedData.homeId,
              lookupMethods: ['slug', 'id']
            }
          }, { status: 404 });
        }
        
        // Get sample home IDs and slugs for debugging
        const sampleHomes = await prisma.assistedLivingHome.findMany({
          take: 10,
          select: { 
            id: true,
            slug: true,
            name: true,
            status: true,
            operatorId: true
          },
          orderBy: { createdAt: 'desc' }
        });
        
        console.error('🟢 [TOUR API] Sample homes from database (with slugs):');
        sampleHomes.forEach((h, idx) => {
          console.error(`🟢 [TOUR API]   ${idx + 1}. ID: ${h.id}, Slug: ${h.slug || '(none)'}, Name: ${h.name}, Status: ${h.status}`);
        });
        
        // Check if requested ID matches any inactive home
        const inactiveMatch = await prisma.assistedLivingHome.findFirst({
          where: {
            OR: [
              { slug: validatedData.homeId },
              { id: validatedData.homeId }
            ],
            status: { not: 'ACTIVE' }
          },
          select: { id: true, slug: true, name: true, status: true }
        });
        
        if (inactiveMatch) {
          console.error('🟢 [TOUR API] ⚠️ Found INACTIVE home matching ID:');
          console.error(`🟢 [TOUR API]   - ${inactiveMatch.name} (Status: ${inactiveMatch.status})`);
          return NextResponse.json({
            error: "Home not available",
            homeId: validatedData.homeId,
            reason: `This home is not currently accepting tours (Status: ${inactiveMatch.status})`,
            suggestion: "Please choose a different home or contact the administrator.",
            diagnostics: {
              homeFound: true,
              homeActive: false,
              status: inactiveMatch.status
            }
          }, { status: 403 });
        }
        
        return NextResponse.json({
          error: "Home not found",
          homeId: validatedData.homeId,
          totalHomes: totalHomes,
          activeHomes: activeHomes,
          suggestion: `Home not found. Searched by both slug and UUID. Database has ${activeHomes} active homes.`,
          diagnostics: {
            requestedId: validatedData.homeId,
            totalHomesInDatabase: totalHomes,
            activeHomesInDatabase: activeHomes,
            lookupMethods: ['slug', 'id'],
            sampleHomes: sampleHomes.map(h => ({
              id: h.id,
              slug: h.slug || null,
              name: h.name,
              status: h.status
            }))
          }
        }, { status: 404 });
        
      } catch (diagnosticError) {
        captureError(diagnosticError instanceof Error ? diagnosticError : new Error(String(diagnosticError)), {
          tags: { route: 'family:tours:request' },
        });
        console.error('🟢 [TOUR API] ❌ Error running diagnostics:', errorSummary(diagnosticError));
        return NextResponse.json({ 
          error: "Home not found",
          homeId: validatedData.homeId,
          message: "The requested home does not exist or is not active"
        }, { status: 404 });
      }
    }
    
    
    // === Check Home Status ===
    
    if (home.status !== 'ACTIVE') {
      console.error('🟢 [TOUR API] ⚠️ HOME IS NOT ACTIVE');
      console.error('🟢 [TOUR API] Home status:', home.status);
      console.error('🟢 [TOUR API] Proceeding anyway (business logic TBD)');
      // Note: Currently allowing tours for non-active homes
      // Update this based on business requirements
    }

    // === STEP 7: Validate Requested Times ===
    
    if (!validatedData.requestedTimes || !Array.isArray(validatedData.requestedTimes) || validatedData.requestedTimes.length === 0) {
      console.error('🟢 [TOUR API] ❌ REQUESTED TIMES MISSING OR INVALID');
      return NextResponse.json({ 
        error: "Requested times are required",
        requestedTimes: validatedData.requestedTimes 
      }, { status: 400 });
    }
    

    // === STEP 8: Create Tour Request ===
    
    const createData = {
      familyId: family.id,
      homeId: home.id,
      operatorId: home.operatorId,
      requestedTimes: validatedData.requestedTimes,
      familyNotes: validatedData.familyNotes,
      status: "PENDING" as const,
    };
    

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
      
    } catch (dbError) {
      captureError(dbError instanceof Error ? dbError : new Error(String(dbError)), {
        tags: { route: 'family:tours:request' },
      });
      // OL-230: the Prisma error can echo familyNotes — log its class/code only.
      console.error('🟢 [TOUR API] ❌ DATABASE INSERT FAILED:', errorSummary(dbError));
      throw new Error("Failed to create tour request in database");
    }

    // Immutable TCPA/marketing consent evidence (both states). Contact is the
    // account snapshot — this form types no contact fields. Never blocks the
    // tour request (recorder swallows its own errors).
    await recordLeadConsent({
      consent: validatedData.consent,
      sourceForm: LEAD_CONSENT_FORMS.TOUR_REQUEST,
      req: request,
      contactName: `${family.user.firstName ?? ''} ${family.user.lastName ?? ''}`.trim() || null,
      contactEmail: family.user.email,
      contactPhone: family.user.phone ?? null,
      tourRequestId: tourRequest.id,
    });

    // === STEP 9: Send Notification ===
    const operatorPhone = tourRequest.operator?.user?.phone;
    if (operatorPhone) {
      const familyName = tourRequest.family?.user
        ? `${tourRequest.family.user.firstName} ${tourRequest.family.user.lastName}`
        : 'A family';
      smsService.sendTourBookedAlert(
        operatorPhone,
        tourRequest.operator!.user!.firstName,
        familyName,
        tourRequest.home.name
      ).catch(() => {});
    }

    // Email backup of the operator tour alert — CLAIMED homes only (never the
    // directory sentinel). SMS can be missing/undeliverable; email is reliable.
    const operatorEmail = tourRequest.operator?.user?.email;
    if (operatorEmail && !isUnclaimedHome(operatorEmail)) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://getcarelinkai.com';
      sendNewLeadOperatorEmail({
        facilityName: tourRequest.home.name,
        toEmail: operatorEmail,
        operatorFirstName: tourRequest.operator?.user?.firstName,
        leadType: 'tour',
        ctaUrl: `${appUrl.replace(/\/$/, '')}/operator/tours`,
      }).catch(() => {});
    }

    // Tour→claim "pull" engine: a tour is the HOTTEST lead — nudge an UNCLAIMED
    // facility to claim with urgent copy ("confirm the visit"). Self-filters to
    // unclaimed homes with a known outreach email; non-blocking, generic (no PHI).
    notifyUnclaimedHomeInquiry({
      homeId: tourRequest.homeId,
      inquiryId: tourRequest.id,
      trigger: 'tour',
    }).catch(() => {});

    // OL-179: an UNCLAIMED home has no operator to confirm the visit and the claim
    // drip is paused — queue it in the admin inbound queue ("web tour request"),
    // alert ADMIN_NOTIFY_EMAIL and confirm to the family. Contact is the family's
    // account (this form types none). Never throws.
    const homeUnclaimed = isUnclaimedHome(operatorEmail);
    if (homeUnclaimed) {
      const u = tourRequest.family?.user;
      // Payer lane only if this family gave one: their latest inquiry or concierge-search answer.
      const lastPayer =
        (await prisma.inquiry
          .findFirst({ where: { familyId: tourRequest.familyId, payerSource: { not: null } }, orderBy: { createdAt: 'desc' }, select: { payerSource: true } })
          .catch(() => null)) ??
        (u?.id
          ? await prisma.placementSearch
              .findFirst({ where: { userId: u.id, payerSource: { not: null } }, orderBy: { createdAt: 'desc' }, select: { payerSource: true } })
              .catch(() => null)
          : null);
      await routeUnclaimedInquiry({
        inquiryId: null,
        tourRequestId: tourRequest.id,
        homeId: tourRequest.homeId,
        homeName: tourRequest.home.name,
        contactName: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || null : null,
        contactEmail: u?.email ?? null,
        contactPhone: u?.phone ?? null,
        payerSource: lastPayer?.payerSource ?? null,
        additionalInfo: null,
        requestedTimes: Array.isArray(tourRequest.requestedTimes) ? (tourRequest.requestedTimes as string[]) : [],
        receivedAt: tourRequest.createdAt,
      });
    }

    // === STEP 10: Prepare Response ===
    
    const responseData = {
      success: true,
      unclaimed: homeUnclaimed,
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

    return NextResponse.json(responseData);
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'family:tours:request' },
    });
    // OL-230: class/code only — the message, stack and Zod issues can echo the request.
    console.error('🔴 [TOUR API] ERROR:', errorSummary(error));

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
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


    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
