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
 *   --with-photos      Also extract photos: scrape <img> candidates, AI-classify,
 *                      and (on --force) download + re-host on Cloudinary as
 *                      auto-populated HomePhoto rows. On --dry-run, classifies
 *                      only (no download/upload). Requires CLOUDINARY_* env vars
 *                      on a live run.
 *   --photos-only      Backfill photos onto records that ALREADY have their text
 *                      profile. Skips the AI text extraction + all text-field DB
 *                      writes entirely (no overwrite, no autoPopulatedVersion bump);
 *                      only scrapes for <img> candidates, classifies, and appends
 *                      auto-populated HomePhoto rows. Implies --with-photos and
 *                      intentionally ignores the --resume "already populated" skip.
 *   --facility <id>    Process only this homeId
 */

import { PrismaClient, HomeStatus } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { scrapeOperatorWebsite, prepareHtmlForExtraction, ScrapeError, ImageCandidate } from '../src/lib/operator-profile-scraper';
import { extractProfileFromWebsite, classifyFacilityImages } from '../src/lib/profile-generator/home-profile-generator';
import { downloadAndRehost } from '../src/lib/profile-generator/photo-rehost';
import { findAddressViaPlaces, isPlaceLookupConfigured, type PlaceAddressResult } from '../src/lib/place-lookup';

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
  | { status: 'success'; homeId: string; homeName: string; fieldsExtracted: number; confidence: string; dollars: number; photosUploaded?: number }
  | { status: 'skipped'; homeId: string; homeName: string; reason: string }
  | { status: 'sparse'; homeId: string; homeName: string; confidence: string; dollars: number; photosUploaded?: number }
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
  { dryRun, resume, withPhotos, photosOnly }: { dryRun: boolean; resume: boolean; withPhotos: boolean; photosOnly: boolean },
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
  // --resume skips already-populated homes. Photos-only runs deliberately TARGET
  // those homes (we are backfilling photos onto records that already have text),
  // so the "already populated" skip must not apply in photos-only mode.
  if (resume && home.autoPopulatedAt && !photosOnly) {
    return { status: 'skipped', homeId, homeName, reason: 'already auto-populated (--resume)' };
  }

  // Scrape — needed for both text extraction and image candidates.
  let html: string;
  let finalUrl: string;
  let imageCandidates: ImageCandidate[] = [];
  try {
    const scraped = await scrapeOperatorWebsite(websiteUrl);
    html = scraped.html;
    finalUrl = scraped.finalUrl;
    imageCandidates = scraped.imageCandidates;
  } catch (e) {
    const err = e instanceof ScrapeError ? e : new ScrapeError('PERMANENT', String(e));
    return { status: 'blocked', homeId, homeName, reason: err.message };
  }

  let extracted: Awaited<ReturnType<typeof extractProfileFromWebsite>> | null = null;
  let dollars = 0;
  let fieldsExtracted = 0;

  // ── Text extraction + field writes — skipped entirely in --photos-only mode ──
  if (!photosOnly) {
    const preparedHtml = prepareHtmlForExtraction(html);

    // Extract
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

    dollars = cost(extracted.tokensIn, extracted.tokensOut);

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

    // Address: only fill fields that are currently empty/missing.
    const addr = extracted.address;
    const aiStreet = addr?.streetAddress?.trim() || null;
    const aiZip = addr?.zip?.trim() || null;

    // Google Places address fallback (OL-061): the website scrape frequently
    // misses the street address (leaving the listing showing the form's
    // "1234 Oak Lane" placeholder). When neither the DB nor the AI gives us a
    // street, look the facility up by name + city in Google Places —
    // authoritative for addresses — and use a HIGH/MEDIUM-confidence match.
    let placesAddr: PlaceAddressResult | null = null;
    if (!home.address?.street && !aiStreet && isPlaceLookupConfigured()) {
      placesAddr = await findAddressViaPlaces({
        name: home.name,
        city: home.address?.city ?? null,
        state: home.address?.state ?? null,
      });
      if (placesAddr && placesAddr.street && placesAddr.confidence !== 'LOW') {
        console.log(
          `    📍 Places address fallback: "${placesAddr.street}"` +
          `${placesAddr.zip ? ` ${placesAddr.zip}` : ''} ` +
          `(${placesAddr.confidence}, matched "${placesAddr.matchedName ?? '?'}")`,
        );
      } else {
        if (placesAddr) {
          console.log(`    📍 Places address: LOW-confidence match ignored ("${placesAddr.matchedName ?? '?'}")`);
        }
        placesAddr = null;
      }
    }

    // AI scrape first, then the Places fallback, for the street/zip we persist.
    const resolvedStreet = aiStreet ?? placesAddr?.street ?? null;
    const resolvedZip = aiZip ?? placesAddr?.zip ?? null;

    // 'AI' provenance covers both scrape- and Places-derived auto-fill for the
    // operator-facing badge (FieldProvenance has no 'PLACES' variant).
    if (!home.address?.street && resolvedStreet) {
      preFilledFields['street'] = 'AI';
    }
    if (!home.address?.zipCode && resolvedZip) {
      preFilledFields['zipCode'] = 'AI';
    }

    // Mark existing seed fields (from DOH) as SEED provenance
    if (home.name) preFilledFields['name'] = 'SEED';
    if (home.capacity) preFilledFields['capacity'] = 'SEED';
    if (home.address?.city) preFilledFields['city'] = 'SEED';
    if (home.address?.state) preFilledFields['state'] = 'SEED';

    updateData.preFilledFields = preFilledFields;

    // Count extracted fields (description + services + amenities + careLevel + address fields)
    fieldsExtracted = [
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

      // Upsert address — fill empty street/zip from the AI scrape or Places fallback.
      if (home.address) {
        const addrUpdate: Record<string, string> = {};
        if (!home.address.street && resolvedStreet) addrUpdate.street = resolvedStreet;
        if (!home.address.zipCode && resolvedZip) addrUpdate.zipCode = resolvedZip;
        if (Object.keys(addrUpdate).length > 0) {
          await prisma.address.update({ where: { id: home.address.id }, data: addrUpdate });
        }
      }
    }
  } else {
    console.log(`  📷 ${homeName} — photos-only (text extraction + text writes skipped)`);
  }

  // ── Photo pipeline (Tasks 1-4) — opt-in via --with-photos / --photos-only ──
  let imageDollars = 0;
  let photosUploaded = 0;
  if (withPhotos) {
    try {
      const classification = await classifyFacilityImages(home.name, imageCandidates);
      imageDollars = cost(classification.tokensIn, classification.tokensOut);
      const keptCount = classification.kept.length;

      if (dryRun) {
        console.log(
          `    📷 ${imageCandidates.length} candidate(s) → ${keptCount} would be kept ` +
          `(img classify $${imageDollars.toFixed(3)})`,
        );
      } else if (keptCount > 0) {
        const rehost = await downloadAndRehost(
          homeId,
          classification.kept.map((k) => ({ url: k.url, altText: k.altText })),
        );

        if (rehost.uploaded.length > 0) {
          // Idempotent re-runs: clear prior auto-populated photos before writing.
          await prisma.homePhoto.deleteMany({ where: { homeId, autoPopulated: true } });
          const existingCount = await prisma.homePhoto.count({ where: { homeId } });

          let sortOrder = 0;
          for (const p of rehost.uploaded) {
            await prisma.homePhoto.create({
              data: {
                homeId,
                url: p.cloudinaryUrl,
                caption: p.altText ?? null,
                autoPopulated: true,
                sourceUrl: p.sourceUrl,
                sortOrder: sortOrder,
                // Make the first photo primary only if the home has none yet.
                isPrimary: existingCount === 0 && sortOrder === 0,
              },
            });
            sortOrder += 1;
          }
          photosUploaded = rehost.uploaded.length;
        }

        console.log(
          `    📷 ${imageCandidates.length} candidate(s) → ${keptCount} kept → ` +
          `${photosUploaded} uploaded (${rehost.skipped.length} skipped) ` +
          `[img classify $${imageDollars.toFixed(3)}]`,
        );
        if (rehost.skipped.length > 0) {
          rehost.skipped.forEach((s) => console.log(`        ↳ skipped ${s.url}: ${s.reason}`));
        }
      } else {
        console.log(
          `    📷 ${imageCandidates.length} candidate(s) → 0 kept ` +
          `[img classify $${imageDollars.toFixed(3)}]`,
        );
      }
    } catch (e: any) {
      console.log(`    📷 photo pipeline error: ${e?.message ?? e}`);
    }
  }

  const totalDollars = dollars + imageDollars;
  console.log(
    `    💵 cost: ` +
    (photosOnly
      ? `images $${imageDollars.toFixed(3)}`
      : `text $${dollars.toFixed(3)}` +
        (withPhotos ? ` + images $${imageDollars.toFixed(3)} = $${totalDollars.toFixed(3)}` : '')) +
    (withPhotos && !dryRun ? ` | photos uploaded: ${photosUploaded}` : ''),
  );

  if (extracted && extracted.extractionConfidence === 'LOW') {
    return { status: 'sparse', homeId, homeName, confidence: extracted.extractionConfidence, dollars: totalDollars, photosUploaded };
  }
  return {
    status: 'success',
    homeId,
    homeName,
    fieldsExtracted,
    confidence: photosOnly ? 'PHOTOS' : (extracted ? extracted.extractionConfidence : 'N/A'),
    dollars: totalDollars,
    photosUploaded,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find(a => !a.startsWith('--'));
  const dryRun = !args.includes('--force') && (args.includes('--dry-run') || !args.includes('--force'));
  const resume = args.includes('--resume');
  const photosOnly = args.includes('--photos-only');
  // Photos-only is a photo run by definition.
  const withPhotos = args.includes('--with-photos') || photosOnly;
  const facilityFlag = args.indexOf('--facility');
  const onlyFacilityId = facilityFlag !== -1 ? args[facilityFlag + 1] : null;

  if (!csvPath) {
    console.error('Usage: autopopulate-cohort.ts <path/to/websites.csv> [--dry-run|--force] [--resume] [--with-photos] [--photos-only] [--facility <id>]');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  // Photo download + re-host requires Cloudinary; only enforced on a live run.
  if (withPhotos && !dryRun) {
    const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(
      (k) => !process.env[k],
    );
    if (missing.length > 0) {
      console.error(`ERROR: --with-photos requires Cloudinary env vars. Missing: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  console.log(dryRun ? '=== DRY RUN — no DB writes ===' : '=== LIVE RUN ===');
  if (photosOnly) console.log('=== PHOTOS-ONLY mode: text extraction + text writes skipped, photos appended ===');
  if (withPhotos) console.log(`=== Photo extraction ENABLED ${dryRun ? '(classify only — no download/upload on dry-run)' : '(download + Cloudinary re-host)'} ===`);
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
      const result = await processRow(row, { dryRun, resume, withPhotos, photosOnly });
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

  const totalPhotos = results.reduce(
    (sum, r) => sum + ((r.status === 'success' || r.status === 'sparse') ? (r.photosUploaded ?? 0) : 0),
    0,
  );

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`${rows.length} facilities processed: ${succeeded} succeeded, ${sparse} sparse, ${blocked} blocked, ${skipped} skipped`);
  console.log(`Total Anthropic spend:  $${totalDollars.toFixed(3)}`);
  if (withPhotos && !dryRun) {
    console.log(`Total photos uploaded:  ${totalPhotos}`);
  }
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
