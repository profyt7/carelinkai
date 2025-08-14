/**
 * AI Matching Engine for CareLinkAI
 * 
 * This module provides functions to calculate compatibility scores between
 * residents and assisted living homes based on multiple factors including:
 * - Care level needs
 * - Budget compatibility
 * - Amenities matching
 * - Gender preferences
 * - Location preferences
 * - Social compatibility
 * 
 * The algorithm uses weighted scoring across multiple dimensions and can be
 * extended to integrate with OpenAI or other ML services in the future.
 */

import { PrismaClient } from "@prisma/client";
import type { AssistedLivingHome } from "@prisma/client";

// Initialize Prisma client for database access
const prisma = new PrismaClient();

// Types for resident profile used in matching
export interface ResidentProfile {
  // Basic information
  age?: number;
  gender?: string;
  
  // Care needs
  careLevelNeeded?: string[];  // ["ASSISTED", "MEMORY_CARE", etc.]
  mobilityLevel?: number;      // 1-5 scale (1: fully dependent, 5: fully independent)
  medicationManagement?: boolean;
  incontinenceCare?: boolean;
  diabetesCare?: boolean;
  memoryImpairment?: number;   // 1-5 scale (1: none, 5: severe)
  behavioralIssues?: boolean;
  
  // Preferences
  budget?: {
    min?: number;
    max: number;
  };
  preferredLocation?: {
    latitude?: number;
    longitude?: number;
    zipCode?: string;
    maxDistance?: number;  // miles
  };
  preferredAmenities?: string[];  // ["Garden", "Private Rooms", etc.]
  activityPreferences?: string[];  // ["Music", "Art", "Exercise", etc.]
  dietaryRestrictions?: string[];
  religiousPreferences?: string;
  preferredRoomType?: string;  // "Private", "Semi-Private", etc.
  petFriendly?: boolean;
  
  // Family considerations
  familyVisitFrequency?: number;  // 1-5 scale (1: rarely, 5: daily)
  proximityToFamily?: {
    latitude: number;
    longitude: number;
    importance: number;  // 1-5 scale (1: not important, 5: very important)
  };
  
  // Medical considerations
  medicalConditions?: string[];
  specializedCareNeeds?: string[];
  
  // Social factors
  socialEngagement?: number;  // 1-5 scale (1: prefers solitude, 5: very social)
  communitySize?: {
    preferred: "small" | "medium" | "large";
    importance: number;  // 1-5 scale
  };
}

// Weights for different matching factors (must sum to 100)
const DEFAULT_WEIGHTS = {
  careLevel: 25,
  budget: 20,
  location: 15,
  amenities: 15,
  gender: 5,
  social: 10,
  medical: 10
};

/**
 * Calculate AI match score between a resident profile and an assisted living home
 * 
 * @param home The assisted living home to evaluate
 * @param residentProfile The resident profile with preferences and needs
 * @param customWeights Optional custom weights for different factors
 * @returns A score from 0-100 representing compatibility
 */
export async function calculateAIMatchScore(
  home: any,
  residentProfile: ResidentProfile,
  customWeights?: Partial<typeof DEFAULT_WEIGHTS>
): Promise<number> {
  // Merge default weights with any custom weights
  const weights = { ...DEFAULT_WEIGHTS, ...(customWeights || {}) };
  
  // Normalize weights to ensure they sum to 100
  const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = Object.entries(weights).reduce((acc, [key, value]) => {
    acc[key as keyof typeof DEFAULT_WEIGHTS] = (value / weightSum) * 100;
    return acc;
  }, {} as typeof DEFAULT_WEIGHTS);
  
  // Calculate individual factor scores
  const careLevelScore = calculateCareLevelMatch(home, residentProfile);
  const budgetScore = calculateBudgetMatch(home, residentProfile);
  const locationScore = await calculateLocationMatch(home, residentProfile);
  const amenitiesScore = calculateAmenitiesMatch(home, residentProfile);
  const genderScore = calculateGenderMatch(home, residentProfile);
  const socialScore = calculateSocialMatch(home, residentProfile);
  const medicalScore = calculateMedicalMatch(home, residentProfile);
  
  // Apply weights to each factor
  const weightedScores = {
    careLevel: careLevelScore * normalizedWeights.careLevel / 100,
    budget: budgetScore * normalizedWeights.budget / 100,
    location: locationScore * normalizedWeights.location / 100,
    amenities: amenitiesScore * normalizedWeights.amenities / 100,
    gender: genderScore * normalizedWeights.gender / 100,
    social: socialScore * normalizedWeights.social / 100,
    medical: medicalScore * normalizedWeights.medical / 100
  };
  
  // Calculate total score (0-100)
  const totalScore = Object.values(weightedScores).reduce((sum, score) => sum + score, 0);
  
  // Round to nearest whole number
  return Math.round(totalScore);
}

/**
 * Calculate match score for care level compatibility
 * 
 * @param home Assisted living home
 * @param profile Resident profile
 * @returns Score from 0-100
 */
function calculateCareLevelMatch(home: any, profile: ResidentProfile): number {
  if (!profile.careLevelNeeded || profile.careLevelNeeded.length === 0) {
    // If no specific care needs are specified, assume basic needs
    return 75; // Default reasonable match
  }
  
  // Check if the home can provide all required care levels
  const homeCareLevel = Array.isArray(home.careLevel) ? home.careLevel : [];
  const requiredCare = profile.careLevelNeeded;
  
  // Calculate what percentage of required care levels are provided
  const matchedCareLevels = requiredCare.filter(care => homeCareLevel.includes(care));
  const careMatchPercentage = (matchedCareLevels.length / requiredCare.length) * 100;
  
  // If memory care is needed but not provided, heavily penalize
  if (
    profile.memoryImpairment && 
    profile.memoryImpairment > 3 && 
    !homeCareLevel.includes("MEMORY_CARE")
  ) {
    return Math.max(0, careMatchPercentage - 50);
  }
  
  // If mobility assistance is needed but not available, penalize
  if (
    profile.mobilityLevel && 
    profile.mobilityLevel < 3 && 
    !homeCareLevel.includes("ASSISTED") && 
    !homeCareLevel.includes("SKILLED_NURSING")
  ) {
    return Math.max(0, careMatchPercentage - 30);
  }
  
  return careMatchPercentage;
}

/**
 * Calculate match score for budget compatibility
 * 
 * @param home Assisted living home
 * @param profile Resident profile
 * @returns Score from 0-100
 */
function calculateBudgetMatch(home: any, profile: ResidentProfile): number {
  if (!profile.budget || !profile.budget.max) {
    return 50; // Neutral score if no budget specified
  }
  
  const homePriceMin = home.priceRange?.min || home.priceMin || 0;
  const homePriceMax = home.priceRange?.max || home.priceMax || 0;
  
  // If home doesn't have pricing info, return neutral score
  if (homePriceMin === 0 && homePriceMax === 0) {
    return 50;
  }
  
  const residentBudgetMax = profile.budget.max;
  const residentBudgetMin = profile.budget.min || residentBudgetMax * 0.7; // Assume minimum is 70% of max if not specified
  
  // If home is completely out of budget (minimum price is higher than max budget)
  if (homePriceMin > residentBudgetMax) {
    // Calculate how far over budget
    const overBudgetPercentage = ((homePriceMin - residentBudgetMax) / residentBudgetMax) * 100;
    
    // Severely penalize homes that are way over budget
    if (overBudgetPercentage > 30) return 0;
    
    // Sliding scale for homes slightly over budget
    return Math.max(0, 50 - overBudgetPercentage);
  }
  
  // If home is within budget
  if (homePriceMin <= residentBudgetMax && homePriceMax >= residentBudgetMin) {
    // Calculate how well it fits within the budget range
    // Perfect score if price is 80-95% of max budget (good value)
    if (homePriceMin >= residentBudgetMax * 0.8 && homePriceMax <= residentBudgetMax * 0.95) {
      return 100;
    }
    
    // Very good score if price is within budget
    return 90;
  }
  
  // If home is too inexpensive (might indicate lower quality)
  if (homePriceMax < residentBudgetMin) {
    const underBudgetPercentage = ((residentBudgetMin - homePriceMax) / residentBudgetMin) * 100;
    
    // Moderately penalize homes that are way under budget
    if (underBudgetPercentage > 30) return 60;
    
    // Sliding scale for homes slightly under budget
    return Math.max(60, 80 - underBudgetPercentage);
  }
  
  return 75; // Default good match
}

/**
 * Calculate match score for location preferences
 * 
 * @param home Assisted living home
 * @param profile Resident profile
 * @returns Score from 0-100
 */
async function calculateLocationMatch(home: any, profile: ResidentProfile): Promise<number> {
  // If no location preferences, return neutral score
  if (!profile.preferredLocation && !profile.proximityToFamily) {
    return 75;
  }
  
  // Get home coordinates
  const homeLatitude = home.address?.latitude || home.coordinates?.lat;
  const homeLongitude = home.address?.longitude || home.coordinates?.lng;
  
  // If home doesn't have coordinates, try to geocode from address
  if (!homeLatitude || !homeLongitude) {
    // In a real implementation, we would geocode the address
    // For now, return a neutral score
    return 50;
  }
  
  let locationScore = 0;
  let factorsConsidered = 0;
  
  // Check preferred location if specified
  if (profile.preferredLocation) {
    factorsConsidered++;
    
    // If preferred location has coordinates
    if (profile.preferredLocation.latitude && profile.preferredLocation.longitude) {
      const distance = calculateDistance(
        profile.preferredLocation.latitude,
        profile.preferredLocation.longitude,
        homeLatitude,
        homeLongitude
      );
      
      const maxDistance = profile.preferredLocation.maxDistance || 25; // Default 25 miles
      
      if (distance <= maxDistance) {
        // Score decreases as distance increases
        locationScore += 100 - ((distance / maxDistance) * 50);
      } else {
        // Beyond max distance, score drops quickly
        locationScore += Math.max(0, 50 - ((distance - maxDistance) / 10));
      }
    }
    // If preferred location has zip code
    else if (profile.preferredLocation.zipCode) {
      // In a real implementation, we would compare zip codes
      // For now, return a neutral score
      locationScore += 50;
    }
  }
  
  // Check proximity to family if specified
  if (profile.proximityToFamily) {
    factorsConsidered++;
    const familyImportance = profile.proximityToFamily.importance || 3;
    
    // Only consider if family location coordinates are provided
    if (profile.proximityToFamily.latitude && profile.proximityToFamily.longitude) {
      const distance = calculateDistance(
        profile.proximityToFamily.latitude,
        profile.proximityToFamily.longitude,
        homeLatitude,
        homeLongitude
      );
      
      // Base distance threshold on importance
      const baseThreshold = 50 - (familyImportance * 5); // 5-30 miles depending on importance
      
      if (distance <= baseThreshold) {
        // Score decreases as distance increases
        const proximityScore = 100 - ((distance / baseThreshold) * 50);
        
        // Weight by importance
        locationScore += proximityScore * (familyImportance / 5);
      } else {
        // Beyond threshold, score drops quickly based on importance
        const penaltyFactor = familyImportance / 5;
        locationScore += Math.max(0, 50 - ((distance - baseThreshold) / 5) * penaltyFactor);
      }
    }
  }
  
  // Average the scores if multiple factors were considered
  return factorsConsidered > 0 ? locationScore / factorsConsidered : 75;
}

/**
 * Calculate match score for amenities preferences
 * 
 * @param home Assisted living home
 * @param profile Resident profile
 * @returns Score from 0-100
 */
function calculateAmenitiesMatch(home: any, profile: ResidentProfile): number {
  if (!profile.preferredAmenities || profile.preferredAmenities.length === 0) {
    return 75; // Neutral score if no preferences
  }
  
  // Extract home amenities
  const homeAmenities = extractHomeAmenities(home);
  
  if (homeAmenities.length === 0) {
    return 50; // Below average if home has no amenities listed
  }
  
  // Count matching amenities
  const preferredAmenities = profile.preferredAmenities.map(a => a.toLowerCase());
  const matchingAmenities = homeAmenities.filter(
    amenity => preferredAmenities.some(
      preferred => amenity.toLowerCase().includes(preferred)
    )
  );
  
  // Calculate percentage of preferred amenities that are matched
  const matchPercentage = (matchingAmenities.length / preferredAmenities.length) * 100;
  
  // Bonus for homes with many amenities beyond what was requested
  const extraAmenitiesBonus = Math.min(
    15, 
    ((homeAmenities.length - matchingAmenities.length) / 5) * 5
  );
  
  return Math.min(100, matchPercentage + extraAmenitiesBonus);
}

/**
 * Extract amenities from home data in various formats
 */
function extractHomeAmenities(home: any): string[] {
  // Handle different data structures for amenities
  if (Array.isArray(home.amenities)) {
    if (typeof home.amenities[0] === 'string') {
      return home.amenities;
    }
    
    if (typeof home.amenities[0] === 'object') {
      // Handle category-based amenities
      if (home.amenities[0].items) {
        // Cast `category` to any to avoid implicit-any error and
        // assert the returned array is string[] for downstream usage
        return home.amenities.flatMap((category: any) => category.items as string[]);
      }
      
      // Handle object-based amenities
      if (home.amenities[0].name) {
        // Cast `amenity` to any and assert its `name` is a string
        return home.amenities.map((amenity: any) => amenity.name as string);
      }
    }
  }
  
  return [];
}

/**
 * Calculate match score for gender compatibility
 * 
 * @param home Assisted living home
 * @param profile Resident profile
 * @returns Score from 0-100
 */
function calculateGenderMatch(home: any, profile: ResidentProfile): number {
  if (!profile.gender) {
    return 100; // Full score if gender not specified
  }
  
  const homeGender = home.gender || home.genderRestriction || "ALL";
  
  // If home accepts all genders
  if (homeGender === "ALL") {
    return 100;
  }
  
  // If home has gender restriction that matches resident
  if (homeGender === profile.gender) {
    return 100;
  }
  
  // If home has gender restriction that doesn't match resident
  return 0; // Incompatible
}

/**
 * Calculate match score for social compatibility
 * 
 * @param home Assisted living home
 * @param profile Resident profile
 * @returns Score from 0-100
 */
function calculateSocialMatch(home: any, profile: ResidentProfile): number {
  let socialScore = 75; // Default score
  let factorsConsidered = 0;
  
  // Match community size preference if specified
  if (profile.communitySize) {
    factorsConsidered++;
    const capacity = home.capacity || 0;
    
    // Determine home size category
    let homeSize: "small" | "medium" | "large" = "medium";
    if (capacity <= 15) homeSize = "small";
    else if (capacity >= 50) homeSize = "large";
    
    // Score based on match with preference
    if (homeSize === profile.communitySize.preferred) {
      socialScore += 100 * (profile.communitySize.importance / 5);
    } else if (
      (homeSize === "medium" && profile.communitySize.preferred === "small") ||
      (homeSize === "medium" && profile.communitySize.preferred === "large")
    ) {
      // Medium is somewhat compatible with small or large preferences
      socialScore += 60 * (profile.communitySize.importance / 5);
    } else {
      // Small vs large is a significant mismatch
      socialScore += 30 * (profile.communitySize.importance / 5);
    }
  }
  
  // Match activity preferences if specified
  if (profile.activityPreferences && profile.activityPreferences.length > 0) {
    factorsConsidered++;
    
    // Extract activities from home amenities or dedicated activities field
    const homeActivities = extractHomeActivities(home);
    
    if (homeActivities.length > 0) {
      // Count matching activities
      const matchingActivities = profile.activityPreferences.filter(
        activity => homeActivities.some(
          homeActivity => homeActivity.toLowerCase().includes(activity.toLowerCase())
        )
      );
      
      const activityMatchPercentage = (matchingActivities.length / profile.activityPreferences.length) * 100;
      socialScore += activityMatchPercentage;
    } else {
      // No activities listed, neutral score
      socialScore += 50;
    }
  }
  
  // Match social engagement level if specified
  if (profile.socialEngagement) {
    factorsConsidered++;
    
    // Estimate home's social engagement level based on activities and amenities
    const homeActivities = extractHomeActivities(home);
    const communalAmenities = extractCommunalAmenities(home);
    
    const estimatedEngagementLevel = Math.min(5, 
      1 + (homeActivities.length / 4) + (communalAmenities.length / 3)
    );
    
    // Calculate difference in engagement levels (0-4 scale)
    const engagementDifference = Math.abs(profile.socialEngagement - estimatedEngagementLevel);
    
    // Convert to score (smaller difference = higher score)
    const engagementScore = 100 - (engagementDifference * 20);
    socialScore += engagementScore;
  }
  
  // Match religious preferences if specified
  if (profile.religiousPreferences) {
    factorsConsidered++;
    
    // Check if home mentions religious services or facilities
    const homeAmenities = extractHomeAmenities(home);
    const homeActivities = extractHomeActivities(home);
    const allHomeFeatures = [...homeAmenities, ...homeActivities];
    
    const religiousKeywords = [
      "chapel", "church", "worship", "religious", "spiritual",
      profile.religiousPreferences.toLowerCase()
    ];
    
    const hasReligiousFeatures = allHomeFeatures.some(
      feature => religiousKeywords.some(
        keyword => feature.toLowerCase().includes(keyword)
      )
    );
    
    socialScore += hasReligiousFeatures ? 100 : 50;
  }
  
  // Match pet-friendly preference if specified
  if (profile.petFriendly !== undefined) {
    factorsConsidered++;
    
    // Check if home is pet-friendly
    const homeAmenities = extractHomeAmenities(home);
    const isPetFriendly = homeAmenities.some(
      amenity => amenity.toLowerCase().includes("pet")
    );
    
    if (profile.petFriendly === isPetFriendly) {
      socialScore += 100;
    } else {
      socialScore += 0; // Important mismatch
    }
  }
  
  // Average the scores if multiple factors were considered
  return factorsConsidered > 0 
    ? Math.min(100, socialScore / (factorsConsidered + 1))
    : socialScore;
}

/**
 * Extract activities from home data
 */
function extractHomeActivities(home: any): string[] {
  // Try to find activities in various data structures
  if (home.activities && Array.isArray(home.activities)) {
    return home.activities;
  }
  
  // Look for activities in amenities
  const homeAmenities = extractHomeAmenities(home);
  const activityKeywords = [
    "activity", "program", "class", "exercise", "game", 
    "music", "art", "craft", "therapy", "social", "outing"
  ];
  
  return homeAmenities.filter(amenity => 
    activityKeywords.some(keyword => 
      amenity.toLowerCase().includes(keyword)
    )
  );
}

/**
 * Extract communal amenities from home data
 */
function extractCommunalAmenities(home: any): string[] {
  const homeAmenities = extractHomeAmenities(home);
  const communalKeywords = [
    "common", "lounge", "dining", "community", "shared", 
    "garden", "patio", "library", "game", "theater"
  ];
  
  return homeAmenities.filter(amenity => 
    communalKeywords.some(keyword => 
      amenity.toLowerCase().includes(keyword)
    )
  );
}

/**
 * Calculate match score for medical needs compatibility
 * 
 * @param home Assisted living home
 * @param profile Resident profile
 * @returns Score from 0-100
 */
function calculateMedicalMatch(home: any, profile: ResidentProfile): number {
  if (!profile.medicalConditions && !profile.specializedCareNeeds) {
    return 80; // Good default score if no special medical needs
  }
  
  let medicalScore = 0;
  let factorsConsidered = 0;
  
  // Extract care services from home data
  const homeCareServices = extractCareServices(home);
  
  // Match specialized care needs
  if (profile.specializedCareNeeds && profile.specializedCareNeeds.length > 0) {
    factorsConsidered++;
    
    // Count matching specialized care services
    const matchingServices = profile.specializedCareNeeds.filter(
      need => homeCareServices.some(
        service => service.toLowerCase().includes(need.toLowerCase())
      )
    );
    
    const specializedCareMatchPercentage = (matchingServices.length / profile.specializedCareNeeds.length) * 100;
    
    // Specialized care needs are critical - heavily weight this score
    medicalScore += specializedCareMatchPercentage;
  }
  
  // Match medication management needs
  if (profile.medicationManagement) {
    factorsConsidered++;
    
    const hasMedicationManagement = homeCareServices.some(
      service => service.toLowerCase().includes("medication")
    );
    
    medicalScore += hasMedicationManagement ? 100 : 0; // Critical service
  }
  
  // Match incontinence care needs
  if (profile.incontinenceCare) {
    factorsConsidered++;
    
    const hasIncontinenceCare = homeCareServices.some(
      service => service.toLowerCase().includes("incontinence") || 
                 service.toLowerCase().includes("continence")
    );
    
    medicalScore += hasIncontinenceCare ? 100 : 20; // Important but not always explicitly listed
  }
  
  // Match diabetes care needs
  if (profile.diabetesCare) {
    factorsConsidered++;
    
    const hasDiabetesCare = homeCareServices.some(
      service => service.toLowerCase().includes("diabetes") || 
                 service.toLowerCase().includes("insulin")
    );
    
    medicalScore += hasDiabetesCare ? 100 : 30; // Important but may be handled under general medical care
  }
  
  // Average the scores if multiple factors were considered
  return factorsConsidered > 0 ? medicalScore / factorsConsidered : 80;
}

/**
 * Extract care services from home data
 */
function extractCareServices(home: any): string[] {
  // Try to find care services in various data structures
  if (home.careServices && Array.isArray(home.careServices)) {
    return home.careServices;
  }
  
  // Look for care services in amenities
  const homeAmenities = extractHomeAmenities(home);
  const careKeywords = [
    "care", "medical", "health", "nursing", "therapy", 
    "medication", "assistance", "aide", "help", "support"
  ];
  
  return homeAmenities.filter(amenity => 
    careKeywords.some(keyword => 
      amenity.toLowerCase().includes(keyword)
    )
  );
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

/**
 * Get top matching homes for a resident profile
 * 
 * @param residentProfile The resident profile with preferences and needs
 * @param options Search options including location, limit, etc.
 * @returns Array of homes with match scores
 */
export async function getTopMatchingHomes(
  residentProfile: ResidentProfile,
  options: {
    limit?: number;
    minScore?: number;
    careLevel?: string[];
    location?: {
      latitude: number;
      longitude: number;
      radius: number;
    };
  } = {}
): Promise<Array<{ home: AssistedLivingHome; matchScore: number }>> {
  const { limit = 10, minScore = 70, careLevel, location } = options;
  
  // Build query to find potential matches
  const where: any = {
    status: "ACTIVE",
  };
  
  // Filter by care level if specified
  if (careLevel && careLevel.length > 0) {
    where.careLevel = {
      hasSome: careLevel,
    };
  } else if (residentProfile.careLevelNeeded && residentProfile.careLevelNeeded.length > 0) {
    where.careLevel = {
      hasSome: residentProfile.careLevelNeeded,
    };
  }
  
  // Filter by budget if specified
  if (residentProfile.budget?.max) {
    where.priceMin = {
      lte: residentProfile.budget.max * 1.2, // Allow 20% over budget for high-match homes
    };
  }
  
  // Filter by gender if specified
  if (residentProfile.gender) {
    where.OR = [
      { genderRestriction: residentProfile.gender },
      { genderRestriction: "ALL" },
    ];
  }
  
  // Get potential matches
  const homes = await prisma.assistedLivingHome.findMany({
    where,
    include: {
      address: true,
      photos: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
      amenities: true,
      careServices: true,
    },
    take: limit * 3, // Get more than needed to filter by score
  });
  
  // Calculate match scores for each home
  const homesWithScores = await Promise.all(
    homes.map(async (home) => {
      const matchScore = await calculateAIMatchScore(home, residentProfile);
      return { home, matchScore };
    })
  );
  
  // Filter by minimum score and sort by match score
  return homesWithScores
    .filter(item => item.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Get resident profile recommendations based on initial data
 * 
 * This function enhances a partial resident profile with AI-generated
 * recommendations for preferences based on initial data provided.
 * 
 * @param partialProfile Initial resident profile data
 * @returns Enhanced resident profile with AI recommendations
 */
export async function getResidentProfileRecommendations(
  partialProfile: Partial<ResidentProfile>
): Promise<ResidentProfile> {
  // Start with the partial profile
  const enhancedProfile: ResidentProfile = { ...partialProfile } as ResidentProfile;
  
  // In a real implementation, this would call an AI service like OpenAI
  // to generate recommendations based on the partial profile
  
  // For now, we'll use rule-based logic to simulate AI recommendations
  
  // Recommend care level based on mobility and memory impairment
  if (!enhancedProfile.careLevelNeeded) {
    enhancedProfile.careLevelNeeded = [];
    
    if (enhancedProfile.mobilityLevel && enhancedProfile.mobilityLevel <= 2) {
      enhancedProfile.careLevelNeeded.push("ASSISTED");
    }
    
    if (enhancedProfile.memoryImpairment && enhancedProfile.memoryImpairment >= 3) {
      enhancedProfile.careLevelNeeded.push("MEMORY_CARE");
    }
    
    if (enhancedProfile.careLevelNeeded.length === 0) {
      enhancedProfile.careLevelNeeded.push("INDEPENDENT");
    }
  }
  
  // Recommend budget range based on care level needed
  if (!enhancedProfile.budget) {
    enhancedProfile.budget = { max: 0 };
    
    if (enhancedProfile.careLevelNeeded?.includes("MEMORY_CARE")) {
      enhancedProfile.budget.max = 7000;
    } else if (enhancedProfile.careLevelNeeded?.includes("ASSISTED")) {
      enhancedProfile.budget.max = 5000;
    } else {
      enhancedProfile.budget.max = 4000;
    }
  }
  
  // Recommend amenities based on age and social engagement
  if (!enhancedProfile.preferredAmenities) {
    enhancedProfile.preferredAmenities = ["Private Bathroom", "Housekeeping"];
    
    if (enhancedProfile.socialEngagement && enhancedProfile.socialEngagement >= 4) {
      enhancedProfile.preferredAmenities.push("Activity Room", "Garden/Patio", "Community Events");
    }
    
    if (enhancedProfile.age && enhancedProfile.age >= 80) {
      enhancedProfile.preferredAmenities.push("Elevator", "Grab Bars", "Emergency Call System");
    }
  }
  
  // Recommend activity preferences based on social engagement
  if (!enhancedProfile.activityPreferences) {
    enhancedProfile.activityPreferences = [];
    
    if (enhancedProfile.socialEngagement) {
      if (enhancedProfile.socialEngagement >= 4) {
        enhancedProfile.activityPreferences.push("Group Activities", "Community Outings");
      } else if (enhancedProfile.socialEngagement >= 2) {
        enhancedProfile.activityPreferences.push("Small Group Activities", "Music");
      } else {
        enhancedProfile.activityPreferences.push("One-on-One Activities", "Reading");
      }
    }
  }
  
  return enhancedProfile;
}
