/**
 * Honest, facts-only description generator for UNCLAIMED directory listings.
 *
 * Distinct from `generateHomeProfile` (operator marketing copy, which permits
 * inventive/aspirational phrasing). This generator is HARD-CONSTRAINED: it may
 * use ONLY verified public facts about the specific community (name, city,
 * county, care level, capacity) plus GENERAL context about what the care level
 * typically provides and general local geography. It must NEVER fabricate
 * facility-specific amenities, pricing, staff, awards, features, or reviews.
 *
 * Output: 90–140 words, warm + factual + SEO (city, county, care type), ending
 * with a "reflects public licensing records … operator can claim …" line + a
 * tour/inquiry CTA. Written so it can be cleanly overwritten when an operator
 * claims the listing (tag the description field as AI_PUBLIC_DATA provenance).
 */

import { getAnthropicClient } from '@/lib/ai/claude';

export interface UnclaimedFacts {
  name: string;
  city: string | null;
  state: string | null;
  /** Derived (city→county) — may be null when unknown; then it's simply omitted. */
  county: string | null;
  /** Raw CareLevel[] enum values, e.g. ['ASSISTED','MEMORY_CARE']. */
  careLevel: string[];
  /** Licensed capacity (bed count) if known. */
  capacity: number | null;
}

export interface GeneratedUnclaimedDescription {
  description: string;
  wordCount: number;
  tokensIn: number;
  tokensOut: number;
}

/** Greater-Cleveland city → county. Best-effort; unknown cities omit county (never guess). */
const CITY_COUNTY: Record<string, string> = {
  // Cuyahoga
  'cleveland': 'Cuyahoga', 'lakewood': 'Cuyahoga', 'parma': 'Cuyahoga', 'parma heights': 'Cuyahoga',
  'westlake': 'Cuyahoga', 'rocky river': 'Cuyahoga', 'bay village': 'Cuyahoga', 'fairview park': 'Cuyahoga',
  'north olmsted': 'Cuyahoga', 'brook park': 'Cuyahoga', 'middleburg heights': 'Cuyahoga', 'strongsville': 'Cuyahoga',
  'brecksville': 'Cuyahoga', 'broadview heights': 'Cuyahoga', 'independence': 'Cuyahoga', 'solon': 'Cuyahoga',
  'beachwood': 'Cuyahoga', 'shaker heights': 'Cuyahoga', 'cleveland heights': 'Cuyahoga', 'university heights': 'Cuyahoga',
  'south euclid': 'Cuyahoga', 'lyndhurst': 'Cuyahoga', 'mayfield heights': 'Cuyahoga', 'highland heights': 'Cuyahoga',
  'gates mills': 'Cuyahoga', 'pepper pike': 'Cuyahoga', 'orange': 'Cuyahoga', 'bedford': 'Cuyahoga',
  'bedford heights': 'Cuyahoga', 'maple heights': 'Cuyahoga', 'garfield heights': 'Cuyahoga', 'north royalton': 'Cuyahoga',
  'berea': 'Cuyahoga', 'olmsted falls': 'Cuyahoga', 'euclid': 'Cuyahoga', 'richmond heights': 'Cuyahoga',
  'chagrin falls': 'Cuyahoga',
  // Summit
  'akron': 'Summit', 'cuyahoga falls': 'Summit', 'stow': 'Summit', 'hudson': 'Summit', 'twinsburg': 'Summit',
  'macedonia': 'Summit', 'tallmadge': 'Summit', 'munroe falls': 'Summit', 'fairlawn': 'Summit', 'copley': 'Summit',
  'green': 'Summit', 'barberton': 'Summit', 'northfield': 'Summit', 'sagamore hills': 'Summit',
  // Medina
  'medina': 'Medina', 'wadsworth': 'Medina', 'brunswick': 'Medina', 'hinckley': 'Medina', 'seville': 'Medina',
  // Lorain
  'lorain': 'Lorain', 'elyria': 'Lorain', 'avon': 'Lorain', 'avon lake': 'Lorain', 'north ridgeville': 'Lorain',
  'amherst': 'Lorain', 'oberlin': 'Lorain', 'sheffield lake': 'Lorain', 'sheffield village': 'Lorain',
  // Lake
  'mentor': 'Lake', 'willoughby': 'Lake', 'willoughby hills': 'Lake', 'eastlake': 'Lake', 'wickliffe': 'Lake',
  'painesville': 'Lake', 'mentor-on-the-lake': 'Lake', 'kirtland': 'Lake', 'concord': 'Lake',
  // Geauga
  'chardon': 'Geauga', 'chesterland': 'Geauga', 'burton': 'Geauga', 'middlefield': 'Geauga', 'newbury': 'Geauga',
  'bainbridge': 'Geauga',
  // Portage
  'kent': 'Portage', 'ravenna': 'Portage', 'streetsboro': 'Portage', 'aurora': 'Portage', 'brimfield': 'Portage',
};

/** Look up a Greater-Cleveland county for a city, or null when not confidently known. */
export function countyForCity(city: string | null | undefined, state: string | null | undefined): string | null {
  if (!city) return null;
  if (state && !['oh', 'ohio'].includes(state.toLowerCase())) return null;
  return CITY_COUNTY[city.trim().toLowerCase()] ?? null;
}

const CARE_LABELS: Record<string, string> = {
  ASSISTED: 'assisted living',
  MEMORY_CARE: 'memory care',
  INDEPENDENT: 'independent living',
  SKILLED_NURSING: 'skilled nursing',
};

function readableCareLevels(levels: string[]): string {
  const mapped = levels.map((l) => CARE_LABELS[l]).filter(Boolean);
  if (mapped.length === 0) return 'senior care';
  if (mapped.length === 1) return mapped[0];
  if (mapped.length === 2) return `${mapped[0]} and ${mapped[1]}`;
  return `${mapped.slice(0, -1).join(', ')}, and ${mapped[mapped.length - 1]}`;
}

const SYSTEM_PROMPT = `You write short, HONEST directory descriptions for senior-living communities in Greater Cleveland, Ohio.
You are given ONLY verified public facts about one specific community, plus your own general knowledge of care types and local geography.

ABSOLUTE RULES — violate none:
1. Use ONLY the facts provided. NEVER invent or imply facility-SPECIFIC amenities, pricing, staff, programs, awards, features, room types, dining, or reviews for THIS community. If a detail is not in the facts, do not mention it.
2. You MAY add GENERAL, clearly non-specific context: what the stated care level(s) TYPICALLY provide, and general facts about the named city/county/area (e.g., proximity to highways or hospitals). Frame these as general context, never as specific claims about this community.
3. Never state a number (capacity, price, year, ratio) you were not given.
4. Tone: warm, factual, plain. No marketing superlatives (no "luxurious", "premier", "best", "state-of-the-art"). No markdown, no headings, third person.
5. Length: 90–140 words, written as ONE flowing paragraph — no line breaks or blank lines.
6. Naturally include the city, the county (if provided), and the care type — for local SEO.
7. END with: one sentence stating the listing reflects public licensing records and that the operator can claim it to add photos, current pricing, and verified details — immediately followed by a short tour/inquiry call to action.
8. VARY your wording. Do NOT reuse a fixed stock sentence about what the care level provides — phrase the general care context differently each time so listings don't read as templated.`;

function buildUserPrompt(f: UnclaimedFacts): string {
  const careText = readableCareLevels(f.careLevel);
  const lines = [
    `Name: ${f.name}`,
    `City: ${f.city ?? 'unknown'}`,
    f.county ? `County: ${f.county} County` : `County: (unknown — do not state a county)`,
    `State: ${f.state ?? 'OH'}`,
    `Care level(s): ${careText}`,
    f.capacity && f.capacity > 0
      ? `Licensed capacity: ${f.capacity} residents (Ohio Department of Health)`
      : `Licensed capacity: (unknown — do not state a number)`,
  ];
  return `Write the description for this community using ONLY these facts plus general care-level/area context:

${lines.join('\n')}

Remember: 90–140 words; include city${f.county ? ', county' : ''}, and care type; never invent specific amenities/pricing/staff/awards; end with the public-records + claim line and a tour/inquiry CTA.`;
}

/**
 * Generate one honest, facts-only description. Throws if ANTHROPIC_API_KEY is unset
 * (callers should ensure it's present — this is a Render/server-side script tool).
 */
export async function generateUnclaimedDescription(facts: UnclaimedFacts): Promise<GeneratedUnclaimedDescription> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required to generate descriptions');
  }
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(facts) }],
  });

  const block = response.content[0];
  const description = block && block.type === 'text' ? block.text.trim() : '';
  return {
    description,
    wordCount: description ? description.split(/\s+/).length : 0,
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  };
}
