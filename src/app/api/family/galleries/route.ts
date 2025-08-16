import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { 
  checkFamilyMembership,
  createActivityRecord,
  createDefaultAcl
} from "@/lib/services/family";
import { publish } from "@/lib/server/sse";
import { ActivityType } from "@prisma/client";

// Configure runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate gallery creation input
 */
const galleryCreateSchema = z.object({
  familyId: z.string().cuid(),
  title: z.string().min(1).max(120),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  acl: z.any().optional()
});

/**
 * Validate gallery filter parameters
 */
const galleryFilterSchema = z.object({
  familyId: z.string().cuid(),
  search: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  sortBy: z.enum(["createdAt", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

/**
 * GET handler for fetching galleries
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
      search: searchParams.get("search"),
      tags: searchParams.get("tags"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder")
    };
    
    // Handle array parameters
    if (searchParams.has("tags") && searchParams.getAll("tags").length > 1) {
      filterParams['tags'] = searchParams.getAll("tags");
    }
    
    // Clean up undefined values
    Object.keys(filterParams).forEach(key => {
      if (filterParams[key] === null || filterParams[key] === undefined) {
        delete filterParams[key];
      }
    });
    
    // Validate filter parameters
    const validationResult = galleryFilterSchema.safeParse(filterParams);
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
    
    // Add tags filter
    if (filters.tags) {
      const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
      whereClause.tags = {
        hasSome: tagsArray
      };
    }
    
    // Add search filter
    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    // Build orderBy clause
    const orderByClause: Record<string, "asc" | "desc"> = {
      [filters.sortBy]: filters.sortOrder
    };

    // Query galleries with pagination
    const [galleries, totalCount] = await Promise.all([
      prisma.sharedGallery.findMany({
        where: whereClause,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true
            }
          },
          _count: {
            select: {
              photos: true
            }
          }
        },
        orderBy: orderByClause,
        skip,
        take: filters.limit
      }),
      prisma.sharedGallery.count({
        where: whereClause
      })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit);
    const hasNextPage = filters.page < totalPages;
    const hasPreviousPage = filters.page > 1;
    
    // Transform galleries to include photo count
    const galleriesWithDetails = galleries.map(gallery => ({
      ...gallery,
      photoCount: gallery._count.photos,
      _count: undefined // Remove _count field
    }));
    
    // Return galleries with pagination metadata
    return NextResponse.json({
      items: galleriesWithDetails,
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
    console.error("Error fetching galleries:", error);
    return NextResponse.json(
      { error: "Failed to fetch galleries" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating galleries
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = galleryCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid gallery data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, data.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    
    // Create gallery
    const gallery = await prisma.sharedGallery.create({
      data: {
        familyId: data.familyId,
        creatorId: session.user.id,
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        acl: data.acl || createDefaultAcl(session.user.id)
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        }
      }
    });
    
    // Log activity
    await createActivityRecord({
      familyId: data.familyId,
      actorId: session.user.id,
      type: ActivityType.GALLERY_CREATED,
      resourceType: 'gallery',
      resourceId: gallery.id,
      description: `${session.user.firstName || session.user.name} created a new gallery: ${gallery.title}`,
      metadata: {
        galleryTitle: gallery.title,
        tags: gallery.tags
      }
    });
    
    // Publish SSE event
    publish(`family:${data.familyId}`, "gallery:created", {
      familyId: data.familyId,
      gallery: {
        ...gallery,
        photoCount: 0
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      gallery: {
        ...gallery,
        photoCount: 0
      }
    });
    
  } catch (error) {
    console.error("Error creating gallery:", error);
    return NextResponse.json(
      { error: "Failed to create gallery" },
      { status: 500 }
    );
  }
}
