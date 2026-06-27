/**
 * fix-brookdale-gardens-address.ts  (targeted data correction)
 *
 * ROOT CAUSE of the "Brookdale Westlake" Google-rating conflation: the DB stored
 * the WRONG street for "Brookdale Gardens at Westlake" — it had Brookdale Westlake
 * Village's address (28550 Westlake Village Dr) instead of its real address
 * (27569 Detroit Rd). So both listings street-matched to the same Google place.
 *
 * Web + founder confirmed they are TWO DISTINCT buildings:
 *   - Brookdale Gardens at Westlake — 27569 Detroit Rd  (assisted living only)
 *   - Brookdale Westlake Village    — 28550 Westlake Village Dr (CCRC)  ← already correct
 *
 * This script corrects Gardens' street/zip, re-geocodes + re-matches its Google
 * rating from the corrected address (street-qualified), and verifies the result is
 * a DIFFERENT Google place than Westlake Village. It does NOT dedup. Guarded so it
 * only acts while the address is still the wrong (Westlake Village) one.
 *
 * Dry-run by default. Run on Render (DATABASE_URL + GOOGLE_PLACES_API_KEY).
 *   npx tsx scripts/fix-brookdale-gardens-address.ts            # DRY RUN
 *   npx tsx scripts/fix-brookdale-gardens-address.ts --force     # apply
 */

import { PrismaClient } from '@prisma/client';
import { nameMatchScore } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const GARDENS_NAME = 'Brookdale Gardens at Westlake';
const CORRECT = { street: '27569 Detroit Rd', city: 'Westlake', state: 'OH', zip: '44145' };
/** We only correct while the stored street is still the wrong (Westlake Village) one. */
const WRONG_STREET_TOKEN = 'westlake village';
const VILLAGE_PLACE_ID = 'ChIJgfxQFzOSMIgRVf_I4oRReWE'; // the shared (Westlake Village) place id

async function placesLookup(name: string, street: string, city: string, state: string, apiKey: string) {
  const textQuery = `${name} ${street} ${city} ${state}`.replace(/\s+/g, ' ').trim();
  const res = await fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location',
    },
    body: JSON.stringify({ textQuery, maxResultCount: 5, regionCode: 'US' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) { console.log(`   ⚠ Places HTTP ${res.status}`); return null; }
  const data = (await res.json()) as { places?: Array<any> };
  const places = Array.isArray(data.places) ? data.places : [];
  let best: any = null;
  for (const p of places) {
    const score = p.displayName?.text ? nameMatchScore(name, p.displayName.text) : 0;
    if (!best || score > best.score) best = { ...p, score };
  }
  return best;
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) { console.error('⛔ GOOGLE_PLACES_API_KEY not set. Run on Render.'); process.exit(1); }
  const force = process.argv.includes('--force');

  const home = await prisma.assistedLivingHome.findFirst({
    where: { name: GARDENS_NAME, status: 'ACTIVE' },
    select: {
      id: true, name: true, googlePlaceId: true, googleRating: true, googleRatingCount: true,
      address: { select: { id: true, street: true, city: true, state: true, zipCode: true } },
      operator: { select: { user: { select: { email: true } } } },
    },
  });

  console.log(`\n=== Fix Brookdale Gardens at Westlake address — ${force ? 'LIVE (--force)' : 'DRY RUN'} ===\n`);
  if (!home) { console.error(`⛔ "${GARDENS_NAME}" not found (ACTIVE).`); process.exit(1); }

  const ownerEmail = (home.operator?.user?.email ?? '').toLowerCase();
  if (ownerEmail !== DIRECTORY_UNCLAIMED_EMAIL) {
    console.log(`⚠ "${home.name}" is CLAIMED — SKIP (operator manages its own address).`); return;
  }

  console.log(`current address: ${home.address?.street ?? '(none)'}, ${home.address?.city ?? ''} ${home.address?.state ?? ''} ${home.address?.zipCode ?? ''}`);
  console.log(`current rating:  ${home.googleRating ?? '—'}★ (${home.googleRatingCount ?? 0}) [${home.googlePlaceId ?? 'none'}]`);

  if (!home.address) { console.log('⚠ no Address row — manual fix needed.'); return; }
  if (!(home.address.street ?? '').toLowerCase().includes(WRONG_STREET_TOKEN)) {
    console.log(`✓ street is no longer the wrong (Westlake Village) one — looks already corrected. Nothing to do.`);
    return;
  }

  const hit = await placesLookup(GARDENS_NAME, CORRECT.street, CORRECT.city, CORRECT.state, apiKey);
  if (!hit?.id) { console.log('✗ no Places candidate for the corrected address — aborting (do not write).'); return; }
  const addrConfirmed = (hit.formattedAddress ?? '').includes('27569');
  console.log(`\ncorrected address → ${CORRECT.street}, ${CORRECT.city} ${CORRECT.state} ${CORRECT.zip}`);
  console.log(`Places match: "${hit.displayName?.text}" — ${hit.rating ?? '—'}★ (${hit.userRatingCount ?? 0}) [${hit.id}]`);
  console.log(`matched address: ${hit.formattedAddress}`);
  console.log(`street-number (27569) confirmed: ${addrConfirmed ? 'YES ✓' : 'NO ⚠'}`);
  console.log(`distinct from Westlake Village place id: ${hit.id !== VILLAGE_PLACE_ID ? 'YES ✓' : 'NO ⚠ (still same — aborting)'}`);

  if (!addrConfirmed || hit.id === VILLAGE_PLACE_ID) {
    console.log('\n⚠ Could not confidently resolve the distinct Detroit Rd place — NOT writing. Verify manually.');
    return;
  }

  if (force) {
    await prisma.address.update({
      where: { id: home.address.id },
      data: {
        street: CORRECT.street, city: CORRECT.city, state: CORRECT.state, zipCode: CORRECT.zip,
        ...(hit.location ? { latitude: hit.location.latitude, longitude: hit.location.longitude } : {}),
      },
    });
    await prisma.assistedLivingHome.update({
      where: { id: home.id },
      data: {
        googlePlaceId: hit.id,
        googleRating: hit.rating ?? null,
        googleRatingCount: hit.userRatingCount ?? null,
        googleRatingUpdatedAt: new Date(),
      },
    });
    console.log('\n✓ Applied: address corrected + rating re-matched to the distinct Detroit Rd place.');
  } else {
    console.log('\nDRY RUN — re-run with --force to write the corrected address + rating.');
  }
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
