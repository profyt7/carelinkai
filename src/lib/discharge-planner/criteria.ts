/**
 * Pure helpers for translating AI-parsed placement criteria into a safe
 * Prisma query shape. Kept side-effect free so they can be unit tested
 * without a database or the Anthropic client.
 */

import { CareLevel, Prisma } from "@prisma/client";

/** The actual enum values stored on AssistedLivingHome.careLevel. */
const VALID_CARE_LEVELS = new Set<string>(Object.values(CareLevel));

/**
 * Maps the loose, human-ish strings the AI parser tends to return onto the
 * real CareLevel enum members. The parser historically emitted
 * "ASSISTED_LIVING" (not a valid enum value), which caused Prisma to throw
 * `PrismaClientValidationError: Expected CareLevel` on `hasSome`.
 */
const CARE_LEVEL_SYNONYMS: Record<string, CareLevel> = {
  ASSISTED_LIVING: CareLevel.ASSISTED,
  ASSISTED: CareLevel.ASSISTED,
  INDEPENDENT_LIVING: CareLevel.INDEPENDENT,
  INDEPENDENT: CareLevel.INDEPENDENT,
  MEMORY: CareLevel.MEMORY_CARE,
  MEMORY_CARE: CareLevel.MEMORY_CARE,
  ALZHEIMERS: CareLevel.MEMORY_CARE,
  DEMENTIA: CareLevel.MEMORY_CARE,
  SKILLED: CareLevel.SKILLED_NURSING,
  SKILLED_NURSING: CareLevel.SKILLED_NURSING,
  NURSING: CareLevel.SKILLED_NURSING,
  SNF: CareLevel.SKILLED_NURSING,
};

/**
 * Normalizes a list of AI-supplied care-level strings into valid CareLevel
 * enum values. Unknown values are dropped (never forwarded to Prisma), and
 * duplicates are removed. Returns an empty array when nothing maps.
 */
export function sanitizeCareLevels(input?: string[] | null): CareLevel[] {
  if (!Array.isArray(input)) return [];

  const out = new Set<CareLevel>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const key = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (VALID_CARE_LEVELS.has(key)) {
      out.add(key as CareLevel);
      continue;
    }
    const mapped = CARE_LEVEL_SYNONYMS[key];
    if (mapped) out.add(mapped);
  }
  return Array.from(out);
}

/** Two-letter abbreviations are how states are stored on Address.state. */
const STATE_NAME_TO_ABBR: Record<string, string> = {
  ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR",
  CALIFORNIA: "CA", COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE",
  FLORIDA: "FL", GEORGIA: "GA", HAWAII: "HI", IDAHO: "ID", ILLINOIS: "IL",
  INDIANA: "IN", IOWA: "IA", KANSAS: "KS", KENTUCKY: "KY", LOUISIANA: "LA",
  MAINE: "ME", MARYLAND: "MD", MASSACHUSETTS: "MA", MICHIGAN: "MI",
  MINNESOTA: "MN", MISSISSIPPI: "MS", MISSOURI: "MO", MONTANA: "MT",
  NEBRASKA: "NE", NEVADA: "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND", OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR",
  PENNSYLVANIA: "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT",
  VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV",
  WISCONSIN: "WI", WYOMING: "WY", "DISTRICT OF COLUMBIA": "DC",
};

export interface ParsedLocation {
  city?: string;
  state?: string;
}

/**
 * Splits a free-form location string ("San Francisco, CA", "Boston, MA",
 * "Cleveland") into city/state parts. A full state name is normalized to its
 * two-letter abbreviation so it matches the stored Address.state value.
 *
 * Previously the whole string was matched against BOTH city and state, so a
 * query like `state.contains("San Francisco, CA")` could never match.
 */
export function parseLocation(location?: string | null): ParsedLocation {
  if (!location || typeof location !== "string") return {};
  const trimmed = location.trim();
  if (!trimmed) return {};

  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const city = parts[0];
    const stateToken = parts[parts.length - 1];
    return { city, state: normalizeState(stateToken) };
  }

  // Single token — could be a city OR a state.
  const single = parts[0] ?? trimmed;
  return { city: single };
}

function normalizeState(token: string): string {
  const upper = token.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return STATE_NAME_TO_ABBR[upper] ?? token.trim();
}

/**
 * Builds the `address` portion of a Prisma where-clause for the parsed
 * location, or `undefined` if there is nothing usable. When both city and
 * state are present they must both match (more precise); a single token is
 * matched against either field.
 */
export function buildLocationWhere(
  location?: string | null
): Prisma.AddressWhereInput | undefined {
  const { city, state } = parseLocation(location);
  const insensitive = Prisma.QueryMode.insensitive;

  if (city && state) {
    return {
      AND: [
        { city: { contains: city, mode: insensitive } },
        { state: { contains: state, mode: insensitive } },
      ],
    };
  }
  if (city) {
    return {
      OR: [
        { city: { contains: city, mode: insensitive } },
        { state: { contains: city, mode: insensitive } },
      ],
    };
  }
  return undefined;
}
