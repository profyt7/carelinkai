export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/family/membership
 * 
 * Returns the current user's membership role for a given family
 * If familyId is not provided, returns the first membership
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[MEMBERSHIP] Starting GET request');
    
    // Get session - ALLOW ALL AUTHENTICATED USERS (not just FAMILY role)
    const { session, error } = await requireAnyRole([] as any); // Empty array = allow all authenticated
    if (error) {
      console.log('[MEMBERSHIP] Auth error:', error);
      return error;
    }
    
    if (!session?.user) {
      console.log('[MEMBERSHIP] No session user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = (session.user as any).email;
    const userRole = (session.user as any).role;
    
    console.log(`[MEMBERSHIP] User authenticated: ${userEmail} (${userRole})`);

    // Get familyId from query params
    const searchParams = request.nextUrl.searchParams;
    const familyId = searchParams.get("familyId");
    console.log(`[MEMBERSHIP] Requested familyId: ${familyId || 'none (will find any)'}`);

    // Query for family membership
    let membership = await prisma.familyMember.findFirst({
      where: {
        userId,
        ...(familyId && { familyId }),
        status: 'ACTIVE',
      },
      select: {
        familyId: true,
        role: true,
        family: {
          select: {
            id: true,
            userId: true,
          }
        }
      },
    });

    console.log(`[MEMBERSHIP] Found existing membership: ${membership ? 'YES' : 'NO'}`);

    // If no membership found, AUTO-CREATE for ALL authenticated users
    if (!membership) {
      console.log(`[MEMBERSHIP] No FamilyMember record found for user ${userId}, attempting auto-creation...`);
      
      // Step 1: Check if user has a Family record (legacy structure)
      let family = await prisma.family.findUnique({
        where: { userId },
        select: { id: true, userId: true },
      });

      console.log(`[MEMBERSHIP] Existing Family record: ${family ? 'YES' : 'NO'}`);

      // Step 2: If no Family record, CREATE ONE
      if (!family) {
        console.log(`[MEMBERSHIP] Creating new Family record for user ${userId}...`);
        
        try {
          // Get user details for family name
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true, email: true }
          });
          
          const familyName = user 
            ? `${user.firstName} ${user.lastName}'s Family`.trim() 
            : `Family ${userId.substring(0, 8)}`;

          family = await prisma.family.create({
            data: {
              userId,
              name: familyName,
              // Add other required fields with defaults
            },
            select: { id: true, userId: true },
          });
          
          console.log(`[MEMBERSHIP] ✓ Created Family record: ${family.id}`);
        } catch (createFamilyError) {
          console.error('[MEMBERSHIP] Failed to create Family:', createFamilyError);
          return NextResponse.json(
            { error: "Failed to create family record", details: String(createFamilyError) },
            { status: 500 }
          );
        }
      }

      // Step 3: Create FamilyMember record
      if (family) {
        console.log(`[MEMBERSHIP] Creating FamilyMember record...`);
        
        try {
          const newMembership = await prisma.familyMember.create({
            data: {
              familyId: family.id,
              userId,
              role: 'OWNER', // User who owns/creates the Family record is OWNER
              status: 'ACTIVE',
              joinedAt: new Date(),
            },
            select: {
              familyId: true,
              role: true,
              family: {
                select: {
                  id: true,
                  userId: true,
                }
              }
            },
          });
          
          console.log(`[MEMBERSHIP] ✓ Auto-created FamilyMember record`);
          membership = newMembership;
        } catch (createError) {
          console.error('[MEMBERSHIP] Failed to auto-create FamilyMember:', createError);
          return NextResponse.json(
            { error: "Failed to create family membership", details: String(createError) },
            { status: 500 }
          );
        }
      }
    }

    // Final check
    if (!membership) {
      console.log('[MEMBERSHIP] ERROR: Still no membership after auto-creation attempts');
      return NextResponse.json(
        { error: "Failed to establish family membership" },
        { status: 500 }
      );
    }

    console.log(`[MEMBERSHIP] ✓ Returning membership for family ${membership.familyId}`);
    
    // Return membership details
    return NextResponse.json({
      familyId: membership.familyId,
      role: membership.role,
    });
  } catch (error) {
    console.error("[MEMBERSHIP] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to fetch family membership", details: String(error) },
      { status: 500 }
    );
  }
}
