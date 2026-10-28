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
 *   - Amenities (OL-176): verified by the same event-log rule → "Amenities &
 *     Services" with checkmarks. Otherwise (directory import, enrichment script,
 *     seed) they render under the heading "Reported features — confirm on your
 *     tour" with plain bullets — never checkmarks. Amenities are one String[]
 *     column with no per-item source, so the whole list is one or the other.
 *   - Description + tagline, resident gender (OL-176): same rule. An unverified
 *     description carries a "from public sources" note and the tagline is
 *     hidden; an unverified gender restriction is not shown at all (the column
 *     is empty on seeded homes, and the API used to turn empty into "All
 *     genders welcome").
 *   - Staffing ("24/7 on-site"): there is no staffing field anywhere in the
 *     schema, so no source can back it. Never shown.
 */

/** Event sources that count as "an accountable person set this value". */
export const VERIFIED_FIELD_SOURCES = ['OPERATOR', 'ADMIN', 'VA_CALL'] as const;
/** Home fields whose provenance is read from the event log. */
export const PROVENANCE_FIELDS = ['capacity', 'amenities', 'description', 'genderRestriction'] as const;
export type ProvenanceField = (typeof PROVENANCE_FIELDS)[number];

export const AVAILABILITY_UNKNOWN_TEXT = 'Availability: contact to confirm';
export const AMENITIES_VERIFIED_HEADING = 'Amenities & Services';
export const AMENITIES_UNVERIFIED_LABEL = 'Reported features — confirm on your tour';
export const DESCRIPTION_UNVERIFIED_NOTE =
  'Written from public sources (the community’s website and listings), not confirmed by the community. Confirm details on your tour.';

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
  description?: string | null;
  tagline?: string | null;
  /** Raw genderRestriction (null when never set). */
  gender?: string | null;
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
    /** Section heading: "Amenities & Services" when verified, else the "Reported features" label. */
    heading: string;
    /** Same as heading when unverified, null when verified or empty (kept for callers). */
    label: string | null;
  };
  description: {
    text: string | null;
    verified: boolean;
    /** Source note under an unverified description; null when verified or empty. */
    note: string | null;
    /** Tagline only when the description is verified. */
    tagline: string | null;
  };
  /** "All genders welcome" / "Women residents only" — only when an accountable source set it. */
  gender: string | null;
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

  const text = typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null;
  const descriptionVerified = !!text && verified.has('description');
  const tagline = typeof input.tagline === 'string' && input.tagline.trim() ? input.tagline.trim() : null;

  const g = typeof input.gender === 'string' ? input.gender.trim().toUpperCase() : '';
  const gender = g && verified.has('genderRestriction')
    ? g === 'ALL' ? 'All genders welcome' : `${g.charAt(0)}${g.slice(1).toLowerCase()} residents only`
    : null;

  return {
    capacity,
    availability,
    staffing: null,
    amenities: {
      items,
      verified: amenitiesVerified,
      heading: amenitiesVerified ? AMENITIES_VERIFIED_HEADING : AMENITIES_UNVERIFIED_LABEL,
      label: items.length > 0 && !amenitiesVerified ? AMENITIES_UNVERIFIED_LABEL : null,
    },
    description: {
      text,
      verified: descriptionVerified,
      note: text && !descriptionVerified ? DESCRIPTION_UNVERIFIED_NOTE : null,
      tagline: descriptionVerified ? tagline : null,
    },
    gender,
  };
}
