import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkFamilyMembership } from "@/lib/services/family";
import { FamilyMemberRole, FamilyMemberStatus } from "@prisma/client";

// Configure runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate member filter parameters
 */
const memberFilterSchema = z.object({
  familyId: z.string().cuid(),
  status: z.union([
    z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']),
    z.array(z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']))
  ]).optional(),
  role: z.union([
    z.enum(['OWNER', 'CARE_PROXY', 'MEMBER', 'GUEST']),
    z.array(z.enum(['OWNER', 'CARE_PROXY', 'MEMBER', 'GUEST']))
  ]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20)
});

/**
 * GET handler for fetching family members
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
      page: searchParams.get("page"),
      limit: searchParams.get("limit")
    };
    
    // Handle array parameters
    if (searchParams.has("status")) {
      filterParams['status'] = searchParams.getAll("status").length > 1 
        ? searchParams.getAll("status") 
        : searchParams.get("status");
    }
    
    if (searchParams.has("role")) {
      filterParams['role'] = searchParams.getAll("role").length > 1 
        ? searchParams.getAll("role") 
        : searchParams.get("role");
    }
    
    // Clean up undefined values
    Object.keys(filterParams).forEach(key => {
      if (filterParams[key] === null || filterParams[key] === undefined) {
        delete filterParams[key];
      }
    });
    
    // Validate filter parameters
    const validationResult = memberFilterSchema.safeParse(filterParams);
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
    
    // Add status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        whereClause.status = { in: filters.status };
      } else {
        whereClause.status = filters.status;
      }
    }
    
    // Add role filter
    if (filters.role) {
      if (Array.isArray(filters.role)) {
        whereClause.role = { in: filters.role };
      } else {
        whereClause.role = filters.role;
      }
    }

    // Query members with pagination
    const [members, totalCount] = await Promise.all([
      prisma.familyMember.findMany({
        where: whereClause,
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
        orderBy: [
          { role: 'asc' },
          { createdAt: 'asc' }
        ],
        skip,
        take: filters.limit
      }),
      prisma.familyMember.count({
        where: whereClause
      })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit);
    const hasNextPage = filters.page < totalPages;
    const hasPreviousPage = filters.page > 1;
    
    // Return members with pagination metadata
    return NextResponse.json({
      items: members,
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
    console.error("Error fetching family members:", error);
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    );
  }
}
