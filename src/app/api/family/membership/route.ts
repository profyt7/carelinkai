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
    // Get session and verify authentication
    const { session, error } = await requireAnyRole(["FAMILY"] as any);
      if (error) return error;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get familyId from query params
    const searchParams = request.nextUrl.searchParams;
    const familyId = searchParams.get("familyId");

    // Query for family membership
    let membership = await prisma.familyMember.findFirst({
      where: {
        userId: session.user.id,
        ...(familyId && { familyId }),
      },
      select: {
        familyId: true,
        role: true,
      },
    });

    // If no membership found, try to auto-create for FAMILY role users
    if (!membership) {
      console.log(`No FamilyMember record found for user ${session.user.id}, attempting auto-creation...`);
      
      // Check if user has a Family record (legacy structure)
      const family = await prisma.family.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (family) {
        // Auto-create FamilyMember record for this user
        try {
          const newMembership = await prisma.familyMember.create({
            data: {
              familyId: family.id,
              userId: session.user.id,
              role: 'OWNER', // User who owns the Family record is OWNER
              status: 'ACTIVE',
              joinedAt: new Date(),
            },
            select: {
              familyId: true,
              role: true,
            },
          });
          
          console.log(`✓ Auto-created FamilyMember record for user ${session.user.id}`);
          membership = newMembership;
        } catch (createError) {
          console.error('Failed to auto-create FamilyMember:', createError);
        }
      }
    }

    // Return 404 if still no family found
    if (!membership) {
      return NextResponse.json(
        { error: "No family found for user" },
        { status: 404 }
      );
    }

    // Return membership details
    return NextResponse.json({
      familyId: membership.familyId,
      role: membership.role,
    });
  } catch (error) {
    console.error("Error fetching family membership:", error);
    return NextResponse.json(
      { error: "Failed to fetch family membership" },
      { status: 500 }
    );
  }
}
