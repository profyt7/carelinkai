/**
 * ODH inspection ingestion core (OL-113) — parse a normalized input file and
 * idempotently upsert FacilityInspection rows for CONFIRMED matches only.
 * Shared by scripts/ingest-odh-inspections.ts and /api/cron/odh-inspections.
 *
 * See docs/ODH_INSPECTION_DATA_SOURCE.md for the input contract and matching
 * policy. REVIEW rows are reported, never written.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import {
  CandidateHome,
  OdhCitation,
  OdhSurveyRecord,
  isExcludedDemoHome,
  matchOdhRecord,
  normalizeLicense,
} from './matcher';

export interface IngestOptions {
  /** Write to the DB. Default false = dry-run (report only). */
  force?: boolean;
  /** Timestamp recorded as fetchedAt on written rows (defaults to now). */
  fetchedAt?: Date;
}

export interface ReviewRow {
  facilityName: string;
  city: string | null;
  licenseNumber: string | null;
  surveyDate: string;
  reason: string;
  candidateIds: string[];
}

export interface IngestSummary {
  totalRecords: number;
  invalidRecords: number;
  matchedByLicense: number;
  matchedByNameCity: number;
  noMatch: number;
  review: ReviewRow[];
  upserted: number;
  licenseBackfills: number;
  demoHomesExcluded: number;
  dryRun: boolean;
}

/** Max citations stored per survey record — a sanity cap, not a truncation we expect to hit. */
const MAX_CITATIONS = 50;

/**
 * Parse the normalized input: a JSON array of OdhSurveyRecord, or a CSV with
 * columns licenseNumber,facilityName,city,county,surveyDate,surveyType,
 * citationCount,citations (JSON-encoded),sourceUrl.
 */
export function parseOdhInput(raw: string): OdhSurveyRecord[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr as OdhSurveyRecord[];
  }
  return parseCsv(trimmed);
}

function parseCsv(text: string): OdhSurveyRecord[] {
  const rows = splitCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iLic = idx('licenseNumber');
  const iName = idx('facilityName');
  const iCity = idx('city');
  const iCounty = idx('county');
  const iDate = idx('surveyDate');
  const iType = idx('surveyType');
  const iCount = idx('citationCount');
  const iCit = idx('citations');
  const iUrl = idx('sourceUrl');
  if (iName < 0 || iDate < 0) {
    throw new Error('CSV must have facilityName and surveyDate columns');
  }
  const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? '').trim() : '');
  return rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')).map((row) => {
    let citations: OdhCitation[] | null = null;
    const citRaw = cell(row, iCit);
    if (citRaw) {
      try {
        const parsed = JSON.parse(citRaw);
        if (Array.isArray(parsed)) citations = parsed;
      } catch {
        // Non-JSON citations cell → keep as a single plain-language summary.
        citations = [{ summary: citRaw }];
      }
    }
    return {
      licenseNumber: cell(row, iLic) || null,
      facilityName: cell(row, iName),
      city: cell(row, iCity) || null,
      county: cell(row, iCounty) || null,
      surveyDate: cell(row, iDate),
      surveyType: cell(row, iType) || null,
      citationCount: cell(row, iCount) ? Number(cell(row, iCount)) : null,
      citations,
      sourceUrl: cell(row, iUrl) || null,
    };
  });
}

/** Minimal RFC-4180-ish CSV splitter (quoted fields, embedded commas/newlines). */
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

/** Validate + normalize one record; returns null if unusable. */
export function sanitizeRecord(rec: OdhSurveyRecord): (OdhSurveyRecord & { surveyDateParsed: Date }) | null {
  if (!rec || typeof rec.facilityName !== 'string' || !rec.facilityName.trim()) return null;
  const d = new Date(rec.surveyDate);
  if (Number.isNaN(d.getTime())) return null;
  // Reject future-dated surveys — always a source data error.
  if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;
  const citations = Array.isArray(rec.citations)
    ? rec.citations.slice(0, MAX_CITATIONS).map((c) => ({
        rule: c?.rule ? String(c.rule).slice(0, 120) : null,
        scopeSeverity: c?.scopeSeverity ? String(c.scopeSeverity).slice(0, 60) : null,
        summary: c?.summary ? String(c.summary).slice(0, 2000) : null,
      }))
    : null;
  const count =
    typeof rec.citationCount === 'number' && Number.isFinite(rec.citationCount) && rec.citationCount >= 0
      ? Math.floor(rec.citationCount)
      : citations
        ? citations.length
        : 0;
  return {
    ...rec,
    facilityName: rec.facilityName.trim(),
    surveyDateParsed: d,
    // Non-null type keeps the (facilityId, surveyDate, surveyType) upsert key usable.
    surveyType: (rec.surveyType ?? '').trim() || 'Unspecified',
    citationCount: count,
    citations,
    sourceUrl: rec.sourceUrl && /^https?:\/\//i.test(rec.sourceUrl) ? rec.sourceUrl : null,
  };
}

/** Load matcher candidates: all non-demo directory homes (any status except INACTIVE). */
export async function loadCandidateHomes(
  prisma: PrismaClient,
): Promise<{ candidates: CandidateHome[]; demoExcluded: number }> {
  const homes = await prisma.assistedLivingHome.findMany({
    where: { status: { not: 'INACTIVE' } },
    select: {
      id: true,
      name: true,
      description: true,
      odhLicenseNumber: true,
      address: { select: { city: true, state: true } },
      operator: { select: { user: { select: { email: true } } } },
    },
  });
  let demoExcluded = 0;
  const candidates: CandidateHome[] = [];
  for (const h of homes) {
    const candidate: CandidateHome = {
      id: h.id,
      name: h.name,
      description: h.description,
      odhLicenseNumber: h.odhLicenseNumber,
      city: h.address?.city ?? null,
      operatorEmail: h.operator?.user?.email ?? null,
    };
    if (isExcludedDemoHome(candidate)) {
      demoExcluded++;
      continue;
    }
    candidates.push(candidate);
  }
  return { candidates, demoExcluded };
}

/**
 * Ingest normalized ODH records. Idempotent: upsert keyed on
 * (facilityId, surveyDate, surveyType); re-running the same file is a no-op
 * apart from fetchedAt refresh.
 */
export async function ingestOdhRecords(
  prisma: PrismaClient,
  records: OdhSurveyRecord[],
  opts: IngestOptions = {},
): Promise<IngestSummary> {
  const force = Boolean(opts.force);
  const fetchedAt = opts.fetchedAt ?? new Date();
  const { candidates, demoExcluded } = await loadCandidateHomes(prisma);

  const summary: IngestSummary = {
    totalRecords: records.length,
    invalidRecords: 0,
    matchedByLicense: 0,
    matchedByNameCity: 0,
    noMatch: 0,
    review: [],
    upserted: 0,
    licenseBackfills: 0,
    demoHomesExcluded: demoExcluded,
    dryRun: !force,
  };

  // Track license backfills within this run so later records can license-match
  // homes learned earlier in the same file.
  const learnedLicenses = new Map<string, string>(); // homeId -> normalized license

  for (const raw of records) {
    const rec = sanitizeRecord(raw);
    if (!rec) {
      summary.invalidRecords++;
      continue;
    }

    const effectiveCandidates = candidates.map((c) =>
      learnedLicenses.has(c.id) && !c.odhLicenseNumber
        ? { ...c, odhLicenseNumber: learnedLicenses.get(c.id)! }
        : c,
    );
    const outcome = matchOdhRecord(rec, effectiveCandidates);

    if (outcome.status === 'NO_MATCH') {
      summary.noMatch++;
      continue;
    }
    if (outcome.status === 'REVIEW') {
      summary.review.push({
        facilityName: rec.facilityName,
        city: rec.city ?? null,
        licenseNumber: rec.licenseNumber ?? null,
        surveyDate: rec.surveyDateParsed.toISOString().slice(0, 10),
        reason: outcome.reason,
        candidateIds: outcome.candidateIds,
      });
      continue;
    }

    if (outcome.via === 'LICENSE') summary.matchedByLicense++;
    else summary.matchedByNameCity++;

    // Learn the license on a confirmed name+city match.
    const recLic = normalizeLicense(rec.licenseNumber);
    const needsLicenseBackfill =
      outcome.via === 'NAME_CITY' && recLic && !normalizeLicense(outcome.home.odhLicenseNumber);
    if (needsLicenseBackfill) {
      learnedLicenses.set(outcome.home.id, recLic);
      summary.licenseBackfills++;
      if (force) {
        await prisma.assistedLivingHome.update({
          where: { id: outcome.home.id },
          // Store the source's original (trimmed) form, not the normalized one.
          data: { odhLicenseNumber: String(rec.licenseNumber).trim() },
        });
      }
    }

    if (force) {
      // Interfaces lack the index signature Prisma's InputJsonValue wants; the
      // citations array is plain JSON by construction (sanitizeRecord).
      const citationsJson =
        rec.citations != null ? (rec.citations as unknown as Prisma.InputJsonValue) : Prisma.DbNull;
      await prisma.facilityInspection.upsert({
        where: {
          facilityId_surveyDate_surveyType: {
            facilityId: outcome.home.id,
            surveyDate: rec.surveyDateParsed,
            surveyType: rec.surveyType as string,
          },
        },
        create: {
          facilityId: outcome.home.id,
          odhLicenseNumber: rec.licenseNumber?.trim() || outcome.home.odhLicenseNumber || null,
          surveyDate: rec.surveyDateParsed,
          surveyType: rec.surveyType as string,
          citationCount: rec.citationCount ?? 0,
          // Row always mirrors the latest source exactly — no stale citation detail.
          citations: citationsJson,
          sourceUrl: rec.sourceUrl ?? null,
          fetchedAt,
        },
        update: {
          odhLicenseNumber: rec.licenseNumber?.trim() || outcome.home.odhLicenseNumber || null,
          citationCount: rec.citationCount ?? 0,
          citations: citationsJson,
          sourceUrl: rec.sourceUrl ?? null,
          fetchedAt,
        },
      });
    }
    summary.upserted++;
  }

  return summary;
}
