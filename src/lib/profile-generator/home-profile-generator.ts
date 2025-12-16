/**
 * AI-Powered Home Profile Generator (Feature #2)
 * 
 * Generates professional descriptions and highlights for assisted living homes
 * using GPT-4 to help operators create compelling, accurate profiles.
 */

import OpenAI from 'openai';

// Lazy initialize OpenAI client to handle missing API key gracefully
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (openai) return openai;
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('[Profile Generator] OPENAI_API_KEY not found. Using fallback profiles.');
    return null;
  }
  
  try {
    openai = new OpenAI({ apiKey });
    return openai;
  } catch (error) {
    console.error('[Profile Generator] Failed to initialize OpenAI client:', error);
    return null;
  }
}

export interface HomeData {
  name: string;
  description?: string;
  careLevel: string[];
  capacity: number;
  currentOccupancy: number;
  priceMin?: number;
  priceMax?: number;
  amenities: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  genderRestriction?: string | null;
}

export interface GeneratedProfile {
  description: string;
  highlights: string[];
}

/**
 * Generate an AI-powered profile for an assisted living home
 */
export async function generateHomeProfile(
  homeData: HomeData
): Promise<GeneratedProfile> {
  try {
    // Get OpenAI client (will return null if API key is missing)
    const client = getOpenAIClient();
    
    // If no client, use fallback immediately
    if (!client) {
      return generateFallbackProfile(homeData);
    }
    
    // Build the prompt for description
    const descriptionPrompt = buildDescriptionPrompt(homeData);
    const highlightsPrompt = buildHighlightsPrompt(homeData);
    
    // Call OpenAI API for both description and highlights
    const [descriptionResponse, highlightsResponse] = await Promise.all([
      client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter specializing in senior care facilities. Create warm, professional, and informative descriptions that highlight the unique qualities of each home while being honest and accurate. Focus on what makes the home special and how it serves its residents.'
          },
          {
            role: 'user',
            content: descriptionPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      }),
      client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter creating bullet points for senior care facilities. Generate 3-5 concise, compelling highlights that families will find most valuable. Each highlight should be one short sentence or phrase. Format as a JSON array of strings.'
          },
          {
            role: 'user',
            content: highlightsPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    ]);
    
    const description = descriptionResponse.choices[0]?.message?.content || 
      generateFallbackProfile(homeData).description;
    
    let highlights: string[] = [];
    try {
      const highlightsText = highlightsResponse.choices[0]?.message?.content || '[]';
      highlights = JSON.parse(highlightsText);
      
      // Validate that we got an array of strings
      if (!Array.isArray(highlights) || highlights.some(h => typeof h !== 'string')) {
        throw new Error('Invalid highlights format');
      }
    } catch (parseError) {
      console.warn('[Profile Generator] Failed to parse highlights, using fallback');
      highlights = generateFallbackProfile(homeData).highlights;
    }
    
    return {
      description: description.trim(),
      highlights: highlights.slice(0, 5) // Limit to 5 highlights
    };
    
  } catch (error) {
    console.error('[Profile Generator] Error generating profile:', error);
    
    // Fallback to template-based profile if OpenAI fails
    return generateFallbackProfile(homeData);
  }
}

/**
 * Build the prompt for generating description
 */
function buildDescriptionPrompt(data: HomeData): string {
  const {
    name,
    description,
    careLevel,
    capacity,
    currentOccupancy,
    priceMin,
    priceMax,
    amenities,
    address,
    genderRestriction
  } = data;
  
  const location = address ? 
    `${address.city ? address.city + ', ' : ''}${address.state || ''}`.trim() : 
    'a convenient location';
  
  const priceRange = priceMin && priceMax ? 
    `$${priceMin.toLocaleString()} - $${priceMax.toLocaleString()} per month` : 
    'competitive pricing';
  
  const availability = capacity - currentOccupancy;
  const availabilityText = availability > 0 ? 
    `Currently has ${availability} available ${availability === 1 ? 'space' : 'spaces'}` : 
    'Currently at full capacity with a waitlist available';
  
  const careLevelText = careLevel.length > 0 ? 
    careLevel.map(cl => cl.replace(/_/g, ' ').toLowerCase()).join(', ') : 
    'various care levels';
  
  const genderText = genderRestriction ? 
    `This is a ${genderRestriction.toLowerCase()}-only facility.` : 
    'Welcoming residents of all genders.';
  
  return `
Generate a professional, warm, and informative 2-3 paragraph description for "${name}", an assisted living home.

Key Details:
- Location: ${location}
- Care Levels: ${careLevelText}
- Capacity: ${capacity} residents
- ${availabilityText}
- Pricing: ${priceRange}
- ${genderText}
- Key Amenities: ${amenities.slice(0, 8).join(', ') || 'standard assisted living amenities'}

${description ? `Existing description for reference (create a fresh, better version): "${description}"` : ''}

Requirements:
- Write 2-3 engaging paragraphs (200-300 words total)
- Start with what makes this home special
- Highlight the care philosophy and resident experience
- Mention key amenities naturally in context
- Use warm, professional language that appeals to families
- Be specific and authentic, avoid generic phrases
- DO NOT use markdown formatting or asterisks
- DO NOT include a title or heading
- Write in third person

Create the description now:
  `.trim();
}

/**
 * Build the prompt for generating highlights
 */
function buildHighlightsPrompt(data: HomeData): string {
  const {
    name,
    careLevel,
    capacity,
    amenities,
    address,
    priceMin,
    priceMax
  } = data;
  
  const location = address ? 
    `${address.city ? address.city + ', ' : ''}${address.state || ''}`.trim() : 
    null;
  
  return `
Generate 3-5 key highlights for "${name}" that families would find most important.

Available Information:
- Care Levels: ${careLevel.join(', ') || 'Not specified'}
- Capacity: ${capacity} residents
- Location: ${location || 'Not specified'}
- Pricing: ${priceMin && priceMax ? `$${priceMin}-$${priceMax}/month` : 'Not specified'}
- Amenities: ${amenities.join(', ') || 'Not specified'}

Requirements:
- Generate 3-5 highlights only
- Each highlight should be concise (5-10 words max)
- Focus on what families care about most (care quality, location, amenities, pricing, safety)
- Be specific and factual based on the data
- Start each highlight with a noun or adjective (not "We offer..." or "Provides...")
- Examples: "24/7 Licensed Nursing Staff", "Pet-Friendly Community", "Memory Care Specialists"

Return ONLY a JSON array of strings. Example format:
["24/7 Licensed Nursing Care", "Spacious Private Rooms", "Chef-Prepared Meals Daily"]

Generate the highlights array now:
  `.trim();
}

/**
 * Generate a fallback profile if OpenAI fails or is unavailable
 */
function generateFallbackProfile(data: HomeData): GeneratedProfile {
  const {
    name,
    description,
    careLevel,
    capacity,
    currentOccupancy,
    priceMin,
    priceMax,
    amenities,
    address,
    genderRestriction
  } = data;
  
  const location = address ? 
    `${address.city ? address.city + ', ' : ''}${address.state || ''}`.trim() : 
    'a convenient location';
  
  const availability = capacity - currentOccupancy;
  const careLevelText = careLevel.length > 0 ? 
    careLevel.map(cl => cl.replace(/_/g, ' ').toLowerCase()).join(' and ') : 
    'comprehensive care';
  
  // Generate description
  let fallbackDescription = `${name} is a welcoming assisted living community located in ${location}. `;
  
  fallbackDescription += `We specialize in providing ${careLevelText} for our residents in a comfortable and supportive environment. `;
  
  if (capacity) {
    fallbackDescription += `Our facility accommodates up to ${capacity} residents, `;
    if (availability > 0) {
      fallbackDescription += `and we currently have ${availability} ${availability === 1 ? 'space' : 'spaces'} available. `;
    } else {
      fallbackDescription += `and we maintain a waitlist for interested families. `;
    }
  }
  
  if (amenities.length > 0) {
    fallbackDescription += `Our amenities include ${amenities.slice(0, 5).join(', ')}, designed to enhance the quality of life for our residents. `;
  }
  
  if (genderRestriction) {
    fallbackDescription += `We are a ${genderRestriction.toLowerCase()}-only facility, creating a comfortable environment tailored to our residents' needs. `;
  }
  
  fallbackDescription += `We are committed to providing compassionate, personalized care that respects the dignity and independence of each individual.`;
  
  // Generate highlights
  const fallbackHighlights: string[] = [];
  
  if (careLevel.length > 0) {
    fallbackHighlights.push(`${careLevel.map(cl => cl.replace(/_/g, ' ')).join(' & ')} Services`);
  }
  
  if (location && location !== 'a convenient location') {
    fallbackHighlights.push(`Conveniently Located in ${location}`);
  }
  
  if (capacity) {
    fallbackHighlights.push(`${capacity}-Resident Capacity for Personalized Attention`);
  }
  
  if (amenities.length > 0) {
    const topAmenity = amenities[0];
    fallbackHighlights.push(topAmenity.charAt(0).toUpperCase() + topAmenity.slice(1));
  }
  
  if (priceMin && priceMax) {
    fallbackHighlights.push(`Transparent Pricing: $${priceMin.toLocaleString()}-$${priceMax.toLocaleString()}/month`);
  }
  
  // Ensure we have at least 3 highlights
  if (fallbackHighlights.length < 3) {
    const genericHighlights = [
      'Experienced and Compassionate Staff',
      'Safe and Comfortable Environment',
      'Family-Oriented Community',
      'Daily Activities and Social Programs'
    ];
    
    for (const highlight of genericHighlights) {
      if (fallbackHighlights.length >= 5) break;
      if (!fallbackHighlights.includes(highlight)) {
        fallbackHighlights.push(highlight);
      }
    }
  }
  
  return {
    description: fallbackDescription.trim(),
    highlights: fallbackHighlights.slice(0, 5)
  };
}

/**
 * Validate home data before generating profile
 */
export function validateHomeData(data: Partial<HomeData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Home name is required');
  }
  
  if (!data.capacity || data.capacity <= 0) {
    errors.push('Valid capacity is required');
  }
  
  if (data.currentOccupancy !== undefined && data.currentOccupancy < 0) {
    errors.push('Current occupancy cannot be negative');
  }
  
  if (data.capacity && data.currentOccupancy !== undefined && data.currentOccupancy > data.capacity) {
    errors.push('Current occupancy cannot exceed capacity');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
