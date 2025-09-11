import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validate review update input
const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

/**
 * PATCH /api/reviews/caregivers/[id]
 * 
 * Updates an existing caregiver review
 * Requires authentication and must be the original reviewer
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = reviewUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;
    
    // Check if review exists and belongs to the user
    const review = await prisma.caregiverReview.findUnique({
      where: { id },
      select: { id: true, reviewerId: true, caregiverId: true }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Verify the user is the original reviewer
    if (review.reviewerId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to update this review" },
        { status: 403 }
      );
    }

    // Update the review
    const updatedReview = await prisma.caregiverReview.update({
      where: { id },
      data: updateData
    });

    // Return updated review
    return NextResponse.json({
      success: true,
      review: updatedReview
    });
    
  } catch (error) {
    console.error("Error updating caregiver review:", error);
    return NextResponse.json(
      { error: "Failed to update caregiver review" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/caregivers/[id]
 * 
 * Deletes a caregiver review
 * Requires authentication and must be the original reviewer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    // Check if review exists and belongs to the user
    const review = await prisma.caregiverReview.findUnique({
      where: { id },
      select: { id: true, reviewerId: true }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Verify the user is the original reviewer
    if (review.reviewerId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to delete this review" },
        { status: 403 }
      );
    }

    // Delete the review
    await prisma.caregiverReview.delete({
      where: { id }
    });

    // Return success
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error deleting caregiver review:", error);
    return NextResponse.json(
      { error: "Failed to delete caregiver review" },
      { status: 500 }
    );
  }
}
