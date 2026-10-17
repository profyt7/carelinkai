/**
 * WRAAA Medicaid Assisted Living Waiver baseline import — the PURE planner
 * (sprint W5-2, G3). `scripts/import-waiver-baseline.ts` reads the DB, calls
 * `planWaiverImport`, prints the report and (with --apply) writes the plan
 * through recordEvent. Everything here is unit-testable with fixtures.
 *
 * Matching policy (false positives are worse than misses):
 *   1. ODH license number, normalized ("0588R" ≡ "588R"), exactly one home →
 *      MATCHED via LICENSE. Several homes with one license → AMBIGUOUS (reported,
 *      never written).
 *   2. Otherwise normalized street + city, exactly one home → MATCHED via ADDRESS.
 *   3. Else UNMATCHED (reported).
 *
 * Precedence: when several rows land on one home (same license on two rows,
 * sister facilities at one address), the most permissive status wins
 * (ACCEPTING_NEW > CURRENT_RESIDENTS_ONLY > NOT_ACCEPTING_REFERRALS).
 *
 * Protection: a home whose medicaidWaiverSource is VA_CALL / OPERATOR / ADMIN is
 * never overwritten — not by a row and not by the NOT_ON_LIST sweep.
 *
 * Sweep: a home in Cuyahoga / Lake / Geauga / Lorain / Medina that matched no
 * row becomes NOT_ON_LIST. Summit / Portage (and cities we cannot place) stay
 * UNKNOWN. Demo / test listings are excluded from everything.
 */

import type { MedicaidWaiverStatus } from '@prisma/client';
import { isExcludedDemoHome, normalizeLicense } from '@/lib/inspections/matcher';
import { cityKey, countyForCity } from '@/lib/medicaid/ne-ohio-counties';
import { WRAAA_COUNTIES, isProtectedSource, mostPermissiveWaiverStatus, wraaaStatusToEnum } from '@/lib/medicaid/waiver';

export type WraaaRow = {
  line: number;
  odhLicense: string | null;
  name: string;
  address: string;
  city: string;
  zip: string;
  rawStatus: string;
  status: MedicaidWaiverStatus | null;
};

export type ImportHome = {
  id: string;
  name: string;
  description?: string | null;
  operatorEmail?: string | null;
  odhLicenseNumber?: string | null;
  street?: string | null;
  city?: string | null;
  medicaidWaiverStatus: MedicaidWaiverStatus;
  medicaidWaiverSource?: string | null;
};

export type MatchVia = 'LICENSE' | 'ADDRESS';

export type RowMatch = { row: WraaaRow; homeId: string; via: MatchVia };
export type RowProblem = { row: WraaaRow; reason: string; candidateIds?: string[] };

export type PlannedWrite = {
  homeId: string;
  homeName: string;
  from: MedicaidWaiverStatus;
  to: MedicaidWaiverStatus;
  via: MatchVia | 'NOT_ON_LIST_SWEEP';
  /** CSV line numbers that contributed (empty for the sweep). */
  rows: number[];
};

export type WaiverImportPlan = {
  rowsTotal: number;
  rowsMatched: RowMatch[];
  rowsUnmatched: RowProblem[];
  rowsAmbiguous: RowProblem[];
  rowsBadStatus: RowProblem[];
  /** Homes whose status would change (rows + sweep). */
  writes: PlannedWrite[];
  /** Matched homes already at the planned status. */
  unchanged: number;
  /** Matched / swept homes left alone because a human source owns the field. */
  skippedProtected: Array<{ homeId: string; homeName: string; source: string; wanted: MedicaidWaiverStatus }>;
  /** Homes outside WRAAA's five counties (or with an unplaceable city) left UNKNOWN. */
  leftUnknownOutsideRegion: number;
  homesConsidered: number;
  homesExcludedDemo: number;
};

/* ---------------------------------- CSV ---------------------------------- */

/** Minimal RFC-4180 line splitter (quotes + escaped quotes); the file has no newlines in fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseWraaaCsv(text: string): WraaaRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const header = splitCsvLine(lines[0] ?? '').map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iLic = col('odh_license');
  const iName = col('wraaa_name');
  const iAddr = col('address');
  const iCity = col('city');
  const iZip = col('zip');
  const iStatus = col('wraaa_status');
  if ([iLic, iName, iAddr, iCity, iZip, iStatus].some((i) => i < 0)) {
    throw new Error(`CSV header must be odh_license,wraaa_name,address,city,zip,wraaa_status (got: ${lines[0]})`);
  }
  const rows: WraaaRow[] = [];
  for (let n = 1; n < lines.length; n++) {
    const raw = lines[n];
    if (!raw || !raw.trim()) continue;
    const f = splitCsvLine(raw);
    const lic = (f[iLic] ?? '').trim();
    rows.push({
      line: n + 1,
      odhLicense: lic.length ? lic : null,
      name: f[iName] ?? '',
      address: f[iAddr] ?? '',
      city: f[iCity] ?? '',
      zip: f[iZip] ?? '',
      rawStatus: f[iStatus] ?? '',
      status: wraaaStatusToEnum(f[iStatus]),
    });
  }
  return rows;
}

/* ------------------------------- normalizing ------------------------------ */

const STREET_ABBR: Record<string, string> = {
  avenue: 'ave', av: 'ave',
  road: 'rd',
  drive: 'dr', drv: 'dr',
  street: 'st', str: 'st',
  boulevard: 'blvd', boul: 'blvd',
  parkway: 'pkwy', pky: 'pkwy',
  lane: 'ln',
  court: 'ct',
  trail: 'trl', tr: 'trl',
  circle: 'cir',
  place: 'pl',
  highway: 'hwy',
  terrace: 'ter',
  way: 'way',
  north: 'n', south: 's', east: 'e', west: 'w',
  northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw',
  saint: 'st',
};

/** "2116 Dover Center Dr." ≡ "2116 Dover Center Drive" → "2116 dover center dr". */
export function normalizeStreet(street: string | null | undefined): string {
  return (street ?? '')
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => t !== 'the')
    .map((t) => STREET_ABBR[t] ?? t)
    .join(' ');
}

export function addressKey(street: string | null | undefined, city: string | null | undefined): string | null {
  const s = normalizeStreet(street);
  const c = cityKey(city);
  // A key needs a house number + something, and a city, or it matches too loosely.
  if (!/^\d+\s+\S/.test(s) || !c) return null;
  return `${s}|${c}`;
}

/* --------------------------------- planner -------------------------------- */

export function planWaiverImport(rows: readonly WraaaRow[], homesIn: readonly ImportHome[]): WaiverImportPlan {
  const homes = homesIn.filter((h) => !isExcludedDemoHome({ name: h.name, description: h.description, operatorEmail: h.operatorEmail }));
  const homesExcludedDemo = homesIn.length - homes.length;
  const byId = new Map(homes.map((h) => [h.id, h]));

  const byLicense = new Map<string, ImportHome[]>();
  const byAddress = new Map<string, ImportHome[]>();
  for (const h of homes) {
    const lic = normalizeLicense(h.odhLicenseNumber);
    if (lic) byLicense.set(lic, [...(byLicense.get(lic) ?? []), h]);
    const ak = addressKey(h.street, h.city);
    if (ak) byAddress.set(ak, [...(byAddress.get(ak) ?? []), h]);
  }

  const rowsMatched: RowMatch[] = [];
  const rowsUnmatched: RowProblem[] = [];
  const rowsAmbiguous: RowProblem[] = [];
  const rowsBadStatus: RowProblem[] = [];
  const wanted = new Map<string, { statuses: MedicaidWaiverStatus[]; rows: number[]; via: MatchVia }>();
  // Homes named by an ambiguous row are probably on the list — never swept to NOT_ON_LIST.
  const ambiguousHomeIds = new Set<string>();

  for (const row of rows) {
    if (!row.status) {
      rowsBadStatus.push({ row, reason: `unknown wraaa_status "${row.rawStatus}"` });
      continue;
    }
    let hit: ImportHome | null = null;
    let via: MatchVia | null = null;

    const lic = normalizeLicense(row.odhLicense);
    if (lic) {
      const c = byLicense.get(lic) ?? [];
      if (c.length === 1) {
        hit = c[0];
        via = 'LICENSE';
      } else if (c.length > 1) {
        rowsAmbiguous.push({ row, reason: `license ${row.odhLicense} is on ${c.length} homes`, candidateIds: c.map((h) => h.id) });
        c.forEach((h) => ambiguousHomeIds.add(h.id));
        continue;
      }
    }
    if (!hit) {
      const ak = addressKey(row.address, row.city);
      const c = ak ? byAddress.get(ak) ?? [] : [];
      if (c.length === 1) {
        hit = c[0];
        via = 'ADDRESS';
      } else if (c.length > 1) {
        rowsAmbiguous.push({ row, reason: `address matches ${c.length} homes`, candidateIds: c.map((h) => h.id) });
        c.forEach((h) => ambiguousHomeIds.add(h.id));
        continue;
      }
    }
    if (!hit || !via) {
      rowsUnmatched.push({ row, reason: lic ? 'no home with this license or address' : 'no license on the row; no home at this address' });
      continue;
    }
    rowsMatched.push({ row, homeId: hit.id, via });
    const w = wanted.get(hit.id) ?? { statuses: [], rows: [], via };
    w.statuses.push(row.status);
    w.rows.push(row.line);
    // Prefer to report LICENSE when any contributing row matched by license.
    if (via === 'LICENSE') w.via = 'LICENSE';
    wanted.set(hit.id, w);
  }

  const writes: PlannedWrite[] = [];
  const skippedProtected: WaiverImportPlan['skippedProtected'] = [];
  let unchanged = 0;

  for (const [homeId, w] of wanted) {
    const home = byId.get(homeId)!;
    const to = mostPermissiveWaiverStatus(w.statuses);
    if (isProtectedSource(home.medicaidWaiverSource)) {
      if (home.medicaidWaiverStatus !== to) skippedProtected.push({ homeId, homeName: home.name, source: home.medicaidWaiverSource!, wanted: to });
      else unchanged += 1;
      continue;
    }
    if (home.medicaidWaiverStatus === to) {
      unchanged += 1;
      continue;
    }
    writes.push({ homeId, homeName: home.name, from: home.medicaidWaiverStatus, to, via: w.via, rows: w.rows });
  }

  // NOT_ON_LIST sweep for WRAAA's five counties.
  let leftUnknownOutsideRegion = 0;
  for (const h of homes) {
    if (wanted.has(h.id) || ambiguousHomeIds.has(h.id)) continue;
    const county = countyForCity(h.city);
    if (!county || !WRAAA_COUNTIES.includes(county)) {
      if (h.medicaidWaiverStatus === 'UNKNOWN') leftUnknownOutsideRegion += 1;
      continue;
    }
    if (isProtectedSource(h.medicaidWaiverSource)) {
      if (h.medicaidWaiverStatus !== 'NOT_ON_LIST') skippedProtected.push({ homeId: h.id, homeName: h.name, source: h.medicaidWaiverSource!, wanted: 'NOT_ON_LIST' });
      continue;
    }
    if (h.medicaidWaiverStatus === 'NOT_ON_LIST') continue;
    // Only an UNKNOWN (or a prior import value) is swept — a listed status that
    // came from an earlier import but is no longer on the list is also corrected.
    writes.push({ homeId: h.id, homeName: h.name, from: h.medicaidWaiverStatus, to: 'NOT_ON_LIST', via: 'NOT_ON_LIST_SWEEP', rows: [] });
  }

  return {
    rowsTotal: rows.length,
    rowsMatched,
    rowsUnmatched,
    rowsAmbiguous,
    rowsBadStatus,
    writes,
    unchanged,
    skippedProtected,
    leftUnknownOutsideRegion,
    homesConsidered: homes.length,
    homesExcludedDemo,
  };
}

/** Human-readable summary for the shell. */
export function formatPlan(plan: WaiverImportPlan): string {
  const lines: string[] = [];
  const viaCount = (v: MatchVia) => plan.rowsMatched.filter((m) => m.via === v).length;
  lines.push(`CSV rows:                 ${plan.rowsTotal}`);
  lines.push(`  matched:                ${plan.rowsMatched.length}  (license ${viaCount('LICENSE')}, address ${viaCount('ADDRESS')})`);
  lines.push(`  unmatched:              ${plan.rowsUnmatched.length}`);
  lines.push(`  ambiguous (not written):${String(plan.rowsAmbiguous.length).padStart(2)}`);
  lines.push(`  bad status (skipped):   ${plan.rowsBadStatus.length}`);
  lines.push(`Homes considered:         ${plan.homesConsidered}  (demo/test excluded: ${plan.homesExcludedDemo})`);
  const fromRows = plan.writes.filter((w) => w.via !== 'NOT_ON_LIST_SWEEP').length;
  const sweep = plan.writes.length - fromRows;
  lines.push(`Would change:             ${plan.writes.length}  (from rows ${fromRows}, NOT_ON_LIST sweep ${sweep})`);
  lines.push(`  unchanged (same value): ${plan.unchanged}`);
  lines.push(`  skipped (human source): ${plan.skippedProtected.length}`);
  lines.push(`  left UNKNOWN (Summit/Portage/unplaced city): ${plan.leftUnknownOutsideRegion}`);
  for (const m of plan.rowsMatched.filter((x) => x.via === 'ADDRESS')) {
    lines.push(`  ↳ address match  line ${m.row.line}  "${m.row.name}" (${m.row.address}, ${m.row.city}) → home ${m.homeId}`);
  }
  for (const u of plan.rowsUnmatched) lines.push(`  ✗ unmatched      line ${u.row.line}  "${u.row.name}" (${u.row.odhLicense ?? 'no license'}; ${u.row.address}, ${u.row.city}) — ${u.reason}`);
  for (const a of plan.rowsAmbiguous) lines.push(`  ? ambiguous      line ${a.row.line}  "${a.row.name}" — ${a.reason} [${(a.candidateIds ?? []).join(', ')}]`);
  for (const b of plan.rowsBadStatus) lines.push(`  ! bad status     line ${b.row.line}  "${b.row.name}" — ${b.reason}`);
  for (const s of plan.skippedProtected) lines.push(`  ⛔ protected     ${s.homeName} (${s.homeId}) source=${s.source} wanted=${s.wanted}`);
  return lines.join('\n');
}
