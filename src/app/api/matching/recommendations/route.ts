export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreCaregiverForListing, scoreListingForCaregiver, DEFAULT_WEIGHTS } from "@/lib/matching";
import { z } from "zod";

// Validate query parameters
const querySchema = z.object({
  target: z.enum(["caregivers", "listings"]),
  listingId: z.string().optional(),
  limit: z.coerce.number().int().positive().default(10),
  // Optional tuning params
  maxDistance: z.coerce.number().int().positive().optional(),
  distanceWeight: z.coerce.number().int().min(0).max(100).optional(),
  availabilityWeight: z.coerce.number().int().min(0).max(100).optional(),
  specialtiesWeight: z.coerce.number().int().min(0).max(100).optional(),
  ratingWeight: z.coerce.number().int().min(0).max(100).optional(),
  rateFitWeight: z.coerce.number().int().min(0).max(100).optional(),
});

/**
 * GET /api/matching/recommendations
 * 
 * Returns AI-based recommendations for caregivers or listings
 * 
 * Query params:
 * - target=caregivers|listings
 * - listingId (required when target=caregivers)
 * - limit (default 10)
 * 
 * Auth required. Role-based access:
 * - target=caregivers: FAMILY or OPERATOR only
 * - target=listings: CAREGIVER only
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const target = searchParams.get("target");
    const listingId = searchParams.get("listingId");
    const limitParam = searchParams.get("limit");
    const maxDistance = searchParams.get("maxDistance");
    const distanceWeight = searchParams.get("distanceWeight");
    const availabilityWeight = searchParams.get("availabilityWeight");
    const specialtiesWeight = searchParams.get("specialtiesWeight");
    const ratingWeight = searchParams.get("ratingWeight");
    const rateFitWeight = searchParams.get("rateFitWeight");
    
    const validationResult = querySchema.safeParse({
      target: target ?? undefined,
      listingId: listingId ?? undefined,
      limit: limitParam ?? undefined,
      maxDistance: maxDistance ?? undefined,
      distanceWeight: distanceWeight ?? undefined,
      availabilityWeight: availabilityWeight ?? undefined,
      specialtiesWeight: specialtiesWeight ?? undefined,
      ratingWeight: ratingWeight ?? undefined,
      rateFitWeight: rateFitWeight ?? undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { target: validTarget, listingId: validListingId, limit } = validationResult.data;

    // Build scoring options from optional params
    const scoringOptions: any = {};
    const weights: Partial<typeof DEFAULT_WEIGHTS> = {};
    if (validationResult.data.maxDistance) scoringOptions.maxDistance = validationResult.data.maxDistance;
    if (validationResult.data.distanceWeight !== undefined) weights.distance = validationResult.data.distanceWeight;
    if (validationResult.data.availabilityWeight !== undefined) weights.availability = validationResult.data.availabilityWeight;
    if (validationResult.data.specialtiesWeight !== undefined) weights.specialties = validationResult.data.specialtiesWeight;
    if (validationResult.data.ratingWeight !== undefined) weights.rating = validationResult.data.ratingWeight;
    if (validationResult.data.rateFitWeight !== undefined) weights.rateFit = validationResult.data.rateFitWeight;
    if (Object.keys(weights).length > 0) scoringOptions.weights = weights;

    // Handle recommendations based on target
    if (validTarget === "caregivers") {
      return await getCaregiverRecommendations(session, validListingId, limit, scoringOptions);
    } else {
      return await getListingRecommendations(session, limit, scoringOptions);
    }
  } catch (error) {
    console.error("Error in recommendations API:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

/**
 * Get caregiver recommendations for a specific listing
 */
async function getCaregiverRecommendations(session: any, listingId: string | undefined, limit: number, scoringOptions: any) {
  // Verify role: only FAMILY or OPERATOR can request caregiver recommendations
  if (session.user.role !== "FAMILY" && session.user.role !== "OPERATOR") {
    return NextResponse.json(
      { error: "Only families and operators can request caregiver recommendations" },
      { status: 403 }
    );
  }

  // Verify listingId is provided
  if (!listingId) {
    return NextResponse.json(
      { error: "Invalid parameters: listingId is required when target=caregivers" },
      { status: 400 }
    );
  }

  // Fetch the listing
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  // Verify the user has access to this listing
  if (listing.postedByUserId !== session.user.id && session.user.role !== "ADMIN") {
    // For FAMILY and OPERATOR, they should only see recommendations for their own listings
    return NextResponse.json(
      { error: "You don't have access to this listing" },
      { status: 403 }
    );
  }

  // Fetch candidate caregivers (limit to 50 for performance)
  const candidateCaregivers = await prisma.caregiver.findMany({
    where: {
      user: {
        status: "ACTIVE",
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImageUrl: true,
        },
      },
    },
    take: 50, // Limit candidates for performance
  });

  // Calculate scores for each caregiver
  const scoredCaregivers = await Promise.all(
    candidateCaregivers.map(async (caregiver) => {
      // Fetch availability slots that might overlap with the listing time
      let availabilitySlots: any[] = [];
      if (listing.startTime && listing.endTime) {
        availabilitySlots = await prisma.availabilitySlot.findMany({
          where: {
            userId: caregiver.userId,
            isAvailable: true,
            startTime: { lte: new Date(listing.endTime) },
            endTime: { gte: new Date(listing.startTime) },
          },
        });
      }

      // Fetch recent reviews for the caregiver (limit to 10 for performance)
      const reviews = await prisma.caregiverReview.findMany({
        where: { caregiverId: caregiver.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Fetch caregiver's primary address to compute distance if available
      const address = await prisma.address.findFirst({
        where: { userId: caregiver.userId, latitude: { not: null }, longitude: { not: null } },
        orderBy: { createdAt: 'asc' },
      });

      // Calculate match score
      const matchScore = scoreCaregiverForListing(caregiver, listing, {
        ...scoringOptions,
        caregiverAvailability: availabilitySlots,
        caregiverReviews: reviews,
        caregiverLocation: address ? { lat: address.latitude as number, lng: address.longitude as number } : undefined,
        listingLocation: (listing.latitude != null && listing.longitude != null) ? { lat: listing.latitude as number, lng: listing.longitude as number } : undefined,
      });

      return {
        type: "caregiver" as const,
        id: caregiver.id,
        score: matchScore.score,
        reasons: matchScore.reasons,
        data: {
          user: caregiver.user,
          yearsExperience: caregiver.yearsExperience,
          hourlyRate: caregiver.hourlyRate,
          specialties: caregiver.specialties,
          backgroundCheckStatus: caregiver.backgroundCheckStatus,
          reviewCount: reviews.length,
          averageRating: reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : null,
        },
      };
    })
  );

  // Sort by score (descending) and take the top results
  const recommendations = scoredCaregivers
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({ items: recommendations });
}

/**
 * Get listing recommendations for the current caregiver
 */
async function getListingRecommendations(session: any, limit: number, scoringOptions: any) {
  // Verify role: only CAREGIVER can request listing recommendations
  if (session.user.role !== "CAREGIVER") {
    return NextResponse.json(
      { error: "Only caregivers can request listing recommendations" },
      { status: 403 }
    );
  }

  // Fetch the caregiver profile
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: session.user.id },
  });

  if (!caregiver) {
    return NextResponse.json(
      { error: "Caregiver profile not found" },
      { status: 404 }
    );
  }

  // Fetch caregiver's address for distance calculations
  const cgAddress = await prisma.address.findFirst({
    where: { userId: session.user.id, latitude: { not: null }, longitude: { not: null } },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch open listings not posted by the current user (limit to 50 for performance)
  const candidateListings = await prisma.marketplaceListing.findMany({
    where: {
      status: "OPEN",
      postedByUserId: { not: session.user.id },
    },
    include: {
      postedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImageUrl: true,
        },
      },
    },
    take: 50, // Limit candidates for performance
  });

  // Fetch caregiver's availability slots (for the next 7 days)
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  
  const availabilitySlots = await prisma.availabilitySlot.findMany({
    where: {
      userId: session.user.id,
      isAvailable: true,
      startTime: { gte: new Date() },
      endTime: { lte: oneWeekFromNow },
    },
  });

  // Fetch reviews for the caregiver
  const reviews = await prisma.caregiverReview.findMany({
    where: { caregiverId: caregiver.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Calculate scores for each listing
  const scoredListings = candidateListings.map((listing) => {
    // Calculate match score
    const matchScore = scoreListingForCaregiver(listing, caregiver, {
      ...scoringOptions,
      caregiverAvailability: availabilitySlots,
      caregiverReviews: reviews,
      caregiverLocation: cgAddress ? { lat: cgAddress.latitude as number, lng: cgAddress.longitude as number } : undefined,
      listingLocation: (listing.latitude != null && listing.longitude != null) ? { lat: listing.latitude as number, lng: listing.longitude as number } : undefined,
    });

    return {
      type: "listing" as const,
      id: listing.id,
      score: matchScore.score,
      reasons: matchScore.reasons,
      data: {
        title: listing.title,
        description: listing.description,
        hourlyRateMin: listing.hourlyRateMin,
        hourlyRateMax: listing.hourlyRateMax,
        setting: listing.setting,
        careTypes: listing.careTypes,
        services: listing.services,
        specialties: listing.specialties,
        city: listing.city,
        state: listing.state,
        startTime: listing.startTime,
        endTime: listing.endTime,
        postedBy: listing.postedBy,
      },
    };
  });

  // Sort by score (descending) and take the top results
  const recommendations = scoredListings
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({ items: recommendations });
}
