export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { checkFamilyMembership } from "@/lib/services/family";

export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const { session, error } = await requireAnyRole([]);
      if (error) return error;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const providedFamilyId = searchParams.get("familyId");

    // Validate query
    if (!query || query.length < 1) {
      return NextResponse.json({ items: [] });
    }

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

    // Build search tokens
    const tokens = query.split(/\s+/).filter(token => token.length > 0);
    
    // Handle the case of a full name search (first and last name)
    const firstToken = tokens[0] || "";
    const lastToken = tokens.length > 1 ? tokens[tokens.length - 1] : "";
    
    // Build the search query
    const whereConditions = tokens.map(token => ({
      OR: [
        { firstName: { contains: token, mode: Prisma.QueryMode.insensitive } },
        { lastName: { contains: token, mode: Prisma.QueryMode.insensitive } }
      ]
    }));
    
    // Add full name match optimization if we have multiple tokens
    if (tokens.length > 1) {
      whereConditions.push({
        ["AND"]: [
          { firstName: { contains: firstToken, mode: Prisma.QueryMode.insensitive } },
          { lastName: { contains: lastToken, mode: Prisma.QueryMode.insensitive } }
        ]
      } as any);
    }

    // Query for matching family members
    const members = await prisma.familyMember.findMany({
      where: {
        familyId: effectiveFamilyId,
        user: {
          OR: whereConditions
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true
          }
        }
      },
      take: 10,
      orderBy: [
        { user: { firstName: 'asc' } },
        { user: { lastName: 'asc' } }
      ]
    });

    // Map to response format
    const items = members.map(member => ({
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      profileImageUrl: member.user.profileImageUrl
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error searching family members:", error);
    return NextResponse.json(
      { error: "Failed to search members" },
      { status: 500 }
    );
  }
}
