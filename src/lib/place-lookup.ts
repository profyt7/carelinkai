/**
 * src/lib/place-lookup.ts
 *
 * Discovers a business's official website URL from its name + location using
 * the Google Places API (New) Text Search endpoint. One call returns the
 * business's `websiteUri` directly (no separate Details call), keeping us well
 * within the Google Maps monthly free credit for hundreds of lookups.
 *
 * Server-side only. No-ops gracefully when GOOGLE_PLACES_API_KEY is unset so
 * imports never break before the key is provisioned.
 */

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const REQUEST_TIMEOUT_MS = 10_000;

// Directory/aggregator domains that are never an operator's own site — if Places
// hands one of these back, we treat it as "no reliable website found".
const AGGREGATOR_HOSTS = [
  'aplaceformom.com', 'caring.com', 'senioradvisor.com', 'seniorliving.org',
  'seniorhomes.com', 'yelp.com', 'facebook.com', 'yellowpages.com',
  'google.com', 'mapquest.com', 'apforms.com', 'carepathways.com',
  'assistedliving.com', 'seniorhousingnet.com', 'medicare.gov',
];

export type LookupConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PlaceLookupInput {
  name: string;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  zip?: string | null;
}

export interface PlaceLookupResult {
  url: string;
  placeId: string | null;
  confidence: LookupConfidence;
  matchedName: string | null;
  matchedAddress: string | null;
}

export function isPlaceLookupConfigured(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

/** Lowercase, strip punctuation and common suffix noise for fuzzy comparison. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')        // drop apostrophes so O'Neill → oneill
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(llc|inc|the|at|of|senior|living|assisted|care|community|center|centre|health|healthcare|home|homes|village|villa)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token-overlap ratio between two names (0..1), relative to the query name. */
export function nameMatchScore(query: string, candidate: string): number {
  const q = new Set(normalizeForMatch(query).split(' ').filter(Boolean));
  const c = new Set(normalizeForMatch(candidate).split(' ').filter(Boolean));
  if (q.size === 0) return 0;
  let hits = 0;
  for (const t of q) if (c.has(t)) hits += 1;
  return hits / q.size;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isAggregatorUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return true;
  return AGGREGATOR_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

interface PlacesApiPlace {
  id?: string;
  displayName?: { text?: string };
  websiteUri?: string;
  formattedAddress?: string;
}

/**
 * Score a candidate against the query: name overlap plus a city-match bonus.
 * Returns null for candidates with no website or an aggregator website.
 */
export function evaluateCandidate(
  input: PlaceLookupInput,
  place: PlacesApiPlace,
): PlaceLookupResult | null {
  const url = place.websiteUri?.trim();
  if (!url || isAggregatorUrl(url)) return null;

  const matchedName = place.displayName?.text ?? null;
  const matchedAddress = place.formattedAddress ?? null;

  const score = matchedName ? nameMatchScore(input.name, matchedName) : 0;
  const cityMatch =
    !!input.city && !!matchedAddress &&
    matchedAddress.toLowerCase().includes(input.city.toLowerCase());

  let confidence: LookupConfidence;
  if (score >= 0.6 && cityMatch) confidence = 'HIGH';
  else if (score >= 0.6 || (score >= 0.34 && cityMatch)) confidence = 'MEDIUM';
  else confidence = 'LOW';

  return { url, placeId: place.id ?? null, confidence, matchedName, matchedAddress };
}

/**
 * Find the official website for a facility. Returns the best candidate or null.
 * `null` means: not configured, no match, or only aggregator/low-quality hits.
 */
export async function findWebsiteUrl(
  input: PlaceLookupInput,
): Promise<PlaceLookupResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const locationParts = [input.street, input.city, input.state, input.zip].filter(Boolean);
  const textQuery = `${input.name} assisted living ${locationParts.join(' ')}`.trim();

  let res: Response;
  try {
    res = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery, maxResultCount: 5, regionCode: 'US' }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null; // network/timeout — caller treats as "not found"
  }

  if (!res.ok) return null;

  let data: { places?: PlacesApiPlace[] };
  try {
    data = await res.json();
  } catch {
    return null;
  }

  const places = Array.isArray(data.places) ? data.places : [];
  // Evaluate all candidates, keep the highest-confidence non-aggregator hit.
  const rank: Record<LookupConfidence, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  let best: PlaceLookupResult | null = null;
  for (const p of places) {
    const evaluated = evaluateCandidate(input, p);
    if (!evaluated) continue;
    if (!best || rank[evaluated.confidence] > rank[best.confidence]) best = evaluated;
    if (best.confidence === 'HIGH') break;
  }
  return best;
}
