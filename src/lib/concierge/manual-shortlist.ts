/**
 * Concierge shortlist, manual curation (fix/concierge-manual-shortlist). Family requests from /concierge
 * never had AI matches stored, so the admin could not add a home, save a shortlist or send the payment link.
 *  - searchPublicHomes: public homes (ACTIVE, not demo) by name, city or ZIP — top 10 — to add by hand.
 *  - suggestHomesForRequest: run the matching on demand for a request with no stored matches, built from the
 *    same pieces as the discharge-planner search (sanitizeCareLevels, buildLocationWhere, availabilityView, the
 *    same scoring prompt and match shape), and store the results in searchResults.matches like a DP search.
 *  - availability label per shortlisted home: 'verified' (our team verified current availability) or
 *    'unconfirmed' (ask the home). Defaults to unconfirmed unless the home's availability is currently verified.
 * The shortlist stays hidden from the family until the order is paid and released (unchanged).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sanitizeCareLevels, buildLocationWhere } from '@/lib/discharge-planner/criteria';
import { availabilityView } from '@/lib/availability/availability';
import { getAnthropicClient } from '@/lib/ai/claude';
import { DIRECTORY_UNCLAIMED_EMAIL } from '@/lib/claim-engine/inquiry-claim-notification';
import { recordEvent, type EventActor } from '@/lib/events/record-event';

export type AvailabilityLabel = 'verified' | 'unconfirmed';

/**
 * The family-facing line. It covers OPENINGS only: pricing keeps its own source label on the listing and
 * nothing else on the shortlist is called verified.
 */
export function openingsLine(label: AvailabilityLabel, verifiedOn?: string | Date | null): string {
  if (label !== 'verified') return 'Openings unconfirmed — ask the home';
  const d = verifiedOn ? new Date(verifiedOn) : null;
  const when = d && !Number.isNaN(d.getTime())
    ? ` on ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}`
    : '';
  return `Openings verified by our team${when}`;
}

/** When a 'verified' label was earned: the home's own fresh verification, else the moment the admin saved it. */
export function openingsVerifiedOn(home: AvailabilityFields, now: Date = new Date()): string {
  return availabilityView(home, now.getTime()).fresh && home.availabilityVerifiedAt ? new Date(home.availabilityVerifiedAt).toISOString() : now.toISOString();
}

type AvailabilityFields = { availabilityCount?: number | null; availabilityVerifiedAt?: Date | string | null; availabilitySource?: any };

/** Unconfirmed unless the home's current availability is verified (fresh). */
export function defaultAvailabilityLabel(home: AvailabilityFields, now: number = Date.now()): AvailabilityLabel {
  return availabilityView(home, now).fresh ? 'verified' : 'unconfirmed';
}

const homeSelect = {
  id: true,
  name: true,
  description: true,
  careLevel: true,
  amenities: true,
  priceMin: true,
  capacity: true,
  currentOccupancy: true,
  availabilityCount: true,
  availabilityVerifiedAt: true,
  availabilitySource: true,
  address: { select: { street: true, city: true, state: true, zipCode: true } },
  operator: { select: { user: { select: { email: true, phone: true } } } },
} satisfies Prisma.AssistedLivingHomeSelect;

type HomeRow = Prisma.AssistedLivingHomeGetPayload<{ select: typeof homeSelect }>;

const addressLine = (a: HomeRow['address']) => (a ? `${a.street}, ${a.city}, ${a.state} ${a.zipCode}` : '');

/** Public listings only: what a family could find on the site. */
const PUBLIC_HOME: Prisma.AssistedLivingHomeWhereInput = { status: 'ACTIVE', isDemo: false };

export type HomeSearchHit = { homeId: string; homeName: string; address: string; availability: string; defaultAvailabilityLabel: AvailabilityLabel };

export async function searchPublicHomes(q: string, limit = 10): Promise<HomeSearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const insensitive = 'insensitive' as const;
  const or: Prisma.AssistedLivingHomeWhereInput[] = [
    { name: { contains: term, mode: insensitive } },
    { address: { city: { contains: term, mode: insensitive } } },
  ];
  if (/^\d{3,5}$/.test(term)) or.push({ address: { zipCode: { startsWith: term } } });
  const homes = await prisma.assistedLivingHome.findMany({
    where: { ...PUBLIC_HOME, OR: or },
    select: homeSelect,
    orderBy: { name: 'asc' },
    take: limit,
  });
  return homes.map((h) => ({
    homeId: h.id,
    homeName: h.name,
    address: addressLine(h.address),
    availability: availabilityView(h).label,
    defaultAvailabilityLabel: defaultAvailabilityLabel(h),
  }));
}

/** The match shape the curate panel and the DP search already use. */
function toMatch(h: HomeRow, score: number, reasoning: string) {
  const isUnclaimed = (h.operator?.user?.email ?? '').toLowerCase() === DIRECTORY_UNCLAIMED_EMAIL;
  const priceMin = h.priceMin != null ? parseFloat(h.priceMin.toString()) : 0;
  return {
    homeId: h.id,
    homeName: h.name,
    address: addressLine(h.address) || 'Address not available',
    score,
    reasoning,
    careTypes: h.careLevel,
    availableBeds: null as number | null, // OL-200: never capacity math as availability
    availability: availabilityView(h),
    startingPrice: priceMin > 0 ? priceMin : null,
    amenities: h.amenities,
    contactEmail: isUnclaimed ? undefined : h.operator?.user?.email ?? undefined,
    contactPhone: isUnclaimed ? undefined : h.operator?.user?.phone ?? undefined,
    isUnclaimed,
  };
}

type RequestFacts = { queryText: string; careLevel: string | null; intakeZip: string | null; location: string | null };

/** Where-clause for "near {ZIP/city}": same 3-digit ZIP area, else the city / state. */
function areaWhere(f: RequestFacts): Prisma.AddressWhereInput | undefined {
  const zip = f.intakeZip?.match(/\d{5}/)?.[0] ?? f.location?.match(/\b\d{5}\b/)?.[0];
  if (zip) return { zipCode: { startsWith: zip.slice(0, 3) } };
  return buildLocationWhere(f.location ?? undefined);
}

export function nearLabel(f: { intakeZip: string | null; location: string | null }): string {
  return f.intakeZip?.match(/\d{5}/)?.[0] ?? (f.location?.trim() || 'the request area');
}

async function candidateHomes(f: RequestFacts): Promise<HomeRow[]> {
  const careLevels = sanitizeCareLevels(f.careLevel ? [f.careLevel] : []);
  const address = areaWhere(f);
  const base: Prisma.AssistedLivingHomeWhereInput = { ...PUBLIC_HOME, ...(address ? { address } : {}) };
  // Care level first; widen to the area alone if that finds nothing.
  if (careLevels.length > 0) {
    const strict = await prisma.assistedLivingHome.findMany({ where: { ...base, careLevel: { hasSome: careLevels } }, select: homeSelect, take: 20 });
    if (strict.length > 0) return strict;
  }
  return prisma.assistedLivingHome.findMany({ where: base, select: homeSelect, take: 20 });
}

/** Same scoring prompt as the DP search; falls back to verified-availability-first when AI is unavailable. */
async function score(f: RequestFacts, homes: HomeRow[]): Promise<{ homeId: string; score: number; reasoning: string }[]> {
  const fallback = () =>
    [...homes]
      .sort((a, b) => Number(availabilityView(b).fresh) - Number(availabilityView(a).fresh) || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((h) => ({ homeId: h.id, score: 70, reasoning: 'Match based on area and care level' }));
  if (!process.env['ANTHROPIC_API_KEY']) return fallback();
  try {
    const homesData = homes.map((h) => ({
      id: h.id, name: h.name, description: h.description, careLevel: h.careLevel, amenities: h.amenities, capacity: h.capacity,
      availability: availabilityView(h).label, location: `${h.address?.city ?? ''}, ${h.address?.state ?? ''}`,
    }));
    const prompt = `You are a senior care placement expert. Score and rank these homes for the following request:

REQUEST: "${f.queryText}"

AVAILABLE HOMES:
${JSON.stringify(homesData, null, 2)}

Return the top 5 best matches as raw JSON only (no markdown, no code blocks):
{
  "matches": [
    {
      "homeId": "home_id",
      "score": 95,
      "reasoning": "This home excels in...",
      "confidence": "HIGH"
    }
  ]
}

Consider: timeline urgency/bed availability, care level match, payment type, location, amenities, overall fit.`;
    const res = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a senior care placement expert. Score homes accurately based on criteria match. Return raw JSON only with no markdown or code blocks.',
      messages: [{ role: 'user', content: prompt }],
    });
    const block = res.content[0];
    const raw = block?.type === 'text' ? block.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim() : '{}';
    const parsed = JSON.parse(raw) as { matches?: { homeId: string; score?: number; reasoning?: string }[] };
    const ids = new Set(homes.map((h) => h.id));
    const out = (parsed.matches ?? []).filter((m) => ids.has(m.homeId)).map((m) => ({ homeId: m.homeId, score: m.score ?? 0, reasoning: m.reasoning ?? 'Good match' }));
    return out.length > 0 ? out : fallback();
  } catch {
    return fallback();
  }
}

export type SuggestResult = { ok: true; count: number; near: string } | { ok: false; reason: 'not_found' | 'has_matches' };

/** Run matching on demand for a request with no stored matches, and store the candidates like a DP search does. */
export async function suggestHomesForRequest(searchId: string, actor: EventActor): Promise<SuggestResult> {
  const req = await prisma.placementSearch.findUnique({
    where: { id: searchId },
    select: { id: true, isConcierge: true, queryText: true, careLevel: true, intakeZip: true, patientInfo: true, searchResults: true },
  });
  if (!req || !req.isConcierge) return { ok: false, reason: 'not_found' };
  const stored = (req.searchResults as { matches?: unknown[] } | null)?.matches ?? [];
  if (Array.isArray(stored) && stored.length > 0) return { ok: false, reason: 'has_matches' };

  const info = (req.patientInfo ?? {}) as { location?: string };
  const facts: RequestFacts = { queryText: req.queryText, careLevel: req.careLevel, intakeZip: req.intakeZip, location: info.location ?? null };
  const homes = await candidateHomes(facts);
  const byId = new Map(homes.map((h) => [h.id, h]));
  const scored = homes.length > 0 ? await score(facts, homes) : [];
  const matches = scored.map((s) => toMatch(byId.get(s.homeId)!, s.score, s.reasoning));
  const near = nearLabel(facts);

  await prisma.$transaction(async (tx) => {
    await tx.placementSearch.update({
      where: { id: searchId },
      data: { searchResults: { ...((req.searchResults as object | null) ?? {}), matches, suggestedNear: near, suggestedAt: new Date().toISOString() } as Prisma.InputJsonValue },
    });
    await recordEvent(tx, {
      entityType: 'PLACEMENT_SEARCH', entityId: searchId, eventType: 'matches.suggested', field: 'searchResults',
      oldValue: null, newValue: { count: matches.length, source: 'admin_suggest' },
      source: 'ADMIN', actor,
    });
  });
  return { ok: true, count: matches.length, near };
}
