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
const WEB_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';
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

export type LookupSource = 'places' | 'web_search';

export interface PlaceLookupResult {
  url: string;
  placeId: string | null;
  confidence: LookupConfidence;
  matchedName: string | null;
  matchedAddress: string | null;
  source: LookupSource;
}

/** Places discovery is available. */
export function isPlaceLookupConfigured(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

/** Web-search fallback is available (needs an API key + a search engine id). */
export function isWebSearchConfigured(): boolean {
  return !!(process.env.GOOGLE_SEARCH_ENGINE_ID &&
    (process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_PLACES_API_KEY));
}

/** Either discovery tier is available. */
export function isAnyLookupConfigured(): boolean {
  return isPlaceLookupConfigured() || isWebSearchConfigured();
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

  return { url, placeId: place.id ?? null, confidence, matchedName, matchedAddress, source: 'places' };
}

const RANK: Record<LookupConfidence, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/** Strip the TLD from a hostname so the domain can be name-matched. */
function domainStem(host: string): string {
  return host.replace(/\.(com|org|net|info|biz|us|co|health|care|living|life)$/i, '');
}

/**
 * Domains have no spaces (canterburycommons.com), so token-overlap fails.
 * Instead, count how many facility-name tokens appear as substrings of the
 * condensed domain. Returns 0..1 relative to the name.
 */
export function domainMatchScore(name: string, host: string): number {
  const condensed = domainStem(host).toLowerCase().replace(/[^a-z0-9]/g, '');
  const tokens = normalizeForMatch(name).split(' ').filter(Boolean);
  if (!condensed || tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) if (t.length >= 3 && condensed.includes(t)) hits += 1;
  return hits / tokens.length;
}

interface WebSearchItem {
  title?: string;
  link?: string;
  displayLink?: string;
  snippet?: string;
}

/**
 * Score a single web-search result. Web-search hits are never HIGH (they're a
 * best-guess fallback) — MEDIUM when the facility name shows up in the page
 * title or domain, otherwise LOW (callers may choose to skip LOW).
 */
export function evaluateWebResult(
  input: PlaceLookupInput,
  item: WebSearchItem,
): PlaceLookupResult | null {
  const url = item.link?.trim();
  if (!url || isAggregatorUrl(url)) return null;

  const title = item.title ?? '';
  const host = (item.displayLink || hostOf(url) || '').toLowerCase().replace(/^www\./, '');
  const titleScore = title ? nameMatchScore(input.name, title) : 0;
  const domainScore = host ? domainMatchScore(input.name, host) : 0;
  const score = Math.max(titleScore, domainScore);

  const confidence: LookupConfidence = score >= 0.5 ? 'MEDIUM' : 'LOW';
  return {
    url,
    placeId: null,
    confidence,
    matchedName: title || null,
    matchedAddress: null,
    source: 'web_search',
  };
}

/**
 * Web-search fallback via the Google Programmable Search (Custom Search JSON)
 * API. Returns the first corroborated non-aggregator organic result, or null.
 */
export async function findWebsiteViaWebSearch(
  input: PlaceLookupInput,
): Promise<PlaceLookupResult | null> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !cx) return null;

  const locationParts = [input.city, input.state].filter(Boolean);
  const q = `${input.name} assisted living ${locationParts.join(' ')}`.trim();
  const url = `${WEB_SEARCH_URL}?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&num=5&q=${encodeURIComponent(q)}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: { items?: WebSearchItem[] };
  try {
    data = await res.json();
  } catch {
    return null;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  let best: PlaceLookupResult | null = null;
  for (const item of items) {
    const evaluated = evaluateWebResult(input, item);
    if (!evaluated) continue;
    if (!best || RANK[evaluated.confidence] > RANK[best.confidence]) best = evaluated;
    if (best.confidence === 'MEDIUM') break; // best a web result can be
  }
  return best;
}

/**
 * Find the official website for a facility, Places first then a web-search
 * fallback for facilities without a Google Business Profile. Returns the best
 * candidate or null (not configured / no usable, non-aggregator match).
 */
export async function findWebsiteUrl(
  input: PlaceLookupInput,
): Promise<PlaceLookupResult | null> {
  const places = await findWebsiteViaPlaces(input);
  // A solid Places hit wins outright (verified business website).
  if (places && places.confidence !== 'LOW') return places;

  const web = await findWebsiteViaWebSearch(input);

  // Otherwise return whichever tier gave the more confident usable result.
  if (places && web) return RANK[web.confidence] > RANK[places.confidence] ? web : places;
  return web ?? places;
}

/**
 * Places-only discovery via the Places API (New) Text Search. Returns the best
 * non-aggregator candidate or null.
 */
export async function findWebsiteViaPlaces(
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
  let best: PlaceLookupResult | null = null;
  for (const p of places) {
    const evaluated = evaluateCandidate(input, p);
    if (!evaluated) continue;
    if (!best || RANK[evaluated.confidence] > RANK[best.confidence]) best = evaluated;
    if (best.confidence === 'HIGH') break;
  }
  return best;
}
