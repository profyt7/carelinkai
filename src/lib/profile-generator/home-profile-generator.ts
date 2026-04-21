/**
 * AI-Powered Home Profile Generator
 *
 * Generates professional descriptions and highlights for assisted living homes
 * to help operators create compelling, accurate profiles.
 */

import { getAnthropicClient } from '@/lib/ai/claude';

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
export async function generateHomeProfile(homeData: HomeData): Promise<GeneratedProfile> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return generateFallbackProfile(homeData);
  }

  try {
    const client = getAnthropicClient();

    const [descriptionResponse, highlightsResponse] = await Promise.all([
      client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: 'You are a professional copywriter specializing in senior care facilities. Create warm, professional, and informative descriptions that highlight the unique qualities of each home while being honest and accurate. Focus on what makes the home special and how it serves its residents. Do not use markdown formatting or asterisks. Do not include a title or heading. Write in third person.',
        messages: [{ role: 'user', content: buildDescriptionPrompt(homeData) }],
      }),
      client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: 'You are a professional copywriter creating bullet points for senior care facilities. Generate 3-5 concise, compelling highlights that families will find most valuable. Each highlight should be one short sentence or phrase. Return a JSON array of strings only — no markdown, no code blocks.',
        messages: [{ role: 'user', content: buildHighlightsPrompt(homeData) }],
      }),
    ]);

    const descBlock = descriptionResponse.content[0];
    const description = descBlock.type === 'text' ? descBlock.text.trim() : generateFallbackProfile(homeData).description;

    let highlights: string[] = [];
    try {
      const hlBlock = highlightsResponse.content[0];
      const hlRaw = hlBlock.type === 'text' ? hlBlock.text.trim() : '[]';
      const hlJson = hlRaw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(hlJson);
      if (Array.isArray(parsed) && parsed.every((h) => typeof h === 'string')) {
        highlights = parsed;
      } else {
        highlights = generateFallbackProfile(homeData).highlights;
      }
    } catch {
      highlights = generateFallbackProfile(homeData).highlights;
    }

    return {
      description,
      highlights: highlights.slice(0, 5),
    };
  } catch (error) {
    console.error('[Profile Generator] Error generating profile:', error);
    return generateFallbackProfile(homeData);
  }
}

function buildDescriptionPrompt(data: HomeData): string {
  const location = data.address
    ? `${data.address.city ? data.address.city + ', ' : ''}${data.address.state || ''}`.trim()
    : 'a convenient location';

  const priceRange =
    data.priceMin && data.priceMax
      ? `$${data.priceMin.toLocaleString()} - $${data.priceMax.toLocaleString()} per month`
      : 'competitive pricing';

  const availability = data.capacity - data.currentOccupancy;
  const availabilityText =
    availability > 0
      ? `Currently has ${availability} available ${availability === 1 ? 'space' : 'spaces'}`
      : 'Currently at full capacity with a waitlist available';

  const careLevelText =
    data.careLevel.length > 0
      ? data.careLevel.map((cl) => cl.replace(/_/g, ' ').toLowerCase()).join(', ')
      : 'various care levels';

  const genderText = data.genderRestriction
    ? `This is a ${data.genderRestriction.toLowerCase()}-only facility.`
    : 'Welcoming residents of all genders.';

  return `Generate a professional, warm, and informative 2-3 paragraph description for "${data.name}", an assisted living home.

Key Details:
- Location: ${location}
- Care Levels: ${careLevelText}
- Capacity: ${data.capacity} residents
- ${availabilityText}
- Pricing: ${priceRange}
- ${genderText}
- Key Amenities: ${data.amenities.slice(0, 8).join(', ') || 'standard assisted living amenities'}

${data.description ? `Existing description for reference (create a fresh, better version): "${data.description}"` : ''}

Write 2-3 engaging paragraphs (200-300 words). Start with what makes this home special. Be specific and authentic.`.trim();
}

function buildHighlightsPrompt(data: HomeData): string {
  const location = data.address
    ? `${data.address.city ? data.address.city + ', ' : ''}${data.address.state || ''}`.trim()
    : null;

  return `Generate 3-5 key highlights for "${data.name}" that families would find most important.

Available Information:
- Care Levels: ${data.careLevel.join(', ') || 'Not specified'}
- Capacity: ${data.capacity} residents
- Location: ${location || 'Not specified'}
- Pricing: ${data.priceMin && data.priceMax ? `$${data.priceMin}-$${data.priceMax}/month` : 'Not specified'}
- Amenities: ${data.amenities.join(', ') || 'Not specified'}

Return a JSON array of strings only. Example: ["24/7 Licensed Nursing Care", "Spacious Private Rooms", "Chef-Prepared Meals Daily"]`.trim();
}

function generateFallbackProfile(data: HomeData): GeneratedProfile {
  const location = data.address
    ? `${data.address.city ? data.address.city + ', ' : ''}${data.address.state || ''}`.trim()
    : 'a convenient location';

  const availability = data.capacity - data.currentOccupancy;
  const careLevelText =
    data.careLevel.length > 0
      ? data.careLevel.map((cl) => cl.replace(/_/g, ' ').toLowerCase()).join(' and ')
      : 'comprehensive care';

  let description = `${data.name} is a welcoming assisted living community located in ${location}. `;
  description += `We specialize in providing ${careLevelText} for our residents in a comfortable and supportive environment. `;

  if (data.capacity) {
    description += `Our facility accommodates up to ${data.capacity} residents, `;
    description +=
      availability > 0
        ? `and we currently have ${availability} ${availability === 1 ? 'space' : 'spaces'} available. `
        : `and we maintain a waitlist for interested families. `;
  }

  if (data.amenities.length > 0) {
    description += `Our amenities include ${data.amenities.slice(0, 5).join(', ')}, designed to enhance the quality of life for our residents. `;
  }

  if (data.genderRestriction) {
    description += `We are a ${data.genderRestriction.toLowerCase()}-only facility, creating a comfortable environment tailored to our residents' needs. `;
  }

  description += `We are committed to providing compassionate, personalized care that respects the dignity and independence of each individual.`;

  const highlights: string[] = [];

  if (data.careLevel.length > 0) {
    highlights.push(`${data.careLevel.map((cl) => cl.replace(/_/g, ' ')).join(' & ')} Services`);
  }

  if (location && location !== 'a convenient location') {
    highlights.push(`Conveniently Located in ${location}`);
  }

  if (data.capacity) {
    highlights.push(`${data.capacity}-Resident Capacity for Personalized Attention`);
  }

  if (data.amenities.length > 0) {
    const a = data.amenities[0]!;
    highlights.push(a.charAt(0).toUpperCase() + a.slice(1));
  }

  if (data.priceMin && data.priceMax) {
    highlights.push(`Transparent Pricing: $${data.priceMin.toLocaleString()}-$${data.priceMax.toLocaleString()}/month`);
  }

  const generic = [
    'Experienced and Compassionate Staff',
    'Safe and Comfortable Environment',
    'Family-Oriented Community',
    'Daily Activities and Social Programs',
  ];

  for (const h of generic) {
    if (highlights.length >= 5) break;
    if (!highlights.includes(h)) highlights.push(h);
  }

  return { description: description.trim(), highlights: highlights.slice(0, 5) };
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

  return { valid: errors.length === 0, errors };
}
