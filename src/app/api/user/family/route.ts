import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET handler to retrieve the current user's familyId
 * 
 * This endpoint tries to find a familyId for the authenticated user by:
 * 1. First checking if they are a member of any family
 * 2. If not, checking if they directly own a family
 * 
 * @returns JSON with familyId or appropriate error
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First check if user is a member of any family
    const membership = await prisma.familyMember.findFirst({
      where: { userId: session.user.id },
      select: { familyId: true }
    });

    if (membership) {
      return NextResponse.json({ familyId: membership.familyId });
    }

    // If not a member, check if user directly owns a family
    const ownedFamily = await prisma.family.findFirst({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (ownedFamily) {
      return NextResponse.json({ familyId: ownedFamily.id });
    }

    // No family found for user
    return NextResponse.json(
      { error: "No family found for user" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Failed to resolve family:", error);
    return NextResponse.json(
      { error: "Failed to resolve family" },
      { status: 500 }
    );
  }
}
