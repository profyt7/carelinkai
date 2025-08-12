/**
 * Search Service for CareLinkAI
 * 
 * This service handles interactions with the search API, including parameter formatting,
 * API calls, and result processing. It provides a clean interface for components to
 * search for assisted living homes with AI-powered matching.
 */

import { CareLevel } from '@prisma/client';

/**
 * Search parameters interface
 */
export interface SearchParams {
  query?: string;              // Natural language query
  location?: string;           // City, state, or zip code
  careLevels?: CareLevel[];    // Care levels required
  priceMin?: number | string;  // Minimum monthly budget
  priceMax?: number | string;  // Maximum monthly budget
  gender?: 'ALL' | 'MALE' | 'FEMALE'; // Gender preference
  availability?: boolean;      // Whether home must have availability
  amenities?: string[];        // Required amenities
  page?: number;               // Page number for pagination
  limit?: number;              // Results per page

  /* ---- Phase-1 enhancements ---- */
  radius?: number;             // Search radius in miles
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'distance' | 'rating';
  availability?: number;       // Minimum availability required
  verified?: boolean;          // Only show verified homes
}

/**
 * Address information interface
 */
export interface AddressInfo {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Price range interface
 */
export interface PriceRange {
  min: number | null;
  max: number | null;
  formattedMin: string | null;
  formattedMax: string | null;
}

/**
 * Operator information interface
 */
export interface OperatorInfo {
  name: string;
  email: string;
}

/**
 * Search result item interface
 */
export interface SearchResultItem {
  id: string;
  name: string;
  description: string;
  address: AddressInfo | null;
  careLevel: CareLevel[];
  priceRange: PriceRange;
  capacity: number;
  availability: number;
  gender: string;
  amenities: string[];
  imageUrl: string | null;
  operator: OperatorInfo | null;
  aiMatchScore: number;
  /** Indicates whether the currently-logged-in family has favorited this home */
  isFavorited?: boolean;
}

/**
 * Pagination information interface
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

/**
 * Search query information interface
 */
export interface QueryInfo {
  text: string;
  location: string | null;
  careLevels: CareLevel[] | null;
  priceRange: { min: string | null; max: string | null } | null;
  gender: string;
  availability: boolean;
  amenities: string[] | null;
}

/**
 * Search response interface
 */
export interface SearchResponse {
  success: boolean;
  query: QueryInfo;
  pagination: PaginationInfo;
  results: SearchResultItem[];
  error?: string;
}

/**
 * Format search parameters for API request
 * 
 * @param params Search parameters
 * @returns URLSearchParams object
 */
function formatSearchParams(params: SearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  // Add parameters only if they exist
  if (params.query) searchParams.set('q', params.query);
  if (params.location) searchParams.set('location', params.location);
  
  // Add care levels (can have multiple)
  if (params.careLevels && params.careLevels.length > 0) {
    params.careLevels.forEach(level => {
      searchParams.append('careLevel', level);
    });
  }
  
  // Add price range
  if (params.priceMin) searchParams.set('priceMin', params.priceMin.toString());
  if (params.priceMax) searchParams.set('priceMax', params.priceMax.toString());
  
  // Add other filters
  if (params.gender) searchParams.set('gender', params.gender);
  if (params.availability !== undefined) searchParams.set('availability', params.availability.toString());
  if (params.radius) searchParams.set('radius', params.radius.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.verified !== undefined) searchParams.set('verified', params.verified.toString());
  
  // Add amenities (comma-separated)
  if (params.amenities && params.amenities.length > 0) {
    searchParams.set('amenities', params.amenities.join(','));
  }
  
  // Add pagination
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  
  return searchParams;
}

/* ------------------------------------------------------------------
   Suggestions / validation helpers
-------------------------------------------------------------------*/

const POPULAR_SUGGESTIONS: string[] = [
  'Memory care near me',
  'Affordable assisted living',
  'Pet-friendly homes',
  'Homes with private rooms',
  'Verified senior living facilities'
];

/**
 * Return a static list of popular search suggestions
 */
export function getSearchSuggestions(): string[] {
  return [...POPULAR_SUGGESTIONS];
}

/**
 * Return suggestions that contain the entered query (case-insensitive)
 */
export function getFilteredSuggestions(query: string): string[] {
  if (!query) return getSearchSuggestions();
  const lower = query.toLowerCase();
  return POPULAR_SUGGESTIONS.filter(s => s.toLowerCase().includes(lower));
}

/**
 * Basic client-side validation for search params. Returns an array of
 * error messages (empty array = no errors).
 */
export function validateSearchParams(params: SearchParams): string[] {
  const errors: string[] = [];

  if (params.priceMin && params.priceMax) {
    const min = Number(params.priceMin);
    const max = Number(params.priceMax);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      errors.push('Minimum price cannot be greater than maximum price.');
    }
  }

  if (params.radius !== undefined && params.radius <= 0) {
    errors.push('Radius must be greater than zero.');
  }

  if (params.availability !== undefined && params.availability < 0) {
    errors.push('Availability must be zero or a positive number.');
  }

  return errors;
}

/**
 * Search for assisted living homes with AI matching
 * 
 * @param params Search parameters
 * @returns Promise with search results
 */
export async function searchHomes(params: SearchParams): Promise<SearchResponse> {
  try {
    // Format parameters
    const searchParams = formatSearchParams(params);
    
    // Call API
    const response = await fetch(`/api/search?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Check for errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search homes');
    }
    
    // Parse and return results
    const data: SearchResponse = await response.json();
    return data;
    
  } catch (error) {
    console.error('Error searching homes:', error);
    
    // Return error response
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      query: {
        text: params.query || '',
        location: params.location || null,
        careLevels: params.careLevels || null,
        priceRange: params.priceMin || params.priceMax 
          ? { min: params.priceMin?.toString() || null, max: params.priceMax?.toString() || null } 
          : null,
        gender: params.gender || 'ALL',
        availability: params.availability || false,
        amenities: params.amenities || null
      },
      pagination: {
        page: params.page || 1,
        limit: params.limit || 10,
        totalResults: 0,
        totalPages: 0
      },
      results: []
    };
  }
}

/**
 * Get care level display name
 * 
 * @param careLevel Care level enum value
 * @returns Human-readable care level name
 */
export function getCareLevelName(careLevel: CareLevel): string {
  switch (careLevel) {
    case CareLevel.INDEPENDENT:
      return 'Independent Living';
    case CareLevel.ASSISTED:
      return 'Assisted Living';
    case CareLevel.MEMORY_CARE:
      return 'Memory Care';
    case CareLevel.SKILLED_NURSING:
      return 'Skilled Nursing';
    default:
      return careLevel;
  }
}

/**
 * Parse natural language query to extract search parameters
 * 
 * @param query Natural language query string
 * @returns Extracted search parameters
 */
export function parseNaturalLanguageQuery(query: string): Partial<SearchParams> {
  if (!query) return {};
  
  const params: Partial<SearchParams> = {
    query
  };
  
  // Extract location
  const locationPatterns = [
    /near\s+([a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/i,
    /in\s+([a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/i,
    /around\s+([a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/i,
  ];
  
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      params.location = match[1].trim();
      break;
    }
  }
  
  // Extract care levels
  const careLevels: CareLevel[] = [];
  const q = query.toLowerCase();
  
  if (q.includes('memory care') || q.includes('alzheimer') || q.includes('dementia')) {
    careLevels.push(CareLevel.MEMORY_CARE);
  }
  
  if (q.includes('assisted') || q.includes('help with')) {
    careLevels.push(CareLevel.ASSISTED);
  }
  
  if (q.includes('independent')) {
    careLevels.push(CareLevel.INDEPENDENT);
  }
  
  if (q.includes('nursing') || q.includes('skilled') || q.includes('medical care')) {
    careLevels.push(CareLevel.SKILLED_NURSING);
  }
  
  if (careLevels.length > 0) {
    params.careLevels = careLevels;
  }
  
  // Extract price range
  const pricePattern = /(\$\d+[kK]|\$\d+,\d+|\d+[kK]|\d+ thousand)/;
  const priceMatch = q.match(pricePattern);
  
  if (priceMatch) {
    const priceText = priceMatch[0].toLowerCase();
    let price = 0;
    
    if (priceText.includes('k')) {
      price = parseInt(priceText.replace(/[^\d]/g, '')) * 1000;
    } else if (priceText.includes('thousand')) {
      price = parseInt(priceText.replace(/[^\d]/g, '')) * 1000;
    } else {
      price = parseInt(priceText.replace(/[^\d]/g, ''));
    }
    
    if (price > 0) {
      if (q.includes('under') || q.includes('less than') || q.includes('below')) {
        params.priceMax = price;
      } else if (q.includes('over') || q.includes('more than') || q.includes('above')) {
        params.priceMin = price;
      } else {
        // Default to this as the max budget
        params.priceMax = price;
      }
    }
  }
  
  // Extract availability requirement
  const availMatch = q.match(/(at least|min(?:imum)?)[^\\d]*(\\d+)/);
  if (availMatch) {
    params.availability = parseInt(availMatch[2], 10);
  } else if (q.includes('available') || q.includes('vacancy') || q.includes('open spot') || q.includes('openings')) {
    params.availability = 1; // default minimum 1 slot
  }

  // Extract radius (e.g., "within 10 miles", "inside 25 mi")
  const radiusMatch = q.match(/(?:within|inside)\\s+(\\d+)\\s*(?:miles?|mi)/);
  if (radiusMatch) {
    params.radius = parseInt(radiusMatch[1], 10);
  }

  // Extract verified requirement
  if (q.includes('verified') || q.includes('licensed')) {
    params.verified = true;
  }

  // Extract sort order
  if (q.includes('cheapest') || q.includes('lowest price')) {
    params.sortBy = 'price_low';
  } else if (q.includes('highest price') || q.includes('most expensive')) {
    params.sortBy = 'price_high';
  } else if (q.includes('closest') || q.includes('nearest')) {
    params.sortBy = 'distance';
  } else if (q.includes('best rated') || q.includes('highest rated')) {
    params.sortBy = 'rating';
  }
  
  return params;
}

/**
 * Get recommended search queries based on common needs
 * 
 * @returns Array of recommended search queries
 */
export function getRecommendedSearches(): string[] {
  return [
    "Memory care homes near San Francisco",
    "Assisted living with garden and private rooms",
    "Independent living under $4000 per month",
    "Skilled nursing with 24/7 care available now",
    "Pet-friendly assisted living homes",
    "Memory care with art therapy programs",
    "Assisted living with transportation services",
    "Homes with physical therapy and fitness center"
  ];
}
