#!/usr/bin/env npx tsx
/**
 * scripts/ingest-odh-inspections.ts — OL-113 "State Inspection History"
 *
 * Idempotently ingests Ohio Department of Health RCF survey/citation records
 * into FacilityInspection, matched to directory listings by license number
 * (fallback: exact normalized name + city — ambiguous matches are reported for
 * manual review and NEVER written). Demo/test listings are excluded entirely.
 *
 * Input: a normalized JSON array or CSV file (contract + candidate sources in
 * docs/ODH_INSPECTION_DATA_SOURCE.md). File-first by design: *.ohio.gov blocks
 * datacenter fetchers, so the founder downloads/produces the file and this
 * script does the safe part. --fetch-url attempts a direct download for
 * environments where egress works, and fails gracefully when blocked.
 *
 * Usage:
 *   npx tsx scripts/ingest-odh-inspections.ts --input odh-surveys.json           # dry-run (default)
 *   npx tsx scripts/ingest-odh-inspections.ts --input odh-surveys.json --force   # write
 *   npx tsx scripts/ingest-odh-inspections.ts --fetch-url https://... --force
 *   npx tsx scripts/ingest-odh-inspections.ts --backfill-licenses [--force]
 *
 * --backfill-licenses extracts the "ODH license NNNNR" tokens the metro seed
 * embedded in listing descriptions into the structured odhLicenseNumber column
 * (~70 homes), so license-based matching works before the first ODH file load.
 *
 * Idempotent: upserts keyed on (facilityId, surveyDate, surveyType); re-running
 * the same input is a no-op apart from fetchedAt. Dry-run by default.
 */

import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { parseOdhInput, ingestOdhRecords } from '../src/lib/inspections/ingest';
import { isExcludedDemoHome } from '../src/lib/inspections/matcher';

const prisma = new PrismaClient();

interface Args {
  input?: string;
  fetchUrl?: string;
  force: boolean;
  backfillLicenses: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { force: false, backfillLicenses: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--fetch-url') args.fetchUrl = argv[++i];
    else if (a === '--force') args.force = true;
    else if (a === '--backfill-licenses') args.backfillLicenses = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: ingest-odh-inspections.ts (--input <file> | --fetch-url <url> | --backfill-licenses) [--force]');
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

// The metro seed wrote "(ODH license 2318R — verify against ltc.ohio.gov.)" into
// descriptions; lift those into the structured column.
const DESC_LICENSE_RE = /ODH license\s+([0-9]{3,6}R?)\b/i;

async function backfillLicensesFromDescriptions(force: boolean): Promise<void> {
  const homes = await prisma.assistedLivingHome.findMany({
    where: { odhLicenseNumber: null, description: { contains: 'ODH license' } },
    select: {
      id: true,
      name: true,
      description: true,
      operator: { select: { user: { select: { email: true } } } },
    },
  });
  let set = 0;
  let skippedDemo = 0;
  for (const h of homes) {
    if (isExcludedDemoHome({ name: h.name, description: h.description, operatorEmail: h.operator?.user?.email ?? null })) {
      skippedDemo++;
      continue;
    }
    const m = h.description?.match(DESC_LICENSE_RE);
    if (!m) continue;
    const lic = m[1].toUpperCase();
    console.log(`  ${force ? 'SET' : 'WOULD SET'} ${h.name} → odhLicenseNumber=${lic}`);
    if (force) {
      await prisma.assistedLivingHome.update({ where: { id: h.id }, data: { odhLicenseNumber: lic } });
    }
    set++;
  }
  console.log(`\nLicense backfill: ${set} home(s) ${force ? 'updated' : 'would be updated'}; ${skippedDemo} demo/test skipped; ${homes.length - set - skippedDemo} had no parseable token.`);
  if (!force && set > 0) console.log('Re-run with --force to write.');
}

async function fetchSource(url: string): Promise<string> {
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url, {
    headers: { accept: 'application/json, text/csv;q=0.9, */*;q=0.5' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(
      `Source fetch failed: HTTP ${res.status}. *.ohio.gov WAF-blocks many datacenter IPs — ` +
        'download the file manually and re-run with --input <file> (see docs/ODH_INSPECTION_DATA_SOURCE.md).',
    );
  }
  return res.text();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('=== ODH Inspection Ingest (OL-113) ===');
  console.log(`Mode: ${args.force ? 'FORCE (writes enabled)' : 'DRY-RUN (no writes)'}\n`);

  if (args.backfillLicenses) {
    await backfillLicensesFromDescriptions(args.force);
    return;
  }

  if (!args.input && !args.fetchUrl) {
    console.error('Provide --input <file>, --fetch-url <url>, or --backfill-licenses. See --help.');
    process.exit(1);
  }

  const raw = args.input ? readFileSync(args.input, 'utf8') : await fetchSource(args.fetchUrl!);
  const records = parseOdhInput(raw);
  console.log(`Parsed ${records.length} record(s).`);
  if (records.length === 0) {
    console.log('Nothing to ingest.');
    return;
  }

  const summary = await ingestOdhRecords(prisma, records, { force: args.force });

  console.log('\n--- Summary ---');
  console.log(`Records:               ${summary.totalRecords}`);
  console.log(`Invalid (skipped):     ${summary.invalidRecords}`);
  console.log(`Matched by license:    ${summary.matchedByLicense}`);
  console.log(`Matched by name+city:  ${summary.matchedByNameCity}`);
  console.log(`No match (not ours):   ${summary.noMatch}`);
  console.log(`License backfills:     ${summary.licenseBackfills}`);
  console.log(`Demo homes excluded:   ${summary.demoHomesExcluded}`);
  console.log(`${summary.dryRun ? 'Would upsert' : 'Upserted'}:           ${summary.upserted}`);

  if (summary.review.length > 0) {
    console.log(`\n⚠️  MANUAL REVIEW (${summary.review.length} — NOT written):`);
    for (const r of summary.review) {
      console.log(`  - ${r.facilityName} (${r.city ?? 'no city'}, lic ${r.licenseNumber ?? 'n/a'}, survey ${r.surveyDate})`);
      console.log(`      ${r.reason}; candidates: ${r.candidateIds.join(', ')}`);
    }
    console.log('  Resolve by setting odhLicenseNumber on the correct home (admin/Prisma), then re-run.');
  }

  if (summary.dryRun && summary.upserted > 0) {
    console.log('\nDry-run complete. Re-run with --force to write.');
  }
}

main()
  .catch((err) => {
    console.error('\nIngest failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
