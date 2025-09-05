/**
 * AI-Powered Search API for CareLinkAI
 * 
 * This endpoint provides intelligent search capabilities for assisted living homes,
 * including natural language processing, semantic matching, and personalized scoring.
 * 
 * Route: GET /api/search
 * 
 * Query Parameters:
 * - q: Natural language search query (e.g., "memory care near San Francisco")
 * - location: City, state, or zip code
 * - careLevel: Care level(s) required (comma-separated)
 * - priceMin: Minimum monthly budget
 * - priceMax: Maximum monthly budget
 * - gender: Gender preference (ALL, MALE, FEMALE)
 * - availability: Whether home must have current availability (true/false)
 * - amenities: Required amenities (comma-separated)
 * - page: Page number for pagination
 * - limit: Number of results per page
 * - radius: Search radius in miles (requires lat/lng params – future)
 * - sortBy: Sort order (relevance, price_low, price_high, distance, rating)
 * - verified: Only show verified homes (future)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, CareLevel } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';
import { formatCurrency } from '@/lib/utils';

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/**
 * AI-based text similarity score between two strings
 * 
 * @param text1 First text to compare
 * @param text2 Second text to compare
 * @returns Similarity score (0-100)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  // Convert to lowercase for case-insensitive comparison
  const a = text1.toLowerCase();
  const b = text2.toLowerCase();
  
  // Extract key terms (simple implementation - would use NLP in production)
  const termsA = a.split(/\s+/).filter(term => term.length > 2);
  const termsB = b.split(/\s+/).filter(term => term.length > 2);
  
  // Count matching terms
  let matchCount = 0;
  for (const termA of termsA) {
    if (termsB.some(termB => termB.includes(termA) || termA.includes(termB))) {
      matchCount++;
    }
  }
  
  // Calculate similarity score (0-100)
  const maxTerms = Math.max(termsA.length, 1);
  return Math.min(Math.round((matchCount / maxTerms) * 100), 100);
}

/**
 * Calculate distance between two geographical points
 * 
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999; // Large number if coordinates missing
  
  // Convert to radians
  const toRad = (value: number) => (value * Math.PI) / 180;
  const rlat1 = toRad(lat1);
  const rlon1 = toRad(lon1);
  const rlat2 = toRad(lat2);
  const rlon2 = toRad(lon2);
  
  // Haversine formula
  const dlon = rlon2 - rlon1;
  const dlat = rlat2 - rlat1;
  const a = Math.sin(dlat/2)**2 + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(dlon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Earth radius in miles
  const R = 3956;
  return R * c;
}

/**
 * Extract location information from a natural language query
 * 
 * @param query Natural language search query
 * @returns Location information if found
 */
function extractLocationFromQuery(query: string): string | null {
  if (!query) return null;
  
  // Common location patterns
  const locationPatterns = [
    /near\s+([a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/i,
    /in\s+([a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/i,
    /around\s+([a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/i,
    /([a-zA-Z\s]+(?:,\s*[A-Z]{2}))\s+area/i,
  ];
  
  // Try each pattern
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract care level information from a natural language query
 * 
 * @param query Natural language search query
 * @returns Array of care levels found
 */
function extractCareLevelsFromQuery(query: string): CareLevel[] {
  if (!query) return [];
  
  const q = query.toLowerCase();
  const careLevels: CareLevel[] = [];
  
  // Map common phrases to care levels
  const careMapping = {
    'memory care': CareLevel.MEMORY_CARE,
    'alzheimer': CareLevel.MEMORY_CARE,
    'dementia': CareLevel.MEMORY_CARE,
    'assisted': CareLevel.ASSISTED,
    'assisted living': CareLevel.ASSISTED,
    'help with': CareLevel.ASSISTED,
    'independent': CareLevel.INDEPENDENT,
    'independent living': CareLevel.INDEPENDENT,
    'nursing': CareLevel.SKILLED_NURSING,
    'skilled nursing': CareLevel.SKILLED_NURSING,
    'medical care': CareLevel.SKILLED_NURSING,
  };
  
  // Check for each care level keyword
  for (const [keyword, level] of Object.entries(careMapping)) {
    if (q.includes(keyword) && !careLevels.includes(level)) {
      careLevels.push(level);
    }
  }
  
  return careLevels;
}

/**
 * Calculate AI match score for a home based on search criteria
 * 
 * @param home Assisted living home data
 * @param params Search parameters
 * @returns Match score (0-100)
 */
function calculateMatchScore(home: any, params: any): number {
  let totalScore = 0;
  let factorsConsidered = 0;
  
  // 1. Care Level Match (highest weight)
  if (params.careLevels && params.careLevels.length > 0) {
    factorsConsidered++;
    const careLevelMatch = params.careLevels.some((level: CareLevel) => 
      home.careLevel.includes(level)
    );
    totalScore += careLevelMatch ? 35 : 0;
  }
  
  // 2. Price Range Match
  if (params.priceMin || params.priceMax) {
    factorsConsidered++;
    let priceScore = 0;
    
    const homeMinPrice = Number(home.priceMin) || 0;
    const homeMaxPrice = Number(home.priceMax) || 999999;
    
    // If user specified a price range
    if (params.priceMin && params.priceMax) {
      const userMin = Number(params.priceMin);
      const userMax = Number(params.priceMax);
      
      // Perfect match: home price range is within user's range
      if (homeMinPrice >= userMin && homeMaxPrice <= userMax) {
        priceScore = 20;
      } 
      // Partial match: ranges overlap
      else if (
        (homeMinPrice <= userMax && homeMinPrice >= userMin) || 
        (homeMaxPrice >= userMin && homeMaxPrice <= userMax)
      ) {
        priceScore = 10;
      }
      // Small overlap or close to range
      else if (Math.abs(homeMinPrice - userMax) < 500 || Math.abs(homeMaxPrice - userMin) < 500) {
        priceScore = 5;
      }
    } 
    // If user only specified minimum price
    else if (params.priceMin) {
      const userMin = Number(params.priceMin);
      if (homeMinPrice >= userMin * 0.9) { // Within 10% of minimum
        priceScore = 15;
      } else if (homeMinPrice >= userMin * 0.8) { // Within 20% of minimum
        priceScore = 10;
      }
    } 
    // If user only specified maximum price
    else if (params.priceMax) {
      const userMax = Number(params.priceMax);
      if (homeMaxPrice <= userMax) { // Under budget
        priceScore = 20;
      } else if (homeMaxPrice <= userMax * 1.1) { // Within 10% over budget
        priceScore = 10;
      } else if (homeMaxPrice <= userMax * 1.2) { // Within 20% over budget
        priceScore = 5;
      }
    }
    
    totalScore += priceScore;
  }
  
  // 3. Location Proximity (if coordinates available)
  if (params.latitude && params.longitude && home.address?.latitude && home.address?.longitude) {
    factorsConsidered++;
    const distance = calculateDistance(
      params.latitude, 
      params.longitude, 
      home.address.latitude, 
      home.address.longitude
    );
    
    // Score based on distance (closer is better)
    let locationScore = 0;
    if (distance < 5) locationScore = 20; // Within 5 miles
    else if (distance < 10) locationScore = 15; // Within 10 miles
    else if (distance < 20) locationScore = 10; // Within 20 miles
    else if (distance < 30) locationScore = 5; // Within 30 miles
    
    totalScore += locationScore;
  }
  
  // 4. Availability Match
  if (params.availability === true) {
    factorsConsidered++;
    const hasAvailability = home.capacity > home.currentOccupancy;
    totalScore += hasAvailability ? 15 : 0;
  }
  
  // 5. Amenities Match
  if (params.amenities && params.amenities.length > 0) {
    factorsConsidered++;
    let amenityMatches = 0;
    
    for (const amenity of params.amenities) {
      if (home.amenities.some((a: string) => 
        a.toLowerCase().includes(amenity.toLowerCase()) || 
        amenity.toLowerCase().includes(a.toLowerCase())
      )) {
        amenityMatches++;
      }
    }
    
    const amenityScore = Math.min(Math.round((amenityMatches / params.amenities.length) * 15), 15);
    totalScore += amenityScore;
  }
  
  // 6. Gender Restriction Match
  if (params.gender && params.gender !== 'ALL') {
    factorsConsidered++;
    const genderMatch = 
      home.genderRestriction === params.gender || 
      home.genderRestriction === null || 
      home.genderRestriction === 'ALL';
    
    totalScore += genderMatch ? 10 : 0;
  }
  
  // 7. Natural Language Query Match
  if (params.query) {
    factorsConsidered++;
    
    // Calculate text similarity between query and home description
    const descriptionSimilarity = calculateTextSimilarity(
      params.query,
      `${home.name} ${home.description} ${home.amenities.join(' ')}`
    );
    
    // Weight this less than explicit filters but still significant
    const querySimilarityScore = Math.round(descriptionSimilarity * 0.1);
    totalScore += querySimilarityScore;
  }
  
  // Ensure we have at least one factor to consider
  if (factorsConsidered === 0) {
    return 50; // Default score if no criteria specified
  }
  
  // Calculate final score (0-100)
  const maxPossibleScore = factorsConsidered * 20; // Approximate max points possible
  return Math.min(Math.round((totalScore / maxPossibleScore) * 100), 100);
}

/**
 * Remove placeholder or disallowed image URLs
 * Currently filters out any URL that points to example.com
 *
 * @param url raw image URL from database
 * @returns sanitized URL or null if placeholder
 */
function sanitizeImageUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    const host = new URL(url).hostname.toLowerCase();
    // Add any placeholder / fake domains to this list
    const blockedHosts = ['example.com'];
    if (blockedHosts.includes(host)) {
      return null;
    }
    return url;
  } catch {
    // Invalid URL format – treat as missing image
    return null;
  }
}

/**
 * GET handler for search API
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user session (optional - for personalized results)
    const session = await getServerSession(authOptions);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Natural language query
    const query = searchParams.get('q') || '';
    
    // Extract location from query if not explicitly provided
    let location = searchParams.get('location') || extractLocationFromQuery(query) || '';
    
    // Extract care levels from query if not explicitly provided
    let explicitCareLevels = searchParams.getAll('careLevel') as CareLevel[];
    let queryCareLevels = extractCareLevelsFromQuery(query);
    let careLevels = explicitCareLevels.length > 0 ? explicitCareLevels : queryCareLevels;
    
    // Other filters
    const priceMin = searchParams.get('priceMin') || '';
    const priceMax = searchParams.get('priceMax') || '';
    const gender = searchParams.get('gender') || 'ALL';
    const amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || [];
    
    // availability can now be a number meaning minimum open beds
    const availabilityParam = searchParams.get('availability');
    const availability =
      availabilityParam === null
        ? undefined
        : availabilityParam === 'true' || availabilityParam === 'false'
        ? availabilityParam === 'true'
        : parseInt(availabilityParam, 10); // number of beds
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)),
      MAX_PAGE_SIZE
    );
    const offset = (page - 1) * limit;

    // New Phase-1 query params
    const radius = searchParams.get('radius')
      ? parseInt(searchParams.get('radius') as string, 10)
      : undefined;
    const sortBy = (searchParams.get('sortBy') ||
      'relevance') as
      | 'relevance'
      | 'price_low'
      | 'price_high'
      | 'distance'
      | 'rating';
    const verifiedOnly = searchParams.get('verified') === 'true';
    
    // Build database query
    const whereClause: any = {
      status: 'ACTIVE', // Only active homes
    };
    
    // Filter by care level if specified
    if (careLevels.length > 0) {
      whereClause.careLevel = {
        hasSome: careLevels
      };
    }
    
    // Filter by price range if specified
    if (priceMin) {
      whereClause.priceMin = {
        gte: parseFloat(priceMin)
      };
    }
    
    if (priceMax) {
      whereClause.priceMax = {
        lte: parseFloat(priceMax)
      };
    }
    
    // Filter by gender restriction if specified
    if (gender !== 'ALL') {
      whereClause.OR = [
        { genderRestriction: gender },
        { genderRestriction: null },
        { genderRestriction: 'ALL' }
      ];
    }
    
    // Availability boolean deprecated – keep for backward-compat
    if (availability === true) {
      whereClause.currentOccupancy = {
        lt: {
          path: '$capacity'
        }
      };
    }

    // Placeholder for verified filter (requires additional schema support)
    if (verifiedOnly) {
      // For now, require at least one ACTIVE license
      whereClause.licenses = {
        some: {
          status: {
            equals: 'ACTIVE'
          }
        }
      };
    }
    
    // Location search - basic implementation
    // In production, would use geocoding and radius search
    if (location) {
      whereClause.OR = [
        ...(whereClause.OR || []),
        {
          address: {
            city: {
              contains: location,
              mode: 'insensitive'
            }
          }
        },
        {
          address: {
            state: {
              contains: location,
              mode: 'insensitive'
            }
          }
        },
        {
          address: {
            zipCode: {
              contains: location,
              mode: 'insensitive'
            }
          }
        }
      ];
    }
    
    // Execute database query
    const [homes, totalCount] = await Promise.all([
      prisma.assistedLivingHome.findMany({
        where: whereClause,
        include: {
          address: true,
          operator: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          photos: {
            where: { isPrimary: true },
            take: 1
          }
        },
        skip: offset,
        take: limit
      }),
      prisma.assistedLivingHome.count({
        where: whereClause
      })
    ]);

    // --- favourites ----
    let favoriteHomeIds: Set<string> = new Set();
    if (session && session.user) {
      const favUser = await prisma.user.findUnique({
        where: { email: session.user.email as string },
        include: { family: { include: { favorites: true } } }
      });
      if (favUser?.family) {
        favoriteHomeIds = new Set(
          favUser.family.favorites.map((f) => f.homeId)
        );
      }
    }
    
    // Process and score results
    const searchCriteria = {
      query,
      location,
      careLevels,
      priceMin: priceMin ? parseFloat(priceMin) : null,
      priceMax: priceMax ? parseFloat(priceMax) : null,
      gender,
      availability,
      amenities,
      // If we had user location coordinates:
      // latitude: userLatitude,
      // longitude: userLongitude
    };
    
    // Calculate match scores and format results
    const results = homes.map(home => {
      // Calculate AI match score
      const aiMatchScore = calculateMatchScore(home, searchCriteria);
      
      // Format the result
      return {
        id: home.id,
        name: home.name,
        description: home.description,
        address: home.address ? {
          street: home.address.street,
          street2: home.address.street2,
          city: home.address.city,
          state: home.address.state,
          zipCode: home.address.zipCode,
          coordinates: home.address.latitude && home.address.longitude ? {
            lat: home.address.latitude,
            lng: home.address.longitude
          } : null
        } : null,
        careLevel: home.careLevel,
        priceRange: {
          min: home.priceMin ? Number(home.priceMin) : null,
          max: home.priceMax ? Number(home.priceMax) : null,
          formattedMin: home.priceMin ? formatCurrency(Number(home.priceMin)) : null,
          formattedMax: home.priceMax ? formatCurrency(Number(home.priceMax)) : null,
        },
        capacity: home.capacity,
        availability: home.capacity - home.currentOccupancy,
        gender: home.genderRestriction || 'ALL',
        amenities: home.amenities,
        // Filter out placeholder images that point to unconfigured hosts
        imageUrl: sanitizeImageUrl(home.photos.length > 0 ? home.photos[0].url : null),
        operator: home.operator ? {
          name: `${home.operator.user.firstName} ${home.operator.user.lastName}`,
          email: home.operator.user.email
        } : null,
        aiMatchScore,
        isFavorited: favoriteHomeIds.has(home.id)
      };
    });
    
    // Phase-1 enhanced sorting
    switch (sortBy) {
      case 'price_low':
        results.sort(
          (a, b) =>
            (a.priceRange.min ?? 0) - (b.priceRange.min ?? 0)
        );
        break;
      case 'price_high':
        results.sort(
          (a, b) =>
            (b.priceRange.max ?? 0) - (a.priceRange.max ?? 0)
        );
        break;
      // distance & rating require data not yet calculated – fallthrough
      default:
        // relevance – keep AI match score
        results.sort((a, b) => b.aiMatchScore - a.aiMatchScore);
    }

    // Post-filter for numeric availability if provided
    let filteredResults = results;
    if (
      typeof availability === 'number' &&
      !Number.isNaN(availability) &&
      availability > 0
    ) {
      filteredResults = results.filter(
        (r) => r.availability >= availability
      );
    }
    
    // Return response
    return NextResponse.json({
      success: true,
      query: {
        text: query,
        location,
        careLevels: careLevels.length > 0 ? careLevels : null,
        priceRange: priceMin || priceMax ? { min: priceMin || null, max: priceMax || null } : null,
        gender,
        availability,
        amenities: amenities.length > 0 ? amenities : null
      },
      pagination: {
        page,
        limit,
        totalResults: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / limit)
      },
      results: filteredResults
    }, { status: 200 });
    
  } catch (error) {
    console.error('Search API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'An error occurred while processing your search',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
