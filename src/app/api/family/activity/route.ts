export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFamilyMembership } from "@/lib/services/family";
import { z } from "zod";

// Validate query parameters
const querySchema = z.object({
  familyId: z.string().cuid(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * GET /api/family/activity
 * 
 * Fetches activity feed items for a family
 * Requires authentication and family membership
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const validationResult = querySchema.safeParse({
      familyId: searchParams.get("familyId"),
      limit: searchParams.get("limit") || 25,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { familyId, limit } = validationResult.data;

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, familyId);
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // Query activity feed items
    const activities = await prisma.activityFeedItem.findMany({
      where: {
        familyId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // Transform activities to handle JSON fields
    const items = activities.map(activity => ({
      ...activity,
      actor: {
        ...activity.actor,
        profileImageUrl: activity.actor?.profileImageUrl as unknown as { thumbnail?: string } | null,
      },
      metadata: activity.metadata as unknown as Record<string, any> | null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching family activity:", error);

    // In development, return empty array as fallback
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json(
      { error: "Failed to fetch activity feed" },
      { status: 500 }
    );
  }
}
