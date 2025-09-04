import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateAIMatchScore } from "@/lib/ai-matching";
import { createAuditLog } from "@/lib/audit";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define the search query schema with Zod for validation
const searchQuerySchema = z.object({
  // Location parameters
  location: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  radius: z.coerce.number().optional().default(25), // miles
  
  // Care level filters (can select multiple)
  careLevel: z.array(z.enum(["INDEPENDENT", "ASSISTED", "MEMORY_CARE", "SKILLED_NURSING"])).or(
    z.enum(["INDEPENDENT", "ASSISTED", "MEMORY_CARE", "SKILLED_NURSING"]).transform(val => [val])
  ).optional(),
  
  // Gender filter
  gender: z.enum(["ALL", "FEMALE", "MALE"]).optional().default("ALL"),
  
  // Price range
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  
  // Availability filter
  availability: z.enum(["true", "false"]).transform(val => val === "true").optional(),
  
  // Amenities filter (can select multiple)
  amenities: z.array(z.string()).or(
    z.string().transform(val => [val])
  ).optional(),
  
  // Pagination
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  
  // Sorting
  sortBy: z.enum(["price", "rating", "distance", "availability", "match"]).optional().default("match"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  
  // Resident profile for AI matching
  residentProfile: z.string().optional(), // JSON string with resident care needs
});

/**
 * GET handler for searching assisted living homes
 * 
 * Query parameters:
 * - location: string (city, state, zip)
 * - latitude, longitude: number (for geo search)
 * - radius: number (search radius in miles)
 * - careLevel: string[] (INDEPENDENT, ASSISTED, MEMORY_CARE, SKILLED_NURSING)
 * - gender: string (ALL, FEMALE, MALE)
 * - priceMin, priceMax: number
 * - availability: boolean
 * - amenities: string[]
 * - page, limit: number (pagination)
 * - sortBy: string (price, rating, distance, availability, match)
 * - sortOrder: string (asc, desc)
 * - residentProfile: string (JSON with resident care needs for AI matching)
 */
export async function GET(req: NextRequest) {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Parse URL and query parameters
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};
    
    // Extract all query parameters
    url.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });
    
    // Handle array parameters (they come as comma-separated values)
    if ((rawParams as any)['careLevel']) {
      (rawParams as any)['careLevel'] = (rawParams as any)['careLevel'].split(',');
    }
    
    if ((rawParams as any)['amenities']) {
      (rawParams as any)['amenities'] = (rawParams as any)['amenities'].split(',');
    }
    
    // Validate query parameters
    const validationResult = searchQuerySchema.safeParse(rawParams);
    
    if (!validationResult.success) {
      // Return validation errors
      return NextResponse.json({
        success: false,
        message: "Invalid search parameters",
        errors: validationResult.error.format(),
      }, { status: 400 });
    }
    
    // Extract validated query parameters
    const params = validationResult.data;
    
    // Build base query
    const where: any = {
      status: "ACTIVE", // Only return active listings
    };
    
    // Apply care level filter
    if (params.careLevel && params.careLevel.length > 0) {
      where.careLevel = {
        hasSome: params.careLevel,
      };
    }
    
    // Apply gender filter
    if (params.gender && params.gender !== "ALL") {
      where.OR = [
        { genderRestriction: params.gender },
        { genderRestriction: "ALL" },
      ];
    }
    
    // Apply price range filter
    if (params.priceMin !== undefined) {
      where.priceMin = {
        gte: params.priceMin,
      };
    }
    
    if (params.priceMax !== undefined) {
      where.priceMax = {
        lte: params.priceMax,
      };
    }
    
    // Apply availability filter
    if (params.availability !== undefined) {
      where.currentOccupancy = params.availability 
        ? { lt: { capacity: true } } // Has availability
        : { equals: { capacity: true } }; // Full (waitlist)
    }
    
    // Apply location filter
    let geoFilter = false;
    
    if (params.latitude && params.longitude) {
      geoFilter = true;
      // We'll handle geo filtering after the initial query
    } else if (params.location) {
      // Search by text location (city, state, zip)
      where.OR = [
        ...(where.OR || []),
        {
          address: {
            city: {
              contains: params.location,
              mode: 'insensitive',
            },
          },
        },
        {
          address: {
            state: {
              contains: params.location,
              mode: 'insensitive',
            },
          },
        },
        {
          address: {
            zipCode: {
              contains: params.location,
              mode: 'insensitive',
            },
          },
        },
      ];
    }
    
    // Apply amenities filter
    if (params.amenities && params.amenities.length > 0) {
      // This assumes amenities are stored in a separate table with a relation to homes
      where.amenities = {
        some: {
          name: {
            in: params.amenities,
          },
        },
      };
    }
    
    // Calculate pagination values
    const page = Math.max(1, params.page);
    const limit = Math.max(1, Math.min(50, params.limit)); // Limit between 1-50
    const skip = (page - 1) * limit;
    
    // Determine sorting
    let orderBy: any = {};
    
    switch (params.sortBy) {
      case "price":
        orderBy.priceMin = params.sortOrder;
        break;
      case "rating":
        orderBy.reviews = {
          _avg: {
            rating: params.sortOrder,
          },
        };
        break;
      case "availability":
        // Sort by available spots (capacity - currentOccupancy)
        if (params.sortOrder === "desc") {
          // More availability first
          orderBy = [
            {
              currentOccupancy: "asc",
            },
            {
              capacity: "desc",
            },
          ];
        } else {
          // Less availability first
          orderBy = [
            {
              currentOccupancy: "desc",
            },
            {
              capacity: "asc",
            },
          ];
        }
        break;
      case "match":
        // We'll handle match sorting after AI scoring
        break;
      case "distance":
        // We'll handle distance sorting with geo filtering
        break;
      default:
        // Default sorting by creation date
        orderBy.createdAt = "desc";
    }
    
    // Execute the main query
    const [homes, totalCount] = await Promise.all([
      prisma.assistedLivingHome.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          address: true,
          photos: {
            where: {
              isPrimary: true,
            },
            take: 1,
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          amenities: true,
          operator: {
            select: {
              id: true,
              companyName: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.assistedLivingHome.count({ where }),
    ]);
    
    // Calculate average ratings
    const homesWithRatings = homes.map(home => {
      const ratings = home.reviews.map(review => review.rating);
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null;
      
      return {
        ...home,
        averageRating,
        reviewCount: ratings.length,
      };
    });
    
    // Handle geo filtering and distance calculation if needed
    let processedHomes = homesWithRatings;
    
    if (geoFilter && params.latitude && params.longitude) {
      processedHomes = homesWithRatings
        .map(home => {
          // Calculate distance using Haversine formula
          const homeLat = home.address?.latitude;
          const homeLng = home.address?.longitude;
          
          if (!homeLat || !homeLng) return { ...home, distance: null };
          
          const distance = calculateDistance(
            params.latitude!,
            params.longitude!,
            homeLat,
            homeLng
          );
          
          return { ...home, distance };
        })
        // Filter by radius
        .filter(home => home.distance === null || home.distance <= params.radius!)
        // Sort by distance if requested
        .sort((a, b) => {
          if (params.sortBy === "distance") {
            const distA = a.distance ?? Infinity;
            const distB = b.distance ?? Infinity;
            return params.sortOrder === "asc" ? distA - distB : distB - distA;
          }
          return 0;
        });
    }
    
    // Apply AI matching if resident profile is provided
    if (params.residentProfile) {
      try {
        const residentProfile = JSON.parse(params.residentProfile);
        
        // Calculate match scores for each home
        const homesWithMatchScores = await Promise.all(
          processedHomes.map(async (home) => {
            const matchScore = await calculateAIMatchScore(home, residentProfile);
            return { ...home, aiMatchScore: matchScore };
          })
        );
        
        // Sort by match score if requested
        if (params.sortBy === "match") {
          homesWithMatchScores.sort((a, b) => {
            const scoreA = a.aiMatchScore ?? 0;
            const scoreB = b.aiMatchScore ?? 0;
            return params.sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA;
          });
        }
        
        processedHomes = homesWithMatchScores;
      } catch (error) {
        console.error("Error parsing resident profile or calculating match scores:", error);
        // Continue without match scoring if there's an error
      }
    }
    
    // Format homes for response (remove sensitive data)
    const formattedHomes = processedHomes.map(home => ({
      id: home.id,
      name: home.name,
      description: home.description,
      address: {
        street: home.address?.street,
        city: home.address?.city,
        state: home.address?.state,
        zipCode: home.address?.zipCode,
        latitude: home.address?.latitude,
        longitude: home.address?.longitude,
      },
      careLevel: home.careLevel,
      priceRange: {
        min: home.priceMin,
        max: home.priceMax,
      },
      capacity: home.capacity,
      currentOccupancy: home.currentOccupancy,
      availability: home.capacity - home.currentOccupancy,
      gender: home.genderRestriction,
      rating: home.averageRating,
      reviewCount: home.reviewCount,
      aiMatchScore: home.aiMatchScore,
      distance: home.distance,
      primaryPhoto: home.photos[0]?.url || null,
      amenities: home.amenities.map(a => a.name),
      operator: {
        id: home.operator.id,
        name: home.operator.companyName,
      },
    }));
    
    // Create audit log for the search (HIPAA compliance)
    if (userId) {
      await createAuditLog({
        userId,
        action: "READ",
        resourceType: "AssistedLivingHome",
        resourceId: null,
        description: `Searched for homes with filters: ${JSON.stringify({
          location: params.location,
          careLevel: params.careLevel,
          gender: params.gender,
          priceRange: { min: params.priceMin, max: params.priceMax },
          availability: params.availability,
          amenities: params.amenities,
        })}`,
        metadata: {
          resultCount: formattedHomes.length,
          page,
          limit,
        },
        ipAddress: req.headers.get("x-forwarded-for") || null,
        userAgent: req.headers.get("user-agent") || null,
      });
    }
    
    // Return the response
    return NextResponse.json({
      success: true,
      data: {
        homes: formattedHomes,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page * limit < totalCount,
        },
      },
    });
    
  } catch (error) {
    console.error("Error in homes search API:", error);
    
    // Return error response
    return NextResponse.json({
      success: false,
      message: "An error occurred while searching for homes",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    }, { status: 500 });
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in miles
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
