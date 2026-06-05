#!/usr/bin/env npx tsx
/**
 * scripts/autopopulate-cohort.ts
 *
 * Batch AI profile extraction from operator websites.
 *
 * Usage:
 *   node_modules/.bin/tsx scripts/autopopulate-cohort.ts \
 *     path/to/first_batch_websites.csv --dry-run
 *
 * CSV format:
 *   homeName,homeId,websiteUrl
 *   "Canterbury Commons","cmp71kmu9002ulpioyuv8hf5x","https://example.com"
 *
 * Flags:
 *   --dry-run          Run pipeline, show what would update, don't write (default)
 *   --force            Write results to DB
 *   --resume           Skip facilities that already have autoPopulatedAt set
 *   --facility <id>    Process only this homeId
 */

import { PrismaClient, HomeStatus } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { scrapeOperatorWebsite, prepareHtmlForExtraction, ScrapeError } from '../src/lib/operator-profile-scraper';
import { extractProfileFromWebsite } from '../src/lib/profile-generator/home-profile-generator';

const prisma = new PrismaClient();

// Sonnet 4.6 pricing (per 1M tokens)
const PRICE_IN_PER_1M = 3.0;
const PRICE_OUT_PER_1M = 15.0;

function cost(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * PRICE_IN_PER_1M + (tokensOut / 1_000_000) * PRICE_OUT_PER_1M;
}

interface CsvRow {
  homeName: string;
  homeId: string;
  websiteUrl: string;
}

type FacilityResult =
  | { status: 'success'; homeId: string; homeName: string; fieldsExtracted: number; confidence: string; dollars: number }
  | { status: 'skipped'; homeId: string; homeName: string; reason: string }
  | { status: 'sparse'; homeId: string; homeName: string; confidence: string; dollars: number }
  | { status: 'blocked'; homeId: string; homeName: string; reason: string };

function parseCsv(filePath: string): CsvRow[] {
  const csv = readFileSync(filePath, 'utf-8');
  const result = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new Error(`CSV parse errors: ${result.errors.map(e => e.message).join(', ')}`);
  }
  return result.data;
}

async function processRow(
  row: CsvRow,
  { dryRun, resume }: { dryRun: boolean; resume: boolean },
): Promise<FacilityResult> {
  const { homeName, homeId, websiteUrl } = row;

  // Fetch home from DB
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: homeId },
    include: { address: true },
  });

  if (!home) {
    return { status: 'skipped', homeId, homeName, reason: 'Home not found in DB' };
  }
  if (home.status !== HomeStatus.DRAFT) {
    return { status: 'skipped', homeId, homeName, reason: `status=${home.status} (only DRAFT homes)` };
  }
  if (resume && home.autoPopulatedAt) {
    return { status: 'skipped', homeId, homeName, reason: 'already auto-populated (--resume)' };
  }

  // Scrape
  let html: string;
  let finalUrl: string;
  try {
    const scraped = await scrapeOperatorWebsite(websiteUrl);
    html = scraped.html;
    finalUrl = scraped.finalUrl;
  } catch (e) {
    const err = e instanceof ScrapeError ? e : new ScrapeError('PERMANENT', String(e));
    return { status: 'blocked', homeId, homeName, reason: err.message };
  }

  const preparedHtml = prepareHtmlForExtraction(html);

  // Extract
  let extracted;
  try {
    extracted = await extractProfileFromWebsite(
      {
        name: home.name,
        careLevel: home.careLevel,
        capacity: home.capacity,
        currentOccupancy: home.currentOccupancy,
        amenities: home.amenities,
        address: home.address
          ? { city: home.address.city, state: home.address.state }
          : undefined,
      },
      preparedHtml,
      websiteUrl,
    );
  } catch (e: any) {
    return { status: 'blocked', homeId, homeName, reason: `Extraction failed: ${e?.message ?? e}` };
  }

  const dollars = cost(extracted.tokensIn, extracted.tokensOut);

  // Build update payload
  const preFilledFields: Record<string, 'AI' | 'SEED'> = {};

  const updateData: Parameters<typeof prisma.assistedLivingHome.update>[0]['data'] = {
    websiteUrl: websiteUrl,
    autoPopulatedAt: new Date(),
    autoPopulatedFromUrl: finalUrl,
    autoPopulatedVersion: (home.autoPopulatedVersion ?? 0) + 1,
    aiPopulationConfidence: extracted.extractionConfidence,
  };

  if (extracted.description) {
    updateData.description = extracted.description;
    preFilledFields['description'] = 'AI';
  }

  if (extracted.amenities.length > 0) {
    updateData.amenities = extracted.amenities;
    preFilledFields['amenities'] = 'AI';
  }

  if (extracted.careLevel.length > 0) {
    updateData.careLevel = extracted.careLevel as any;
    preFilledFields['careLevel'] = 'AI';
  }

  // Address: only update fields that are currently empty or missing
  const addr = extracted.address;
  if (addr) {
    if (!home.address?.street && addr.streetAddress) {
      preFilledFields['street'] = 'AI';
    }
    if (addr.zipCode && !home.address?.zipCode) {
      preFilledFields['zipCode'] = 'AI';
    }
  }

  // Mark existing seed fields (from DOH) as SEED provenance
  if (home.name) preFilledFields['name'] = 'SEED';
  if (home.capacity) preFilledFields['capacity'] = 'SEED';
  if (home.address?.city) preFilledFields['city'] = 'SEED';
  if (home.address?.state) preFilledFields['state'] = 'SEED';

  updateData.preFilledFields = preFilledFields;

  // Count extracted fields (description + services + amenities + careLevel + address fields)
  const fieldsExtracted = [
    extracted.description,
    extracted.services.length > 0,
    extracted.amenities.length > 0,
    extracted.careLevel.length > 0,
    extracted.address?.streetAddress,
    extracted.address?.zip,
    extracted.phone,
    extracted.contactEmail,
    extracted.tagline,
  ].filter(Boolean).length;

  const icon = extracted.extractionConfidence === 'LOW' ? '⚠' : '✓';
  console.log(
    `  ${icon} ${homeName} — extracted ${fieldsExtracted} fields (${extracted.extractionConfidence} confidence), $${dollars.toFixed(3)}`,
  );
  if (extracted.extractionNotes) {
    console.log(`    Notes: ${extracted.extractionNotes}`);
  }

  if (!dryRun) {
    await prisma.assistedLivingHome.update({ where: { id: homeId }, data: updateData });

    // Upsert address if we got street/zip from AI and home already has an address record
    if (home.address && addr) {
      const addrUpdate: Record<string, string> = {};
      if (!home.address.street && addr.streetAddress) addrUpdate.street = addr.streetAddress;
      if (!home.address.zipCode && addr.zip) addrUpdate.zipCode = addr.zip;
      if (Object.keys(addrUpdate).length > 0) {
        await prisma.address.update({ where: { id: home.address.id }, data: addrUpdate });
      }
    }
  }

  if (extracted.extractionConfidence === 'LOW') {
    return { status: 'sparse', homeId, homeName, confidence: extracted.extractionConfidence, dollars };
  }
  return { status: 'success', homeId, homeName, fieldsExtracted, confidence: extracted.extractionConfidence, dollars };
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find(a => !a.startsWith('--'));
  const dryRun = !args.includes('--force') && (args.includes('--dry-run') || !args.includes('--force'));
  const resume = args.includes('--resume');
  const facilityFlag = args.indexOf('--facility');
  const onlyFacilityId = facilityFlag !== -1 ? args[facilityFlag + 1] : null;

  if (!csvPath) {
    console.error('Usage: autopopulate-cohort.ts <path/to/websites.csv> [--dry-run|--force] [--resume] [--facility <id>]');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  console.log(dryRun ? '=== DRY RUN — no DB writes ===' : '=== LIVE RUN ===');
  console.log('');

  let rows: CsvRow[];
  try {
    rows = parseCsv(path.resolve(csvPath));
  } catch (e: any) {
    console.error(`Failed to parse CSV: ${e.message}`);
    process.exit(1);
  }

  if (onlyFacilityId) {
    rows = rows.filter(r => r.homeId === onlyFacilityId);
    if (rows.length === 0) {
      console.error(`No CSV row found with homeId=${onlyFacilityId}`);
      process.exit(1);
    }
  }

  console.log(`Processing ${rows.length} facilit${rows.length === 1 ? 'y' : 'ies'}…\n`);

  const results: FacilityResult[] = [];
  let totalDollars = 0;

  for (const row of rows) {
    try {
      const result = await processRow(row, { dryRun, resume });
      results.push(result);
      if (result.status === 'success' || result.status === 'sparse') {
        totalDollars += result.dollars;
      }
    } catch (e: any) {
      console.error(`  ✗ ${row.homeName} — unexpected error: ${e?.message ?? e}`);
      results.push({ status: 'blocked', homeId: row.homeId, homeName: row.homeName, reason: `Unexpected: ${e?.message}` });
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length;
  const sparse = results.filter(r => r.status === 'sparse').length;
  const blocked = results.filter(r => r.status === 'blocked').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`${rows.length} facilities processed: ${succeeded} succeeded, ${sparse} sparse, ${blocked} blocked, ${skipped} skipped`);
  console.log(`Total Anthropic spend:  $${totalDollars.toFixed(3)}`);
  if (succeeded + sparse > 0) {
    console.log(`Est. cost per facility: $${(totalDollars / (succeeded + sparse)).toFixed(3)}`);
  }
  console.log('─────────────────────────────────────────────────────────');

  if (blocked > 0) {
    console.log('\nBlocked / failed:');
    results.filter(r => r.status === 'blocked').forEach(r => {
      if (r.status === 'blocked') console.log(`  ✗ ${r.homeName}: ${r.reason}`);
    });
  }
  if (skipped > 0) {
    console.log('\nSkipped:');
    results.filter(r => r.status === 'skipped').forEach(r => {
      if (r.status === 'skipped') console.log(`  – ${r.homeName}: ${r.reason}`);
    });
  }
  if (sparse > 0) {
    console.log('\nSparse extractions (LOW confidence — review before relying on these):');
    results.filter(r => r.status === 'sparse').forEach(r => {
      if (r.status === 'sparse') console.log(`  ⚠ ${r.homeName}`);
    });
  }

  if (dryRun) {
    console.log('\nDRY RUN complete. Re-run with --force to write to DB.');
  } else {
    console.log('\nLIVE RUN complete. Homes updated in DB.');
  }
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
