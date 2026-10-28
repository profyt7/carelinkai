/**
 * AI-Powered Home Profile Generator
 *
 * Generates professional descriptions and highlights for assisted living homes
 * to help operators create compelling, accurate profiles.
 */

import { getAnthropicClient } from '@/lib/ai/claude';
import type { ImageCandidate } from '@/lib/operator-profile-scraper';

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

// ── Website extraction (Task 3) ───────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are extracting publicly-available marketing content from an assisted
living facility's own website to pre-populate their directory listing on
CareLinkAI.

ABSOLUTE RULES — VIOLATE NONE OF THESE:

1. NEVER extract names of residents, patients, families, or any
   individuals other than the facility's leadership/management team.
   If a testimonial includes a resident name, IGNORE that testimonial
   entirely. Do not summarize testimonials with names removed.
2. NEVER extract pricing or rates of any kind. Pricing is typically
   stale on websites and gated behind tours. Set priceMin/priceMax to
   null.
3. NEVER extract photos. Photo handling will be added in a separate
   consent-gated flow.
4. NEVER extract content that appears to be outdated (e.g., "Now
   accepting residents for 2024!"). Note in extractionNotes if you see
   this.
5. Only extract content suitable for a public marketing listing. If
   content seems controversial, dated, or unflattering, omit it.
6. If you cannot confidently extract a field, set it to null and note
   in extractionNotes. Do not fabricate.

When you see content like "Joe Smith says we changed his mother's life",
ignore it. When you see content like "Our memory care neighborhood
features 24-hour nursing", extract that as a service/amenity.`;

const VALID_CARE_LEVELS = ['ASSISTED', 'MEMORY_CARE', 'INDEPENDENT', 'SKILLED_NURSING'] as const;

export interface ExtractedProfile {
  description: string;
  shortDescription: string;
  services: string[];
  amenities: string[];
  careLevel: string[];
  address: {
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  phone: string | null;
  contactEmail: string | null;
  tagline: string | null;
  extractionConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  extractionNotes: string | null;
  tokensIn: number;
  tokensOut: number;
}

export async function extractProfileFromWebsite(
  homeData: HomeData,
  preparedHtml: string,
  websiteUrl: string,
): Promise<ExtractedProfile> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required for website extraction');
  }

  const client = getAnthropicClient();

  const userPrompt = `Extract a directory profile for "${homeData.name}" from the HTML below.

Known seed data (from Ohio DOH records — do NOT contradict unless the site clearly shows otherwise):
- City: ${homeData.address?.city ?? 'unknown'}
- State: ${homeData.address?.state ?? 'OH'}
- Capacity: ${homeData.capacity} beds
- Website URL: ${websiteUrl}

HTML content:
---
${preparedHtml}
---

Call the extract_profile tool with all fields you can confidently extract.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: EXTRACTION_SYSTEM_PROMPT,
    tools: [
      {
        name: 'extract_profile',
        description: 'Submit the extracted facility profile data',
        input_schema: {
          type: 'object' as const,
          properties: {
            description: {
              type: 'string',
              description: '2-4 paragraph marketing description of the facility',
            },
            shortDescription: {
              type: 'string',
              description: '1-2 sentence summary for cards and previews',
            },
            services: {
              type: 'array',
              items: { type: 'string' },
              description: 'Services the facility offers',
            },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Physical amenities and features',
            },
            careLevel: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['ASSISTED', 'MEMORY_CARE', 'INDEPENDENT', 'SKILLED_NURSING'],
              },
              description: 'Care levels offered',
            },
            address: {
              type: 'object',
              properties: {
                streetAddress: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zip: { type: 'string' },
              },
            },
            phone: { type: 'string', description: 'Main facility phone number' },
            contactEmail: { type: 'string', description: 'Contact email address' },
            tagline: { type: 'string', description: 'Facility tagline or motto' },
            extractionConfidence: {
              type: 'string',
              enum: ['HIGH', 'MEDIUM', 'LOW'],
              description: 'Overall confidence in the extraction quality',
            },
            extractionNotes: {
              type: 'string',
              description: "Notes on what couldn't be extracted or caveats",
            },
          },
          required: ['description', 'shortDescription', 'extractionConfidence'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_profile' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;

  // Tool use response
  const toolBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call extract_profile tool');
  }

  const raw = toolBlock.input as Record<string, unknown>;

  // Sanitise careLevel — only accept known enum values
  const rawCareLevel = Array.isArray(raw.careLevel) ? (raw.careLevel as string[]) : [];
  const careLevel = rawCareLevel.filter(v => (VALID_CARE_LEVELS as readonly string[]).includes(v));

  return {
    description: String(raw.description ?? ''),
    shortDescription: String(raw.shortDescription ?? ''),
    services: Array.isArray(raw.services) ? (raw.services as string[]) : [],
    amenities: Array.isArray(raw.amenities) ? (raw.amenities as string[]) : [],
    careLevel,
    address: raw.address && typeof raw.address === 'object'
      ? {
          streetAddress: (raw.address as any).streetAddress ?? null,
          city: (raw.address as any).city ?? null,
          state: (raw.address as any).state ?? null,
          zip: (raw.address as any).zip ?? null,
        }
      : null,
    phone: raw.phone ? String(raw.phone) : null,
    contactEmail: raw.contactEmail ? String(raw.contactEmail) : null,
    tagline: raw.tagline ? String(raw.tagline) : null,
    extractionConfidence: (['HIGH', 'MEDIUM', 'LOW'].includes(String(raw.extractionConfidence))
      ? raw.extractionConfidence
      : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
    extractionNotes: raw.extractionNotes ? String(raw.extractionNotes) : null,
    tokensIn,
    tokensOut,
  };
}

// ── Image classification (Task 2) ──────────────────────────────────────────────

export type ImageClassification = 'FACILITY_PHOTO' | 'PROBABLY_NOT' | 'SENSITIVE';

export interface ClassifiedImage extends ImageCandidate {
  classification: ImageClassification;
  visualQuality: number; // 1-10, classifier's best guess from URL/alt/context
  reason: string | null;
}

export interface ImageClassificationResult {
  /** Kept facility photos, best-first, capped at maxKeep. */
  kept: ClassifiedImage[];
  /** All candidates with their classification (for logging / spot-checks). */
  all: ClassifiedImage[];
  tokensIn: number;
  tokensOut: number;
}

const MAX_KEPT_IMAGES = 8;

const IMAGE_CLASSIFY_SYSTEM_PROMPT = `You are screening images found on an assisted living facility's own marketing
website so they can pre-populate the facility's directory listing. You are given,
for each image, only its URL, alt text, and a context hint (CSS classes) — NOT
the pixels. Infer from these signals.

Classify EACH image into exactly one of:

- FACILITY_PHOTO: a photo of the building exterior, interior rooms, dining
  areas, lounges/common areas, gardens/grounds, activities, or residents
  enjoying the community. These are what we want to keep.
- PROBABLY_NOT: logos, wordmarks, icons, award/accreditation badges, stock
  photography, staff headshots/portraits, maps, brochures, decorative
  graphics, or anything that isn't a genuine photo of this facility.
- SENSITIVE: anything that looks clinically or medically sensitive — medical
  equipment in use, bedside/hospital-bed scenes, wound/medical-treatment
  imagery, or anything that could embarrass or expose an identifiable
  resident in a care/medical context. Exclude these even though the operator
  published them.

ALWAYS err toward caution: if an image MIGHT show identifiable medical
context, classify it SENSITIVE, not FACILITY_PHOTO. If you cannot tell whether
something is a real facility photo, prefer PROBABLY_NOT over FACILITY_PHOTO.

Also give each image a visualQuality score 1-10 estimating how appealing it is
likely to be as a listing hero/gallery image (higher = better), based on the
signals available.`;

/**
 * Classify candidate images (text-signals only — no vision) and return the best
 * facility photos to keep. Cheap: ~$0.02-0.05 per facility.
 */
export async function classifyFacilityImages(
  homeName: string,
  candidates: ImageCandidate[],
  maxKeep: number = MAX_KEPT_IMAGES,
): Promise<ImageClassificationResult> {
  if (candidates.length === 0) {
    return { kept: [], all: [], tokensIn: 0, tokensOut: 0 };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required for image classification');
  }

  const client = getAnthropicClient();

  const list = candidates
    .map((c, i) => `${i}. url: ${c.url}\n   alt: ${c.altText ?? '(none)'}\n   context: ${c.contextHint ?? '(none)'}`)
    .join('\n');

  const userPrompt = `Facility: "${homeName}"

Classify each of the following ${candidates.length} candidate images.

${list}

Call the classify_images tool with one entry per image (by index).`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: IMAGE_CLASSIFY_SYSTEM_PROMPT,
    tools: [
      {
        name: 'classify_images',
        description: 'Submit a classification for every candidate image, by index.',
        input_schema: {
          type: 'object' as const,
          properties: {
            classifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'integer', description: 'The image index from the list' },
                  label: {
                    type: 'string',
                    enum: ['FACILITY_PHOTO', 'PROBABLY_NOT', 'SENSITIVE'],
                  },
                  visualQuality: {
                    type: 'integer',
                    description: 'Estimated appeal as a listing image, 1-10',
                  },
                  reason: { type: 'string', description: 'Brief justification' },
                },
                required: ['index', 'label'],
              },
            },
          },
          required: ['classifications'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'classify_images' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call classify_images tool');
  }

  const raw = toolBlock.input as { classifications?: unknown };
  const rows = Array.isArray(raw.classifications) ? raw.classifications : [];

  // Map classifications back onto candidates by index. Any candidate the model
  // failed to classify defaults to PROBABLY_NOT (safe exclusion).
  const byIndex = new Map<number, { label: string; visualQuality?: number; reason?: string }>();
  for (const r of rows as Array<Record<string, unknown>>) {
    const idx = typeof r.index === 'number' ? r.index : Number(r.index);
    if (!Number.isInteger(idx)) continue;
    byIndex.set(idx, {
      label: String(r.label ?? 'PROBABLY_NOT'),
      visualQuality: typeof r.visualQuality === 'number' ? r.visualQuality : undefined,
      reason: r.reason ? String(r.reason) : undefined,
    });
  }

  const VALID: ImageClassification[] = ['FACILITY_PHOTO', 'PROBABLY_NOT', 'SENSITIVE'];
  const all: ClassifiedImage[] = candidates.map((c, i) => {
    const row = byIndex.get(i);
    const classification = (row && (VALID as string[]).includes(row.label)
      ? row.label
      : 'PROBABLY_NOT') as ImageClassification;
    return {
      ...c,
      classification,
      visualQuality: row?.visualQuality ?? 5,
      reason: row?.reason ?? null,
    };
  });

  const kept = all
    .filter((c) => c.classification === 'FACILITY_PHOTO')
    .sort((a, b) => b.visualQuality - a.visualQuality)
    .slice(0, maxKeep);

  return { kept, all, tokensIn, tokensOut };
}

// ── Validation ────────────────────────────────────────────────────────────────

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
