/**
 * What the public listing page (/homes/[id]) may say about capacity,
 * availability, staffing and amenities (OL-173). Pure — no Prisma here.
 *
 * RULE: a number or claim is shown only when someone accountable set it.
 *   - Availability: only the freshness view (OL-110). A count is shown only
 *     while a verified write (operator edit, QA'd call, ping/SMS/email reply,
 *     concierge confirm) is within AVAILABILITY_FRESH_DAYS. The old static
 *     `capacity - currentOccupancy` math is never shown — it is a seed default
 *     (dev/directory imports default capacity to 100, occupancy to 0) or, at
 *     best, a stale number. Unknown → "Availability: contact to confirm".
 *     Never "Waitlist" / "Currently on waitlist" / "0 available".
 *   - Capacity ("N beds"): only when the EntityEvent history has a capacity
 *     write from OPERATOR / ADMIN / VA_CALL. There is no per-field source
 *     column on AssistedLivingHome, so the append-only event log (sprint W5-1)
 *     is the provenance: operator/admin edits record `field.changed` /
 *     `field.confirmed` rows; directory seeds and dev seeds record none.
 *   - Amenities: verified by the same event-log rule. Otherwise they are shown
 *     under "Reported by the home — confirm on your tour" (they came from the
 *     home's own website, a seed or a phone note — never from CareLinkAI).
 *   - Staffing ("24/7 on-site"): there is no staffing field anywhere in the
 *     schema, so no source can back it. Never shown.
 */

/** Event sources that count as "an accountable person set this value". */
export const VERIFIED_FIELD_SOURCES = ['OPERATOR', 'ADMIN', 'VA_CALL'] as const;
/** Home fields whose provenance is read from the event log. */
export const PROVENANCE_FIELDS = ['capacity', 'amenities'] as const;
export type ProvenanceField = (typeof PROVENANCE_FIELDS)[number];

export const AVAILABILITY_UNKNOWN_TEXT = 'Availability: contact to confirm';
export const AMENITIES_UNVERIFIED_LABEL = 'Reported by the home — confirm on your tour';

/** Collapse event rows ({field, source}) to the set of fields an accountable source wrote. */
export function verifiedFieldsFromEvents(
  events: ReadonlyArray<{ field: string | null; source: string | null }>,
): ProvenanceField[] {
  const ok = new Set<string>(VERIFIED_FIELD_SOURCES);
  const out = new Set<ProvenanceField>();
  for (const e of events) {
    if (!e.field || !e.source || !ok.has(e.source)) continue;
    if ((PROVENANCE_FIELDS as readonly string[]).includes(e.field)) out.add(e.field as ProvenanceField);
  }
  return PROVENANCE_FIELDS.filter((f) => out.has(f));
}

export type ListingFactsInput = {
  capacity?: number | null;
  amenities?: readonly string[] | null;
  /** Fields with an OPERATOR / ADMIN / VA_CALL write in the event log. */
  verifiedFields?: readonly string[] | null;
  /** The OL-110 freshness view (`availabilityView`), as served by /api/homes/:id. */
  availabilityFreshness?: {
    fresh?: boolean;
    count?: number | null;
    label?: string | null;
  } | null;
};

export type ListingFacts = {
  /** Beds/residents, or null → hide the capacity tile and "N beds". */
  capacity: number | null;
  availability: {
    known: boolean;
    /** Short tile text: "3 open" / "No openings reported" / "Confirmed" / "Contact to confirm". */
    headline: string;
    /** Freshness line, e.g. "Availability verified today · 3 openings"; null when unknown. */
    detail: string | null;
    /** One line used by Quick Facts + sidebar: always starts "Availability: …". */
    line: string;
  };
  /** Always null: no data source exists for a staffing claim. */
  staffing: null;
  amenities: {
    items: string[];
    verified: boolean;
    /** Qualifier to show next to unverified items; null when verified or empty. */
    label: string | null;
  };
};

function openings(n: number): string {
  return `${n} opening${n === 1 ? '' : 's'}`;
}

export function listingFacts(input: ListingFactsInput): ListingFacts {
  const verified = new Set(input.verifiedFields ?? []);

  const cap = input.capacity;
  const capacity = verified.has('capacity') && typeof cap === 'number' && Number.isFinite(cap) && cap > 0 ? cap : null;

  const f = input.availabilityFreshness;
  let availability: ListingFacts['availability'];
  if (f?.fresh) {
    const count = typeof f.count === 'number' && f.count >= 0 ? f.count : null;
    const headline = count == null ? 'Confirmed' : count > 0 ? `${count} open` : 'No openings reported';
    const line =
      count == null
        ? 'Availability: confirmed recently — contact for current openings'
        : count > 0
        ? `Availability: ${openings(count)} reported`
        : 'Availability: no openings reported right now';
    availability = { known: true, headline, detail: f.label || null, line };
  } else {
    availability = { known: false, headline: 'Contact to confirm', detail: null, line: AVAILABILITY_UNKNOWN_TEXT };
  }

  const items = Array.isArray(input.amenities) ? input.amenities.filter((a) => typeof a === 'string' && a.trim()) : [];
  const amenitiesVerified = items.length > 0 && verified.has('amenities');

  return {
    capacity,
    availability,
    staffing: null,
    amenities: {
      items,
      verified: amenitiesVerified,
      label: items.length > 0 && !amenitiesVerified ? AMENITIES_UNVERIFIED_LABEL : null,
    },
  };
}
