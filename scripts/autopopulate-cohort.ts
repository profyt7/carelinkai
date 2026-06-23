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
 *   --include-unpopulated  With --from-db, also target freshly-seeded directory
 *                      homes that have NO autoPopulatedAt yet (first enrich / first
 *                      address backfill). Scoped to the directory sentinel operator
 *                      only — never a real operator's un-populated DRAFT.
 *   --from-db          Skip the CSV and target all auto-populated DRAFT homes from
 *                      the database (using each home's stored websiteUrl). Pairs
 *                      with --photos-only for a no-CSV photo backfill of the cohort.
 *   --include-active   With --from-db, target auto-populated homes regardless of
 *                      DRAFT/ACTIVE status (so an already-claimed listing like the
 *                      real Canterbury Commons can be backfilled too).
 *   --addresses-only   Backfill addresses via Google Places ONLY (name + any
 *                      known city) — no website scrape, no AI text call, no
 *                      photos. Fills an empty street/zip, or CREATES the Address
 *                      record from the Places match when a home has none; never
 *                      overwrites existing data. Use with --from-db to fix the
 *                      cohort's addresses without re-extracting text. Requires
 *                      GOOGLE_PLACES_API_KEY.
 *   --facility <id>    Process only this homeId
 */

import { PrismaClient, HomeStatus } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { scrapeOperatorWebsite, prepareHtmlForExtraction, ScrapeError, ImageCandidate } from '../src/lib/operator-profile-scraper';
import { extractProfileFromWebsite, classifyFacilityImages } from '../src/lib/profile-generator/home-profile-generator';
import { downloadAndRehost } from '../src/lib/profile-generator/photo-rehost';
import { findAddressViaPlaces, lookupAddressViaPlaces, isPlaceLookupConfigured, type PlaceAddressResult } from '../src/lib/place-lookup';

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
  { dryRun, resume, withPhotos, photosOnly, addressesOnly, includeActive }: { dryRun: boolean; resume: boolean; withPhotos: boolean; photosOnly: boolean; addressesOnly: boolean; includeActive: boolean },
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
  // By default only DRAFT homes are processed; --include-active also allows
  // ACTIVE (etc.) homes so an already-claimed auto-populated listing (e.g. the
  // real Canterbury Commons) can still be backfilled.
  if (home.status !== HomeStatus.DRAFT && !includeActive) {
    return { status: 'skipped', homeId, homeName, reason: `status=${home.status} (only DRAFT homes; pass --include-active to include)` };
  }
  // --resume skips already-populated homes. Photos-only / addresses-only runs
  // deliberately TARGET those homes (backfilling onto records that already have
  // text), so the "already populated" skip must not apply in those modes.
  if (resume && home.autoPopulatedAt && !photosOnly && !addressesOnly) {
    return { status: 'skipped', homeId, homeName, reason: 'already auto-populated (--resume)' };
  }

  // Address-only backfill: Google Places only — no scrape, no AI, no photos.
  if (addressesOnly) {
    return backfillAddressViaPlaces(home, homeName, homeId, dryRun);
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
        website: websiteUrl,
      });
      const accept = placesAddr && placesAddr.street && placesAddr.confidence !== 'LOW'
        ? placesMatchAcceptable(placesAddr, home.address?.state ?? null)
        : { ok: false, reason: placesAddr ? `${placesAddr.confidence} confidence` : 'no match' };
      if (placesAddr && placesAddr.street && accept.ok) {
        console.log(
          `    📍 Places address fallback: "${placesAddr.street}"` +
          `${placesAddr.zip ? ` ${placesAddr.zip}` : ''} ` +
          `(${placesAddr.confidence}, matched "${placesAddr.matchedName ?? '?'}")`,
        );
      } else {
        if (placesAddr) {
          console.log(`    📍 Places address ignored (${accept.reason}; matched "${placesAddr.matchedName ?? '?'}")`);
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

/**
 * OL-066 guard against bad Google Places matches:
 *   - If we know the home's state, reject a candidate in a different state.
 *   - If we DON'T know the state (no seeded address), require a HIGH match —
 *     which, with no city to anchor on, means a website-host-confirmed match —
 *     so a weak name-only MEDIUM (e.g. The Elms → Westerly, RI) is rejected.
 */
function placesMatchAcceptable(
  placesAddr: PlaceAddressResult,
  seededState: string | null,
): { ok: boolean; reason?: string } {
  if (seededState && placesAddr.state && placesAddr.state.toUpperCase() !== seededState.toUpperCase()) {
    return { ok: false, reason: `Places state ${placesAddr.state} != seeded state ${seededState}` };
  }
  if (!seededState && placesAddr.confidence !== 'HIGH') {
    return { ok: false, reason: `no seeded state to verify and match is ${placesAddr.confidence} (need a website-confirmed HIGH)` };
  }
  return { ok: true };
}

/**
 * --addresses-only backfill: give a home a real street/zip from Google Places
 * (name + any known city) without scraping the website, calling the LLM, or
 * touching any other field.
 *   - Address row exists but has no street → fill street (+ zip if empty).
 *   - No Address row at all → CREATE one from the Places match (needs a complete
 *     street/city/state/zip, since those columns are NOT NULL).
 * Never overwrites real existing data.
 */
async function backfillAddressViaPlaces(
  home: {
    websiteUrl: string | null;
    preFilledFields: unknown;
    address: { id: string; city: string; state: string; street: string | null; zipCode: string | null } | null;
  },
  homeName: string,
  homeId: string,
  dryRun: boolean,
): Promise<FacilityResult> {
  const existing = home.address;
  if (existing?.street) {
    return { status: 'skipped', homeId, homeName, reason: 'already has a street address' };
  }

  const lookup = await lookupAddressViaPlaces({
    name: homeName,
    city: existing?.city ?? null,
    state: existing?.state ?? null,
    website: home.websiteUrl ?? null,
  });

  // Verbose diagnostics — distinguish "no candidates" from an API/quota error.
  console.log(
    `  🔎 ${homeName} — Places[${lookup.status}` +
    `${lookup.httpStatus ? ` http=${lookup.httpStatus}` : ''}] ` +
    `candidates=${lookup.candidateCount} ` +
    `top="${lookup.topCandidateName ?? '—'}" @ "${lookup.topCandidateAddress ?? '—'}"` +
    `${lookup.error ? ` err=${lookup.error.replace(/\s+/g, ' ').slice(0, 160)}` : ''}`,
  );

  const placesAddr = lookup.result;
  if (!placesAddr || !placesAddr.street || placesAddr.confidence === 'LOW') {
    return {
      status: 'skipped',
      homeId,
      homeName,
      reason: `no usable Places address match (${lookup.status}${placesAddr ? `, ${placesAddr.confidence}` : ''})`,
    };
  }

  // OL-066: guard against a wrong-location match (e.g. The Elms → Westerly RI).
  const accept = placesMatchAcceptable(placesAddr, existing?.state ?? null);
  if (!accept.ok) {
    console.log(`  🚫 ${homeName} — rejected Places match: ${accept.reason} (matched "${placesAddr.matchedName ?? '?'}" @ "${placesAddr.formattedAddress ?? '?'}")`);
    return { status: 'skipped', homeId, homeName, reason: `Places match rejected — ${accept.reason}` };
  }

  const provenanceFields: string[] = [];

  if (existing) {
    // Address row exists but has no street — fill street (+ zip when empty).
    // Never touch city/state (real existing data).
    console.log(
      `  📍 ${homeName} — fill street "${placesAddr.street}"` +
      `${placesAddr.zip && !existing.zipCode ? ` + zip ${placesAddr.zip}` : ''} ` +
      `(${placesAddr.confidence}, matched "${placesAddr.matchedName ?? '?'}")`,
    );
    if (!dryRun) {
      const addrUpdate: Record<string, string> = { street: placesAddr.street };
      if (placesAddr.zip && !existing.zipCode) addrUpdate.zipCode = placesAddr.zip;
      await prisma.address.update({ where: { id: existing.id }, data: addrUpdate });
      provenanceFields.push(...Object.keys(addrUpdate));
    }
  } else {
    // No Address row at all — create it from the Places match. Address columns
    // (street/city/state/zipCode) are all NOT NULL, so only create when Places
    // returns a complete address.
    if (!placesAddr.city || !placesAddr.state || !placesAddr.zip) {
      console.log(
        `  📍 ${homeName} — Places match incomplete (missing city/state/zip), cannot create address ` +
        `(matched "${placesAddr.matchedName ?? '?'}")`,
      );
      return { status: 'skipped', homeId, homeName, reason: 'Places match missing city/state/zip — cannot create address' };
    }
    console.log(
      `  🏠 ${homeName} — CREATE address: ${placesAddr.street}, ${placesAddr.city}, ` +
      `${placesAddr.state} ${placesAddr.zip} (${placesAddr.confidence}, matched "${placesAddr.matchedName ?? '?'}")`,
    );
    if (!dryRun) {
      await prisma.address.create({
        data: {
          homeId,
          street: placesAddr.street,
          city: placesAddr.city,
          state: placesAddr.state,
          zipCode: placesAddr.zip,
        },
      });
      provenanceFields.push('street', 'city', 'state', 'zipCode');
    }
  }

  if (!dryRun && provenanceFields.length > 0) {
    // Merge provenance: mark the fields we filled without clobbering existing keys.
    const existingProv = (home.preFilledFields as Record<string, string> | null) ?? {};
    const mergedProv: Record<string, string> = { ...existingProv };
    for (const f of provenanceFields) mergedProv[f] = 'AI';
    await prisma.assistedLivingHome.update({
      where: { id: homeId },
      data: { preFilledFields: mergedProv },
    });
  }

  return { status: 'success', homeId, homeName, fieldsExtracted: 1, confidence: 'PLACES', dollars: 0, photosUploaded: 0 };
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find(a => !a.startsWith('--'));
  const dryRun = !args.includes('--force') && (args.includes('--dry-run') || !args.includes('--force'));
  const resume = args.includes('--resume');
  const photosOnly = args.includes('--photos-only');
  // Photos-only is a photo run by definition.
  const withPhotos = args.includes('--with-photos') || photosOnly;
  const fromDb = args.includes('--from-db');
  const addressesOnly = args.includes('--addresses-only');
  const includeActive = args.includes('--include-active');
  // --include-unpopulated: with --from-db, also target freshly-seeded directory homes
  // that have NO autoPopulatedAt yet (the first-enrich / first-address case). Scoped
  // strictly to the directory sentinel operator so we never touch a real operator's
  // un-populated DRAFT. Without this flag, --from-db keeps its original meaning
  // (already auto-populated homes only).
  const includeUnpopulated = args.includes('--include-unpopulated');
  const facilityFlag = args.indexOf('--facility');
  const onlyFacilityId = facilityFlag !== -1 ? args[facilityFlag + 1] : null;

  if (!csvPath && !fromDb) {
    console.error('Usage: autopopulate-cohort.ts <path/to/websites.csv> [--dry-run|--force] [--resume] [--with-photos] [--photos-only] [--addresses-only] [--from-db] [--include-active] [--include-unpopulated] [--facility <id>]');
    console.error('  (omit the CSV path and pass --from-db to target auto-populated DRAFT homes; add --include-unpopulated to also reach freshly-seeded directory homes)');
    process.exit(1);
  }

  // Addresses-only uses Google Places, not the LLM, so it doesn't need Anthropic.
  if (!addressesOnly && !process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }
  if (addressesOnly && !isPlaceLookupConfigured()) {
    console.error('ERROR: --addresses-only requires GOOGLE_PLACES_API_KEY.');
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
  if (addressesOnly) console.log('=== ADDRESSES-ONLY mode: Google Places street/zip backfill (no scrape / AI / photos) ===');
  if (photosOnly) console.log('=== PHOTOS-ONLY mode: text extraction + text writes skipped, photos appended ===');
  if (withPhotos) console.log(`=== Photo extraction ENABLED ${dryRun ? '(classify only — no download/upload on dry-run)' : '(download + Cloudinary re-host)'} ===`);
  if (includeActive) console.log('=== INCLUDE-ACTIVE: auto-populated homes are targeted regardless of DRAFT/ACTIVE status ===');
  console.log('');

  let rows: CsvRow[];
  if (fromDb) {
    // Derive the cohort from the DB: auto-populated homes (DRAFT only unless
    // --include-active, which also covers already-claimed ACTIVE listings like
    // the real Canterbury Commons). Address-only backfill doesn't need a website;
    // the photo/text paths do, so require a usable URL there. No CSV needed.
    //
    // --include-unpopulated drops the autoPopulatedAt requirement to reach
    // freshly-seeded homes (first enrich / first address backfill), but ONLY within
    // the directory sentinel operator — never a real operator's un-populated DRAFT.
    const DIRECTORY_EMAIL = 'directory-unclaimed@carelinkai.system';
    let directoryOperatorId: string | null = null;
    if (includeUnpopulated) {
      const sentinel = await prisma.user.findUnique({
        where: { email: DIRECTORY_EMAIL },
        select: { operator: { select: { id: true } } },
      });
      if (!sentinel?.operator) {
        console.error(`ERROR: --include-unpopulated needs the directory sentinel operator (${DIRECTORY_EMAIL}), which was not found.`);
        process.exit(1);
      }
      directoryOperatorId = sentinel.operator.id;
      console.log(`=== INCLUDE-UNPOPULATED: also targeting not-yet-enriched DRAFT homes under the directory operator (${directoryOperatorId}) ===`);
    }
    const homes = await prisma.assistedLivingHome.findMany({
      where: {
        ...(includeActive ? {} : { status: HomeStatus.DRAFT }),
        ...(includeUnpopulated
          ? { operatorId: directoryOperatorId! }
          : { autoPopulatedAt: { not: null } }),
        ...(addressesOnly
          ? {}
          : { OR: [{ websiteUrl: { not: null } }, { autoPopulatedFromUrl: { not: null } }] }),
      },
      select: { id: true, name: true, websiteUrl: true, autoPopulatedFromUrl: true },
      orderBy: { autoPopulatedAt: 'asc' },
    });
    rows = homes
      .map((h) => ({
        homeName: h.name,
        homeId: h.id,
        websiteUrl: (h.websiteUrl ?? h.autoPopulatedFromUrl ?? '') as string,
      }))
      .filter((r) => addressesOnly || !!r.websiteUrl);
    console.log(`--from-db: selected ${rows.length} auto-populated home(s)${includeActive ? '' : ' (DRAFT)'} from the database.\n`);
  } else {
    try {
      rows = parseCsv(path.resolve(csvPath!));
    } catch (e: any) {
      console.error(`Failed to parse CSV: ${e.message}`);
      process.exit(1);
    }
  }

  if (onlyFacilityId) {
    rows = rows.filter(r => r.homeId === onlyFacilityId);
    if (rows.length === 0) {
      console.error(`No ${fromDb ? 'DB home' : 'CSV row'} found with homeId=${onlyFacilityId}`);
      process.exit(1);
    }
  }

  if (rows.length === 0) {
    console.error(fromDb ? 'No matching homes found in DB — nothing to do.' : 'CSV contained no rows.');
    process.exit(1);
  }

  console.log(`Processing ${rows.length} facilit${rows.length === 1 ? 'y' : 'ies'}…\n`);

  const results: FacilityResult[] = [];
  let totalDollars = 0;

  for (const row of rows) {
    try {
      const result = await processRow(row, { dryRun, resume, withPhotos, photosOnly, addressesOnly, includeActive });
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
