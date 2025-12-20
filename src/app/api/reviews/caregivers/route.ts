
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validate review creation input
const reviewCreateSchema = z.object({
  caregiverId: z.string().min(1, "Caregiver ID is required"),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  content: z.string().optional(),
  isPublic: z.boolean().default(true),
});

/**
 * GET /api/reviews/caregivers
 * 
 * Lists reviews for a specific caregiver with pagination and stats
 * Public endpoint, but requires caregiverId parameter
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const caregiverId = searchParams.get("caregiverId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    
    // Validate required parameters
    if (!caregiverId) {
      return NextResponse.json({ error: "Caregiver ID is required" }, { status: 400 });
    }
    
    // Ensure page and limit are valid
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page parameter" }, { status: 400 });
    }
    
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    // Check if caregiver exists
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: caregiverId },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Query reviews with pagination
    const [reviews, total, aggregates] = await Promise.all([
      prisma.caregiverReview.findMany({
        where: { 
          caregiverId,
          isPublic: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          caregiverId: true,
          reviewerId: true,
          rating: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.caregiverReview.count({
        where: { 
          caregiverId,
          isPublic: true
        }
      }),
      prisma.caregiverReview.aggregate({
        where: { 
          caregiverId,
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
    console.error("Error fetching caregiver reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch caregiver reviews" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews/caregivers
 * 
 * Creates a new review for a caregiver
 * Requires authentication and permission (must have hired the caregiver)
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

    const { caregiverId, rating, title, content, isPublic } = validationResult.data;
    
    // Check if caregiver exists
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: caregiverId },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // Check if the user has already reviewed this caregiver
    const existingReview = await prisma.caregiverReview.findFirst({
      where: {
        caregiverId,
        reviewerId: session.user.id
      }
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this caregiver" },
        { status: 409 }
      );
    }

    // Verify permission: user must have hired this caregiver
    const hasPermission = await prisma.marketplaceHire.findFirst({
      where: {
        caregiverId,
        OR: [
          // Case 1: User posted the listing that led to the hire
          {
            listing: {
              postedByUserId: session.user.id
            }
          },
          // Case 2: User is the operator of the home where the caregiver had a shift
          {
            shift: {
              home: {
                operator: {
                  userId: session.user.id
                }
              }
            }
          }
        ]
      }
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: "You do not have permission to review this caregiver" },
        { status: 403 }
      );
    }

    // Create the review
    const review = await prisma.caregiverReview.create({
      data: {
        caregiverId,
        reviewerId: session.user.id,
        rating,
        title,
        content,
        isPublic
      }
    });

    // Return created review
    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        caregiverId: review.caregiverId,
        reviewerId: review.reviewerId,
        rating: review.rating,
        title: review.title,
        content: review.content,
        isPublic: review.isPublic,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      }
    });
    
  } catch (error) {
    console.error("Error creating caregiver review:", error);
    return NextResponse.json(
      { error: "Failed to create caregiver review" },
      { status: 500 }
    );
  }
}
