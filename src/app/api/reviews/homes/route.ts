import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validate review creation input
const reviewCreateSchema = z.object({
  homeId: z.string().min(1, "Home ID is required"),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  content: z.string().optional(),
  isPublic: z.boolean().default(true),
});

/**
 * GET /api/reviews/homes
 * 
 * Lists reviews for a specific home with pagination and stats
 * Public endpoint, but requires homeId parameter
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const homeId = searchParams.get("homeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    
    // Validate required parameters
    if (!homeId) {
      return NextResponse.json({ error: "Home ID is required" }, { status: 400 });
    }
    
    // Ensure page and limit are valid
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page parameter" }, { status: 400 });
    }
    
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    // Check if home exists
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      select: { id: true }
    });

    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Query reviews with pagination
    const [reviews, total, aggregates] = await Promise.all([
      prisma.homeReview.findMany({
        where: { 
          homeId,
          isPublic: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          homeId: true,
          reviewerId: true,
          rating: true,
          title: true,
          content: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.homeReview.count({
        where: { 
          homeId,
          isPublic: true
        }
      }),
      prisma.homeReview.aggregate({
        where: { 
          homeId,
          isPublic: true
        },
        _avg: {
          rating: true
        },
        _count: {
          rating: true
        }
      })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    // Return reviews with pagination and stats
    return NextResponse.json({
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore
      },
      stats: {
        averageRating: aggregates._avg.rating || 0,
        totalReviews: aggregates._count.rating
      }
    });

  } catch (error) {
    console.error("Error fetching home reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch home reviews" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews/homes
 * 
 * Creates a new review for a home
 * Requires authentication and permission (must have a booking for the home)
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
    const validationResult = reviewCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { homeId, rating, title, content, isPublic } = validationResult.data;
    
    // Check if home exists
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      select: { id: true, operatorId: true }
    });

    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    // Find the user's family
    const family = await prisma.family.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!family) {
      return NextResponse.json({ 
        error: "Only family members can review homes" 
      }, { status: 403 });
    }

    // Check if the user is an operator of this home (can't review own home)
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (operator && operator.id === home.operatorId) {
      return NextResponse.json({ 
        error: "Operators cannot review their own homes" 
      }, { status: 403 });
    }

    // Check if the user has already reviewed this home
    const existingReview = await prisma.homeReview.findFirst({
      where: {
        homeId,
        reviewerId: session.user.id
      }
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this home" },
        { status: 409 }
      );
    }

    // Verify permission: user's family must have a booking for this home
    const hasBooking = await prisma.booking.findFirst({
      where: {
        familyId: family.id,
        homeId
      }
    });

    if (!hasBooking) {
      return NextResponse.json(
        { error: "You do not have permission to review this home" },
        { status: 403 }
      );
    }

    // Create the review
    const review = await prisma.homeReview.create({
      data: {
        homeId,
        reviewerId: session.user.id,
        rating,
        title,
        content,
        isPublic,
        isVerified: false // Default to unverified
      }
    });

    // Return created review
    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        homeId: review.homeId,
        reviewerId: review.reviewerId,
        rating: review.rating,
        title: review.title,
        content: review.content,
        isPublic: review.isPublic,
        isVerified: review.isVerified,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      }
    });
    
  } catch (error) {
    console.error("Error creating home review:", error);
    return NextResponse.json(
      { error: "Failed to create home review" },
      { status: 500 }
    );
  }
}
