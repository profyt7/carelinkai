import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFamilyMembership } from "@/lib/services/family";
import { z } from "zod";
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from "@/lib/rateLimit";
import { createAuditLogFromRequest } from "@/lib/audit";

// Validate PUT request body
const emergencyPreferenceSchema = z.object({
  // Accept any non-empty string so tests (or future UUIDs) won't fail validation
  residentId: z.string().min(1).optional(),
  // Ensure escalationChain is an array (even if element structure is flexible)
  escalationChain: z.array(z.any()),
  notifyMethods: z.array(z.string()),
  careInstructions: z.string().optional(),
});

/**
 * GET /api/family/emergency
 * 
 * Fetches emergency preferences for a family and optional resident
 * Requires authentication and family membership
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 60 req/min per IP
    {
      const key = getClientIp(request as any);
      const limit = 60;
      const rr = await rateLimitAsync({ name: 'family:emergency:GET', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
    }
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const providedFamilyId = searchParams.get("familyId");
    const residentId = searchParams.get("residentId") || undefined;

    // Determine effective familyId
    let effectiveFamilyId = providedFamilyId;
    
    if (!effectiveFamilyId) {
      // Find the first family membership for the user
      const membership = await prisma.familyMember.findFirst({
        where: { userId: session.user.id },
        select: { familyId: true }
      });
      
      if (!membership) {
        return NextResponse.json(
          { error: "No family found for user" },
          { status: 404 }
        );
      }
      
      effectiveFamilyId = membership.familyId;
    }

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(
      session.user.id,
      effectiveFamilyId
    );
    
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // Find existing emergency preference
    const preference = await prisma.emergencyPreference.findUnique({
      where: {
        familyId_residentId: {
          familyId: effectiveFamilyId,
          residentId: residentId || null,
        } as any
      }
    });

    // If no preference exists, return default empty config
    if (!preference) {
      return NextResponse.json({
        preference: {
          escalationChain: [],
          notifyMethods: ["EMAIL"],
          careInstructions: "",
        }
      });
    }

    // Audit log (read)
    await createAuditLogFromRequest(
      request,
      "READ" as any,
      "EmergencyPreference",
      `${effectiveFamilyId}:${residentId || 'none'}`,
      "Fetched emergency preferences"
    );

    return NextResponse.json({ preference });
  } catch (error) {
    console.error("Error fetching emergency preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergency preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/family/emergency
 * 
 * Updates or creates emergency preferences for a family and optional resident
 * Requires authentication and family membership
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limit: 20 req/min per IP for updates
    {
      const key = getClientIp(request as any);
      const limit = 20;
      const rr = await rateLimitAsync({ name: 'family:emergency:PUT', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
    }
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = emergencyPreferenceSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request parameters", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const { residentId, escalationChain, notifyMethods, careInstructions } = validationResult.data;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const providedFamilyId = searchParams.get("familyId");

    // Determine effective familyId
    let effectiveFamilyId = providedFamilyId;
    
    if (!effectiveFamilyId) {
      // Find the first family membership for the user
      const membership = await prisma.familyMember.findFirst({
        where: { userId: session.user.id },
        select: { familyId: true }
      });
      
      if (!membership) {
        return NextResponse.json(
          { error: "No family found for user" },
          { status: 404 }
        );
      }
      
      effectiveFamilyId = membership.familyId;
    }

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(
      session.user.id,
      effectiveFamilyId
    );
    
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // If residentId is provided, verify it belongs to the family
    if (residentId) {
      const resident = await prisma.resident.findFirst({
        where: {
          id: residentId,
          familyId: effectiveFamilyId
        }
      });

      if (!resident) {
        return NextResponse.json(
          { error: "Resident not found or not part of this family" },
          { status: 404 }
        );
      }
    }

    // Upsert emergency preference
    const preference = await prisma.emergencyPreference.upsert({
      where: {
        familyId_residentId: ({
          familyId: effectiveFamilyId,
          residentId: residentId || null,
        } as any)
      },
      update: {
        escalationChain,
        notifyMethods,
        careInstructions,
        lastConfirmedAt: new Date(),
      },
      create: {
        familyId: effectiveFamilyId,
        residentId: residentId || null,
        escalationChain,
        notifyMethods,
        careInstructions,
        lastConfirmedAt: new Date(),
      }
    });

    // Audit log (update)
    await createAuditLogFromRequest(
      request,
      "UPDATE" as any,
      "EmergencyPreference",
      `${effectiveFamilyId}:${residentId || 'none'}`,
      "Updated emergency preferences",
      { notifyMethods: notifyMethods?.length ?? 0, chainLength: escalationChain?.length ?? 0 }
    );

    return NextResponse.json({ preference });
  } catch (error) {
    console.error("Error updating emergency preferences:", error);
    return NextResponse.json(
      { error: "Failed to update emergency preferences" },
      { status: 500 }
    );
  }
}
