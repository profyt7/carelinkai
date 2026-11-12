/**
 * Aggregate, non-PHI availability for the discharge-planner landing page (shown even before
 * a DP sets up 2FA — no patient data is involved). Counts only verified-fresh openings
 * (OL-200: never fake availability from capacity math); stale or unverified homes are
 * "contact to confirm".
 */
import { availabilityView } from '@/lib/availability/availability';

export type SummaryHome = {
  careLevel: string[];
  availabilityCount: number | null;
  availabilityVerifiedAt: Date | string | null;
  availabilitySource: any;
};

export type CareLevelSummary = { careLevel: string; homes: number; homesWithOpenings: number; openings: number };

export type AvailabilitySummary = {
  totalHomes: number;
  verifiedHomes: number; // availability verified recently (fresh), with or without openings
  homesWithOpenings: number; // fresh and at least one opening
  openings: number; // sum of fresh opening counts
  lastVerifiedAt: string | null;
  byCareLevel: CareLevelSummary[];
};

const CARE_LEVEL_ORDER = ['INDEPENDENT', 'ASSISTED', 'MEMORY_CARE', 'SKILLED_NURSING'];

export function summarizeAvailability(homes: SummaryHome[], now: number = Date.now()): AvailabilitySummary {
  let verifiedHomes = 0;
  let homesWithOpenings = 0;
  let openings = 0;
  let lastVerified = 0;
  const levels = new Map<string, CareLevelSummary>();
  for (const h of homes) {
    const v = availabilityView(h, now);
    const open = v.fresh && (v.count ?? 0) > 0 ? (v.count as number) : 0;
    if (v.fresh) verifiedHomes += 1;
    if (open > 0) { homesWithOpenings += 1; openings += open; }
    if (v.fresh && v.verifiedAt) lastVerified = Math.max(lastVerified, Date.parse(v.verifiedAt));
    for (const lvl of new Set(h.careLevel ?? [])) {
      const s = levels.get(lvl) ?? { careLevel: lvl, homes: 0, homesWithOpenings: 0, openings: 0 };
      s.homes += 1;
      if (open > 0) { s.homesWithOpenings += 1; s.openings += open; }
      levels.set(lvl, s);
    }
  }
  const rank = (l: string) => { const i = CARE_LEVEL_ORDER.indexOf(l); return i === -1 ? CARE_LEVEL_ORDER.length : i; };
  return {
    totalHomes: homes.length,
    verifiedHomes,
    homesWithOpenings,
    openings,
    lastVerifiedAt: lastVerified ? new Date(lastVerified).toISOString() : null,
    byCareLevel: [...levels.values()].sort((a, b) => rank(a.careLevel) - rank(b.careLevel) || a.careLevel.localeCompare(b.careLevel)),
  };
}

export const CARE_LEVEL_LABELS: Record<string, string> = {
  INDEPENDENT: 'Independent living',
  ASSISTED: 'Assisted living',
  MEMORY_CARE: 'Memory care',
  SKILLED_NURSING: 'Skilled nursing',
};
