/**
 * fix-conflated-google-ratings.ts  (targeted correction)
 *
 * backfill-google-ratings.ts searches Places by "name + city + state" only. For
 * two same-brand buildings in one city (e.g. the two Brookdale communities in
 * Westlake), Google returns the SAME top place for both queries, so one listing
 * ends up borrowing the other's rating + place id.
 *
 * This script re-matches the named homes using a STREET-QUALIFIED query
 * ("name + street + city + state") and only writes when the matched Google place
 * actually contains the home's street number — so each building gets its own
 * rating. It also reports whether the targets resolved to DISTINCT places
 * (confirming they're separate facilities) or the same one (possible true dup —
 * do NOT dedup without manual confirmation).
 *
 * Dry-run by default. READ-ONLY until --force.
 *
 * Usage (Render shell — DATABASE_URL + GOOGLE_PLACES_API_KEY):
 *   npx tsx scripts/fix-conflated-google-ratings.ts            # DRY RUN (verify)
 *   npx tsx scripts/fix-conflated-google-ratings.ts --force     # write corrections
 *   npx tsx scripts/fix-conflated-google-ratings.ts --name "Brookdale"  # custom name filter
 */

import { PrismaClient } from '@prisma/client';
import { nameMatchScore } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const REQUEST_TIMEOUT_MS = 10_000;

/** Default targets: the conflated Brookdale Westlake pair (two distinct buildings). */
const DEFAULT_TARGET_NAMES = ['Brookdale Gardens at Westlake', 'Brookdale Westlake Village'];

type PlaceHit = { placeId: string | null; name: string | null; address: string; rating: number | null; count: number | null; matchScore: number };

async function streetQualifiedLookup(name: string, street: string | null, city: string | null, state: string | null, apiKey: string): Promise<PlaceHit | null> {
  const textQuery = `${name} ${street ?? ''} ${[city, state].filter(Boolean).join(' ')}`.replace(/\s+/g, ' ').trim();
  let res: Response;
  try {
    res = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery, maxResultCount: 5, regionCode: 'US' }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e: any) {
    console.log(`   ⚠ network error: ${String(e?.message ?? e)}`);
    return null;
  }
  if (!res.ok) { console.log(`   ⚠ HTTP ${res.status}`); return null; }
  const data = (await res.json()) as { places?: Array<{ id?: string; displayName?: { text?: string }; formattedAddress?: string; rating?: number; userRatingCount?: number }> };
  const places = Array.isArray(data.places) ? data.places : [];
  if (places.length === 0) return null;

  let best: PlaceHit | null = null;
  for (const p of places) {
    const matchedName = p.displayName?.text ?? null;
    const score = matchedName ? nameMatchScore(name, matchedName) : 0;
    if (!best || score > best.matchScore) {
      best = { placeId: p.id ?? null, name: matchedName, address: p.formattedAddress ?? '', rating: p.rating ?? null, count: p.userRatingCount ?? null, matchScore: score };
    }
  }
  return best;
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) { console.error('⛔ GOOGLE_PLACES_API_KEY not set. Run on Render.'); process.exit(1); }
  const force = process.argv.includes('--force');
  const nameArg = process.argv.indexOf('--name');
  const nameFilter = nameArg !== -1 ? process.argv[nameArg + 1] : null;

  const where = nameFilter
    ? { status: 'ACTIVE' as const, name: { contains: nameFilter, mode: 'insensitive' as const } }
    : { status: 'ACTIVE' as const, name: { in: DEFAULT_TARGET_NAMES } };

  const homes = await prisma.assistedLivingHome.findMany({
    where,
    select: {
      id: true, name: true, googlePlaceId: true, googleRating: true, googleRatingCount: true,
      address: { select: { street: true, city: true, state: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`\n=== Fix conflated Google ratings — ${force ? 'LIVE (--force)' : 'DRY RUN'} ===`);
  console.log(`Targets: ${homes.length} home(s)\n`);

  const results: { name: string; newPlaceId: string | null }[] = [];

  for (const h of homes) {
    const street = h.address?.street ?? null;
    const streetNum = (street?.match(/^\d+/) ?? [])[0] ?? null;
    const hit = await streetQualifiedLookup(h.name, street, h.address?.city ?? null, h.address?.state ?? null, apiKey);

    console.log(`──────── ${h.name} ────────`);
    console.log(`  stored address: ${street ?? '(none)'}, ${h.address?.city ?? '?'} ${h.address?.state ?? ''}`);
    console.log(`  current: ${h.googleRating ?? '—'}★ (${h.googleRatingCount ?? 0}) [${h.googlePlaceId ?? 'none'}]`);

    if (!hit || !hit.placeId) {
      console.log('  ✗ no Places candidate — leaving as-is');
      results.push({ name: h.name, newPlaceId: h.googlePlaceId });
      continue;
    }

    const addressConfirmed = streetNum ? hit.address.includes(streetNum) : false;
    console.log(`  matched: "${hit.name}" — ${hit.rating ?? '—'}★ (${hit.count ?? 0}) [${hit.placeId}]`);
    console.log(`  matched address: ${hit.address}`);
    console.log(`  street-number confirmed: ${addressConfirmed ? 'YES ✓' : 'NO ⚠'}  (looking for "${streetNum ?? '?'}")`);

    if (!addressConfirmed) {
      console.log('  ⚠ could not confirm this is the right building by street number — NOT writing. Verify manually.');
      results.push({ name: h.name, newPlaceId: h.googlePlaceId });
      continue;
    }

    const changed = hit.placeId !== h.googlePlaceId;
    console.log(changed ? `  → CORRECTION: ${h.googlePlaceId ?? 'none'} → ${hit.placeId}` : '  → already correct (no change)');
    results.push({ name: h.name, newPlaceId: hit.placeId });

    if (force && changed) {
      await prisma.assistedLivingHome.update({
        where: { id: h.id },
        data: {
          googlePlaceId: hit.placeId,
          googleRating: hit.rating,
          googleRatingCount: hit.count,
          googleRatingUpdatedAt: new Date(),
        },
      });
      console.log('  ✓ written');
    }
  }

  // Separateness check across the targets.
  const distinct = new Set(results.map((r) => r.newPlaceId).filter(Boolean));
  console.log('\n─────────────────────────────────────────────');
  if (results.length >= 2) {
    if (distinct.size === results.length) {
      console.log('✓ Targets resolved to DISTINCT Google places — confirmed separate facilities, each now shows its own rating.');
    } else {
      console.log('⚠ Targets still share a place id — they may be the SAME building, OR street confirmation failed. Do NOT dedup without manual confirmation.');
    }
  }
  if (!force) console.log('DRY RUN — re-run with --force to write corrections.');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
