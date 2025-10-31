/**
 * Matching utilities for CareLinkAI marketplace
 * 
 * This module provides functions to calculate compatibility scores between
 * caregivers and marketplace listings based on multiple factors including:
 * - Geographic distance
 * - Availability overlap
 * - Specialty matching
 * - Caregiver ratings
 * - Hourly rate compatibility
 */

import type { Caregiver, MarketplaceListing, CaregiverReview, AvailabilitySlot } from "@prisma/client";

// Types for scoring results
export interface MatchScore {
  score: number;
  reasons: string[];
  factors: {
    [key: string]: {
      score: number;
      weight: number;
      reason?: string;
    };
  };
}

// Default weights for different matching factors (must sum to 100)
export const DEFAULT_WEIGHTS = {
  distance: 20,
  availability: 25,
  specialties: 25,
  rating: 15,
  rateFit: 15,
};

// Options for customizing scoring
export interface ScoringOptions {
  weights?: Partial<typeof DEFAULT_WEIGHTS>;
  includeUnavailable?: boolean;
  maxDistance?: number; // miles
  caregiverAvailability?: AvailabilitySlot[];
  caregiverReviews?: CaregiverReview[];
  // Optional coordinates to compute real distance
  caregiverLocation?: { lat: number; lng: number };
  listingLocation?: { lat: number; lng: number };
}

/**
 * Score a caregiver's compatibility with a marketplace listing
 * 
 * @param caregiver The caregiver to evaluate
 * @param listing The marketplace listing to match against
 * @param options Optional customization of scoring weights and additional data
 * @returns A score object with overall score (0-100) and detailed reasons
 */
export function scoreCaregiverForListing(
  caregiver: Caregiver,
  listing: MarketplaceListing,
  options: ScoringOptions = {}
): MatchScore {
  // Merge default weights with any custom weights
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
  
  // Normalize weights to ensure they sum to 100
  const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = Object.entries(weights).reduce((acc, [key, value]) => {
    acc[key as keyof typeof DEFAULT_WEIGHTS] = (value / weightSum) * 100;
    return acc;
  }, {} as typeof DEFAULT_WEIGHTS);
  
  // Initialize score object
  const result: MatchScore = {
    score: 0,
    reasons: [],
    factors: {},
  };
  
  // Calculate distance score
  const distanceScore = calculateDistanceScore(
    caregiver,
    listing,
    options.maxDistance,
    options.caregiverLocation,
    options.listingLocation
  );
  result.factors['distance'] = {
    score: distanceScore.score,
    weight: normalizedWeights.distance,
    reason: distanceScore.reason,
  };
  if (distanceScore.reason) {
    result.reasons.push(distanceScore.reason);
  }
  
  // Calculate availability score
  const availabilityScore = calculateAvailabilityScore(caregiver, listing, options.caregiverAvailability);
  result.factors['availability'] = {
    score: availabilityScore.score,
    weight: normalizedWeights.availability,
    reason: availabilityScore.reason,
  };
  if (availabilityScore.reason) {
    result.reasons.push(availabilityScore.reason);
  }
  
  // Calculate specialties score
  const specialtiesScore = calculateSpecialtiesScore(caregiver, listing);
  result.factors['specialties'] = {
    score: specialtiesScore.score,
    weight: normalizedWeights.specialties,
    reason: specialtiesScore.reason,
  };
  if (specialtiesScore.reason) {
    result.reasons.push(specialtiesScore.reason);
  }
  
  // Calculate rating score
  const ratingScore = calculateRatingScore(caregiver, options.caregiverReviews);
  result.factors['rating'] = {
    score: ratingScore.score,
    weight: normalizedWeights.rating,
    reason: ratingScore.reason,
  };
  if (ratingScore.reason) {
    result.reasons.push(ratingScore.reason);
  }
  
  // Calculate rate fit score
  const rateFitScore = calculateRateFitScore(caregiver, listing);
  result.factors['rateFit'] = {
    score: rateFitScore.score,
    weight: normalizedWeights.rateFit,
    reason: rateFitScore.reason,
  };
  if (rateFitScore.reason) {
    result.reasons.push(rateFitScore.reason);
  }
  
  // Calculate weighted total score
  result.score = Object.entries(result.factors).reduce((total, [key, factor]) => {
    return total + (factor.score * factor.weight / 100);
  }, 0);
  
  // Round to nearest whole number
  result.score = Math.round(result.score);
  
  return result;
}

/**
 * Score a marketplace listing's compatibility with a caregiver
 * 
 * @param listing The marketplace listing to evaluate
 * @param caregiver The caregiver to match against
 * @param options Optional customization of scoring weights and additional data
 * @returns A score object with overall score (0-100) and detailed reasons
 */
export function scoreListingForCaregiver(
  listing: MarketplaceListing,
  caregiver: Caregiver,
  options: ScoringOptions = {}
): MatchScore {
  // This is essentially the same calculation but with potentially different
  // interpretations of the factors from the caregiver's perspective
  const caregiverScore = scoreCaregiverForListing(caregiver, listing, options);
  
  // Modify reasons to be from caregiver's perspective
  const result: MatchScore = {
    score: caregiverScore.score,
    reasons: caregiverScore.reasons.map(reason => {
      // Transform reasons to be from caregiver's perspective
      return reason
        .replace("Caregiver is", "You are")
        .replace("Caregiver has", "You have")
        .replace("Caregiver's rate", "Your rate")
        .replace("caregiver's specialties", "your specialties");
    }),
    factors: caregiverScore.factors,
  };
  
  return result;
}

/**
 * Calculate distance score between caregiver and listing
 */
function calculateDistanceScore(
  caregiver: Caregiver,
  listing: MarketplaceListing,
  maxDistance: number = 25, // Default max distance in miles
  caregiverLocation?: { lat: number; lng: number },
  listingLocation?: { lat: number; lng: number },
): { score: number; reason?: string } {
  const listLat = listingLocation?.lat ?? (listing.latitude ?? undefined);
  const listLng = listingLocation?.lng ?? (listing.longitude ?? undefined);
  if (listLat === undefined || listLng === undefined) {
    return {
      score: 50,
      reason: 'Location information unavailable for listing',
    };
  }

  const careLat = caregiverLocation?.lat;
  const careLng = caregiverLocation?.lng;
  if (careLat === undefined || careLng === undefined) {
    // No caregiver coordinates -> neutral score
    return {
      score: 50,
      reason: 'Location information unavailable for caregiver',
    };
  }

  const distance = calculateDistance(careLat, careLng, listLat, listLng);

  // Score decreases as distance increases
  if (distance <= maxDistance) {
    const score = Math.max(0, Math.min(100, 100 - ((distance / maxDistance) * 80)));
    return {
      score,
      reason: `${Math.round(distance)} miles from listing location (within ${maxDistance} mile radius)`,
    };
  } else {
    return {
      score: Math.max(0, 20 - ((distance - maxDistance) / 10)),
      reason: `${Math.round(distance)} miles from listing location (outside preferred ${maxDistance} mile radius)`,
    };
  }
}

/**
 * Calculate availability overlap score
 */
function calculateAvailabilityScore(
  caregiver: Caregiver,
  listing: MarketplaceListing,
  availabilitySlots?: AvailabilitySlot[]
): { score: number; reason?: string } {
  // If listing doesn't have time requirements, availability isn't a factor
  if (!listing.startTime || !listing.endTime) {
    return { 
      score: 75, // Good default score
      reason: "Listing has no specific time requirements"
    };
  }
  
  // If we don't have availability data, return neutral score
  if (!availabilitySlots || availabilitySlots.length === 0) {
    return { 
      score: 50, // Neutral score
      reason: "Caregiver availability information not provided"
    };
  }
  
  // Check if any availability slots overlap with the listing time
  const listingStart = new Date(listing.startTime);
  const listingEnd = new Date(listing.endTime);
  
  // Find overlapping slots
  const overlappingSlots = availabilitySlots.filter(slot => {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    return slot.isAvailable && hasTimeOverlap(slotStart, slotEnd, listingStart, listingEnd);
  });
  
  if (overlappingSlots.length === 0) {
    return {
      score: 0,
      reason: "Caregiver is not available during the requested time"
    };
  }
  
  // Calculate what percentage of the listing time is covered by availability
  const totalListingMinutes = getMinutesBetween(listingStart, listingEnd);
  let coveredMinutes = 0;
  
  // For each overlapping slot, calculate the overlap with the listing time
  overlappingSlots.forEach(slot => {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    
    const overlapStart = new Date(Math.max(slotStart.getTime(), listingStart.getTime()));
    const overlapEnd = new Date(Math.min(slotEnd.getTime(), listingEnd.getTime()));
    
    coveredMinutes += getMinutesBetween(overlapStart, overlapEnd);
  });
  
  // Calculate coverage percentage
  const coveragePercentage = Math.min(100, (coveredMinutes / totalListingMinutes) * 100);
  
  // Score based on coverage
  if (coveragePercentage === 100) {
    return {
      score: 100,
      reason: "Caregiver is fully available during the requested time"
    };
  } else if (coveragePercentage >= 75) {
    return {
      score: 85,
      reason: `Caregiver is available for ${Math.round(coveragePercentage)}% of the requested time`
    };
  } else if (coveragePercentage >= 50) {
    return {
      score: 60,
      reason: `Caregiver is available for ${Math.round(coveragePercentage)}% of the requested time`
    };
  } else {
    return {
      score: 30,
      reason: `Caregiver is only available for ${Math.round(coveragePercentage)}% of the requested time`
    };
  }
}

/**
 * Calculate specialties match score
 */
function calculateSpecialtiesScore(
  caregiver: Caregiver,
  listing: MarketplaceListing
): { score: number; reason?: string } {
  // If caregiver has no specialties, return low score
  if (!caregiver.specialties || caregiver.specialties.length === 0) {
    return { 
      score: 25, 
      reason: "Caregiver has not specified any specialties"
    };
  }
  
  // Collect all relevant listing requirements
  const listingRequirements = [
    ...(listing.specialties || []),
    ...(listing.services || []),
    ...(listing.careTypes || [])
  ].map(item => item.toLowerCase());
  
  // If listing has no requirements, specialties aren't a factor
  if (listingRequirements.length === 0) {
    return { 
      score: 75, 
      reason: "Listing has no specific specialty requirements"
    };
  }
  
  // Count matching specialties
  const caregiverSpecialties = caregiver.specialties.map(s => s.toLowerCase());
  const matchingSpecialties = caregiverSpecialties.filter(
    specialty => listingRequirements.some(
      requirement => requirement.includes(specialty) || specialty.includes(requirement)
    )
  );
  
  // Calculate match percentage
  const matchPercentage = (matchingSpecialties.length / listingRequirements.length) * 100;
  
  // Score based on match percentage
  if (matchPercentage >= 100) {
    return {
      score: 100,
      reason: `Caregiver's specialties match all listing requirements`
    };
  } else if (matchPercentage >= 75) {
    return {
      score: 85,
      reason: `Caregiver's specialties match ${Math.round(matchPercentage)}% of listing requirements`
    };
  } else if (matchPercentage >= 50) {
    return {
      score: 70,
      reason: `Caregiver's specialties match ${Math.round(matchPercentage)}% of listing requirements`
    };
  } else if (matchPercentage > 0) {
    return {
      score: 40,
      reason: `Caregiver's specialties only match ${Math.round(matchPercentage)}% of listing requirements`
    };
  } else {
    return {
      score: 10,
      reason: `None of caregiver's specialties match listing requirements`
    };
  }
}

/**
 * Calculate rating score based on caregiver reviews
 */
function calculateRatingScore(
  caregiver: Caregiver,
  reviews?: CaregiverReview[]
): { score: number; reason?: string } {
  // If no reviews provided, return neutral score
  if (!reviews || reviews.length === 0) {
    return { 
      score: 50, 
      reason: "No reviews available for caregiver"
    };
  }
  
  // Calculate average rating
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  
  // Map 1-5 star rating to 0-100 score
  // 1 star = 20, 2 stars = 40, 3 stars = 60, 4 stars = 80, 5 stars = 100
  const score = Math.round((averageRating / 5) * 100);
  
  // Return score with reason
  return {
    score,
    reason: `Caregiver has an average rating of ${averageRating.toFixed(1)} stars from ${reviews.length} reviews`
  };
}

/**
 * Calculate rate fit score based on caregiver hourly rate and listing rate range
 */
function calculateRateFitScore(
  caregiver: Caregiver,
  listing: MarketplaceListing
): { score: number; reason?: string } {
  // If caregiver has no hourly rate, return neutral score
  if (!caregiver.hourlyRate) {
    return { 
      score: 50, 
      reason: "Caregiver has not specified an hourly rate"
    };
  }
  
  // If listing has no rate range, return neutral score
  if (!listing.hourlyRateMin && !listing.hourlyRateMax) {
    return { 
      score: 75, 
      reason: "Listing has no specific rate requirements"
    };
  }
  
  const caregiverRate = Number(caregiver.hourlyRate);
  const minRate = listing.hourlyRateMin ? Number(listing.hourlyRateMin) : undefined;
  const maxRate = listing.hourlyRateMax ? Number(listing.hourlyRateMax) : undefined;
  
  // If only min rate is specified
  if (minRate !== undefined && maxRate === undefined) {
    if (caregiverRate >= minRate) {
      return {
        score: 100,
        reason: `Caregiver's rate ($${caregiverRate}/hr) meets or exceeds the minimum rate ($${minRate}/hr)`
      };
    } else {
      const percentBelow = ((minRate - caregiverRate) / minRate) * 100;
      if (percentBelow <= 10) {
        return {
          score: 70,
          reason: `Caregiver's rate ($${caregiverRate}/hr) is slightly below the minimum rate ($${minRate}/hr)`
        };
      } else {
        return {
          score: 30,
          reason: `Caregiver's rate ($${caregiverRate}/hr) is significantly below the minimum rate ($${minRate}/hr)`
        };
      }
    }
  }
  
  // If only max rate is specified
  if (maxRate !== undefined && minRate === undefined) {
    if (caregiverRate <= maxRate) {
      return {
        score: 100,
        reason: `Caregiver's rate ($${caregiverRate}/hr) is within the maximum rate ($${maxRate}/hr)`
      };
    } else {
      const percentAbove = ((caregiverRate - maxRate) / maxRate) * 100;
      if (percentAbove <= 10) {
        return {
          score: 70,
          reason: `Caregiver's rate ($${caregiverRate}/hr) is slightly above the maximum rate ($${maxRate}/hr)`
        };
      } else {
        return {
          score: 30,
          reason: `Caregiver's rate ($${caregiverRate}/hr) is significantly above the maximum rate ($${maxRate}/hr)`
        };
      }
    }
  }
  
  // If both min and max rates are specified
  if (minRate !== undefined && maxRate !== undefined) {
    // If rate is within range
    if (caregiverRate >= minRate && caregiverRate <= maxRate) {
      return {
        score: 100,
        reason: `Caregiver's rate ($${caregiverRate}/hr) is within the listing's range ($${minRate}-$${maxRate}/hr)`
      };
    }
    
    // If rate is below range
    if (caregiverRate < minRate) {
      const percentBelow = ((minRate - caregiverRate) / minRate) * 100;
      if (percentBelow <= 10) {
        return {
          score: 70,
          reason: `Caregiver's rate ($${caregiverRate}/hr) is slightly below the listing's range ($${minRate}-$${maxRate}/hr)`
        };
      } else {
        return {
          score: 30,
          reason: `Caregiver's rate ($${caregiverRate}/hr) is significantly below the listing's range ($${minRate}-$${maxRate}/hr)`
        };
      }
    }
    
    // If rate is above range
    if (caregiverRate > maxRate) {
      const percentAbove = ((caregiverRate - maxRate) / maxRate) * 100;
      if (percentAbove <= 10) {
        return {
          score: 60,
          reason: `Caregiver's rate ($${caregiverRate}/hr) is slightly above the listing's range ($${minRate}-$${maxRate}/hr)`
        };
      } else {
        return {
          score: 20,
          reason: `Caregiver's rate ($${caregiverRate}/hr) is significantly above the listing's range ($${minRate}-$${maxRate}/hr)`
        };
      }
    }
  }
  
  // Default case (should not reach here)
  return { score: 50, reason: "Unable to determine rate compatibility" };
}

/**
 * Check if two time ranges overlap
 */
export function hasTimeOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate minutes between two dates
 */
export function getMinutesBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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
