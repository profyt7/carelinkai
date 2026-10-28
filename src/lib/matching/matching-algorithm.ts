/**
 * AI-Powered Resident Matching Engine
 * 
 * This module implements the core matching algorithm that scores and ranks
 * assisted living homes based on family preferences and needs.
 * 
 * Scoring Weights:
 * - Budget Match: 30%
 * - Condition Compatibility: 25%
 * - Care Level Match: 20%
 * - Location/Distance: 15%
 * - Amenities/Preferences: 10%
 */

import { prisma } from '@/lib/prisma';
import { CareLevel } from '@prisma/client';

export interface MatchPreferences {
  budgetMin: number;
  budgetMax: number;
  medicalConditions: string[];
  careLevel: string;
  preferredGender?: string;
  religion?: string;
  dietaryNeeds: string[];
  hobbies: string[];
  petPreferences?: string;
  zipCode: string;
  maxDistance: number;
  moveInTimeline: string;
}

export interface HomeScore {
  homeId: string;
  fitScore: number;
  matchFactors: {
    budgetScore: number;
    conditionScore: number;
    careLevelScore: number;
    locationScore: number;
    amenitiesScore: number;
  };
  home: any;
}

// Weights for each scoring factor (must sum to 100%)
const WEIGHTS = {
  BUDGET: 0.30,
  CONDITION: 0.25,
  CARE_LEVEL: 0.20,
  LOCATION: 0.15,
  AMENITIES: 0.10
};

/**
 * Calculate budget match score (0-100)
 * Perfect match = home price is within budget range
 * Partial match = home price is close to budget range
 */
function calculateBudgetScore(
  homeMinPrice: number | null,
  homeMaxPrice: number | null,
  familyMinBudget: number,
  familyMaxBudget: number
): number {
  // If home doesn't have pricing info, score 50 (neutral)
  if (!homeMinPrice || !homeMaxPrice) {
    return 50;
  }

  // Perfect match: home's price range overlaps with family's budget
  if (homeMinPrice <= familyMaxBudget && homeMaxPrice >= familyMinBudget) {
    // Calculate how much overlap there is
    const overlapStart = Math.max(homeMinPrice, familyMinBudget);
    const overlapEnd = Math.min(homeMaxPrice, familyMaxBudget);
    const overlapAmount = overlapEnd - overlapStart;
    const budgetRange = familyMaxBudget - familyMinBudget;
    
    // Score based on overlap percentage
    const overlapPercentage = overlapAmount / budgetRange;
    return 70 + (overlapPercentage * 30); // 70-100 score range
  }

  // Home is slightly outside budget - calculate how far
  if (homeMinPrice > familyMaxBudget) {
    // Home is too expensive
    const excess = homeMinPrice - familyMaxBudget;
    const excessPercentage = excess / familyMaxBudget;
    
    if (excessPercentage < 0.1) return 60; // Within 10% - good
    if (excessPercentage < 0.2) return 40; // Within 20% - okay
    if (excessPercentage < 0.3) return 20; // Within 30% - poor
    return 0; // Too expensive
  }

  if (homeMaxPrice < familyMinBudget) {
    // Home is cheaper than budget (might indicate lower quality)
    const deficit = familyMinBudget - homeMaxPrice;
    const deficitPercentage = deficit / familyMinBudget;
    
    if (deficitPercentage < 0.1) return 65; // Within 10% - good deal
    if (deficitPercentage < 0.2) return 50; // Within 20% - okay
    if (deficitPercentage < 0.3) return 30; // Within 30% - investigate
    return 10; // Significantly cheaper - quality concern
  }

  return 50; // Default neutral score
}

/**
 * Calculate condition compatibility score (0-100)
 * Based on how well the home can handle the family's medical conditions
 */
function calculateConditionScore(
  homeAmenities: string[],
  medicalConditions: string[]
): number {
  if (medicalConditions.length === 0) {
    return 100; // No special needs = perfect match
  }

  // Map medical conditions to expected amenities/features
  const conditionMapping: { [key: string]: string[] } = {
    'dementia': ['Memory Care', 'Dementia Care', 'Alzheimer\'s Care', 'Secure Unit'],
    'alzheimers': ['Memory Care', 'Alzheimer\'s Care', 'Dementia Care', 'Secure Unit'],
    'diabetes': ['Medication Management', 'Diabetic Meal Plans', 'Medical Monitoring'],
    'mobility_issues': ['Wheelchair Accessible', 'Physical Therapy', 'Grab Bars', 'Ramps'],
    'incontinence': ['Personal Care', 'Assisted Bathing', '24/7 Care'],
    'heart_disease': ['Medical Monitoring', '24/7 Nursing', 'Emergency Response'],
    'stroke': ['Physical Therapy', 'Occupational Therapy', 'Speech Therapy'],
    'parkinsons': ['Physical Therapy', 'Fall Prevention', 'Medication Management']
  };

  let totalMatches = 0;
  let totalPossible = 0;

  medicalConditions.forEach(condition => {
    const requiredFeatures = conditionMapping[condition.toLowerCase()] || [];
    totalPossible += requiredFeatures.length;

    requiredFeatures.forEach(feature => {
      // Check if home has this feature (case-insensitive)
      const hasFeature = homeAmenities.some(
        amenity => amenity.toLowerCase().includes(feature.toLowerCase()) ||
                   feature.toLowerCase().includes(amenity.toLowerCase())
      );
      if (hasFeature) totalMatches++;
    });
  });

  if (totalPossible === 0) return 100;
  
  const matchPercentage = totalMatches / totalPossible;
  return Math.min(100, matchPercentage * 100 + 20); // Add 20 base points
}

/**
 * Calculate care level match score (0-100)
 * Perfect match = home offers exactly the required care level
 */
function calculateCareLevelScore(
  homeCareLevels: CareLevel[],
  requiredCareLevel: string
): number {
  // Map care level strings to CareLevel enum
  const careLevelMap: { [key: string]: CareLevel } = {
    'INDEPENDENT_LIVING': CareLevel.INDEPENDENT,
    'INDEPENDENT': CareLevel.INDEPENDENT,
    'ASSISTED_LIVING': CareLevel.ASSISTED,
    'ASSISTED': CareLevel.ASSISTED,
    'MEMORY_CARE': CareLevel.MEMORY_CARE,
    'SKILLED_NURSING': CareLevel.SKILLED_NURSING
  };

  const required = careLevelMap[requiredCareLevel];
  
  if (!required) return 50; // Invalid care level

  // Perfect match: home offers exactly this care level
  if (homeCareLevels.includes(required)) {
    return 100;
  }

  // Check for compatible care levels
  // Memory Care facilities often provide Assisted Living
  if (required === CareLevel.ASSISTED && 
      homeCareLevels.includes(CareLevel.MEMORY_CARE)) {
    return 80;
  }

  // Skilled Nursing can provide any level of care
  if (homeCareLevels.includes(CareLevel.SKILLED_NURSING)) {
    return 70;
  }

  // No compatible care level
  return 0;
}

/**
 * Calculate location score (0-100)
 * Based on distance from family's location
 * Note: Simplified implementation - uses zip code string matching
 * In production, use geocoding API for accurate distance calculation
 */
function calculateLocationScore(
  homeZipCode: string | null,
  familyZipCode: string,
  maxDistance: number
): number {
  if (!homeZipCode) return 50; // No location data

  // Simplified distance calculation
  // In production, use Google Maps API or similar for accurate distance
  
  // For now, compare zip codes as strings
  if (homeZipCode === familyZipCode) {
    return 100; // Same zip code
  }

  // Check first 3 digits (approximate area)
  const homePrefix = homeZipCode.substring(0, 3);
  const familyPrefix = familyZipCode.substring(0, 3);
  
  if (homePrefix === familyPrefix) {
    return 80; // Same general area
  }

  // Different areas - score decreases
  const numericDiff = Math.abs(parseInt(homePrefix) - parseInt(familyPrefix));
  
  if (numericDiff <= 5) return 60;
  if (numericDiff <= 10) return 40;
  if (numericDiff <= 20) return 20;
  
  return 10; // Very far
}

/**
 * Calculate amenities/preferences score (0-100)
 * Based on match for religion, dietary needs, pets, hobbies
 */
function calculateAmenitiesScore(
  homeAmenities: string[],
  preferences: {
    religion?: string;
    dietaryNeeds: string[];
    hobbies: string[];
    petPreferences?: string;
    preferredGender?: string;
  }
): number {
  let score = 0;
  let factors = 0;

  // Religion matching (25% of amenities score)
  if (preferences.religion) {
    factors++;
    const hasReligiousServices = homeAmenities.some(a => 
      a.toLowerCase().includes(preferences.religion!.toLowerCase()) ||
      a.toLowerCase().includes('chaplain') ||
      a.toLowerCase().includes('religious')
    );
    if (hasReligiousServices) score += 25;
  }

  // Dietary needs (25% of amenities score)
  if (preferences.dietaryNeeds.length > 0) {
    factors++;
    let dietaryMatches = 0;
    preferences.dietaryNeeds.forEach(diet => {
      const hasDietOption = homeAmenities.some(a =>
        a.toLowerCase().includes(diet.toLowerCase()) ||
        a.toLowerCase().includes('dietary') ||
        a.toLowerCase().includes('meal')
      );
      if (hasDietOption) dietaryMatches++;
    });
    const dietScore = (dietaryMatches / preferences.dietaryNeeds.length) * 25;
    score += dietScore;
  }

  // Pet preferences (25% of amenities score)
  if (preferences.petPreferences) {
    factors++;
    if (preferences.petPreferences === 'HAS_PETS' || 
        preferences.petPreferences === 'PET_FRIENDLY') {
      const isPetFriendly = homeAmenities.some(a =>
        a.toLowerCase().includes('pet') ||
        a.toLowerCase().includes('animal')
      );
      if (isPetFriendly) score += 25;
    } else {
      score += 25; // No pets needed - not a factor
    }
  }

  // Hobbies/interests (25% of amenities score)
  if (preferences.hobbies.length > 0) {
    factors++;
    let hobbyMatches = 0;
    preferences.hobbies.forEach(hobby => {
      const hasHobbyActivity = homeAmenities.some(a =>
        a.toLowerCase().includes(hobby.toLowerCase()) ||
        a.toLowerCase().includes('activity') ||
        a.toLowerCase().includes('recreation')
      );
      if (hasHobbyActivity) hobbyMatches++;
    });
    const hobbyScore = (hobbyMatches / preferences.hobbies.length) * 25;
    score += hobbyScore;
  }

  // If no factors specified, return 100 (nothing to match against)
  if (factors === 0) return 100;

  // Normalize to 0-100 scale
  return Math.min(100, (score / factors) * (100 / 25));
}

/**
 * Main matching algorithm
 * Fetches homes, scores them, and returns top matches
 */
export async function findMatchingHomes(
  preferences: MatchPreferences,
  limit: number = 5
): Promise<HomeScore[]> {
  // Fetch all active homes that offer the required care level
  const homes = await prisma.assistedLivingHome.findMany({
    where: {
      status: 'ACTIVE',
      careLevel: {
        hasSome: [preferences.careLevel as CareLevel]
      }
    },
    include: {
      address: true,
      photos: {
        where: { isPrimary: true },
        take: 1
      },
      operator: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      },
      reviews: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  // Score each home
  const scoredHomes: HomeScore[] = homes.map(home => {
    // Calculate individual factor scores
    const budgetScore = calculateBudgetScore(
      home.priceMin ? parseFloat(home.priceMin.toString()) : null,
      home.priceMax ? parseFloat(home.priceMax.toString()) : null,
      preferences.budgetMin,
      preferences.budgetMax
    );

    const conditionScore = calculateConditionScore(
      home.amenities,
      preferences.medicalConditions
    );

    const careLevelScore = calculateCareLevelScore(
      home.careLevel,
      preferences.careLevel
    );

    const locationScore = calculateLocationScore(
      home.address?.zipCode || null,
      preferences.zipCode,
      preferences.maxDistance
    );

    const amenitiesScore = calculateAmenitiesScore(
      home.amenities,
      {
        religion: preferences.religion,
        dietaryNeeds: preferences.dietaryNeeds,
        hobbies: preferences.hobbies,
        petPreferences: preferences.petPreferences,
        preferredGender: preferences.preferredGender
      }
    );

    // Calculate weighted final score
    const fitScore = 
      (budgetScore * WEIGHTS.BUDGET) +
      (conditionScore * WEIGHTS.CONDITION) +
      (careLevelScore * WEIGHTS.CARE_LEVEL) +
      (locationScore * WEIGHTS.LOCATION) +
      (amenitiesScore * WEIGHTS.AMENITIES);

    return {
      homeId: home.id,
      fitScore: Math.round(fitScore * 100) / 100, // Round to 2 decimals
      matchFactors: {
        budgetScore: Math.round(budgetScore * 100) / 100,
        conditionScore: Math.round(conditionScore * 100) / 100,
        careLevelScore: Math.round(careLevelScore * 100) / 100,
        locationScore: Math.round(locationScore * 100) / 100,
        amenitiesScore: Math.round(amenitiesScore * 100) / 100
      },
      home
    };
  });

  // Sort by fit score (highest first) and return top matches
  return scoredHomes
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, limit);
}
