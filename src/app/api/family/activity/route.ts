import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkFamilyMembership } from "@/lib/services/family";
import { ActivityType } from "@prisma/client";

// Configure runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate activity filter parameters
 */
const activityFilterSchema = z.object({
  familyId: z.string().cuid(),
  types: z.union([
    z.nativeEnum(ActivityType),
    z.array(z.nativeEnum(ActivityType))
  ]).optional(),
  actorId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20)
});

/**
 * GET handler for fetching activity feed items
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
    const filterParams: Record<string, any> = {
      familyId: searchParams.get("familyId"),
      actorId: searchParams.get("actorId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit")
    };
    
    // Handle array parameters
    if (searchParams.has("types")) {
      filterParams['types'] = searchParams.getAll("types").length > 1 
        ? searchParams.getAll("types") 
        : searchParams.get("types");
    }
    
    // Clean up undefined values
    Object.keys(filterParams).forEach(key => {
      if (filterParams[key] === null || filterParams[key] === undefined) {
        delete filterParams[key];
      }
    });
    
    // Validate filter parameters
    const validationResult = activityFilterSchema.safeParse(filterParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const filters = validationResult.data;
    
    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, filters.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    
    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit;
    
    // Build query filters
    const whereClause: any = {
      familyId: filters.familyId
    };
    
    // Add type filter
    if (filters.types) {
      if (Array.isArray(filters.types)) {
        whereClause.type = { in: filters.types };
      } else {
        whereClause.type = filters.types;
      }
    }
    
    // Add actor filter
    if (filters.actorId) {
      whereClause.actorId = filters.actorId;
    }

    // Query activity feed items with pagination
    const [activities, totalCount] = await Promise.all([
      prisma.activityFeedItem.findMany({
        where: whereClause,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: filters.limit
      }),
      prisma.activityFeedItem.count({
        where: whereClause
      })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit);
    const hasNextPage = filters.page < totalPages;
    const hasPreviousPage = filters.page > 1;
    
    // Return activities with pagination metadata
    return NextResponse.json({
      items: activities,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });
    
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity feed" },
      { status: 500 }
    );
  }
}
