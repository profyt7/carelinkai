/**
 * fix-westlake-pointe-rebrand.ts  (targeted rebrand + address correction)
 *
 * "Brookdale Gardens at Westlake" in our DB is a STALE BRAND. The building at
 * 27569 Detroit Rd, Westlake OH was rebranded to "Westlake Pointe Senior Living"
 * (confirmed: directories list it as "Westlake Pointe, formerly Brookdale Gardens
 * at Westlake"). Our row also stored the WRONG street (28550 Westlake Village Dr —
 * the *other* Brookdale community), which is what caused the shared Google rating.
 *
 * This corrects the whole record to the rebranded facility:
 *   - name      → Westlake Pointe Senior Living
 *   - address   → 27569 Detroit Rd, Westlake OH 44145 (+ re-geocode from Places)
 *   - rating    → the Westlake Pointe Google place (its own rating/count/place id)
 *   - description → de-staled (old brand name token replaced) if present
 *
 * Guards: only acts while the row is still named "Brookdale Gardens at Westlake"
 * and unclaimed; aborts WITHOUT writing unless the Places match is confidently the
 * Detroit-Rd "Westlake Pointe" place (name + street 27569 + a different place id
 * than Westlake Village). NOT a dedup — the two Brookdale Westlake buildings stay.
 *
 * Dry-run by default. Run on Render (DATABASE_URL + GOOGLE_PLACES_API_KEY).
 *   npx tsx scripts/fix-westlake-pointe-rebrand.ts            # DRY RUN
 *   npx tsx scripts/fix-westlake-pointe-rebrand.ts --force     # apply
 */

import { PrismaClient } from '@prisma/client';
import { nameMatchScore } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const OLD_NAME = 'Brookdale Gardens at Westlake';
const NEW_NAME = 'Westlake Pointe Senior Living';
const CORRECT = { street: '27569 Detroit Rd', city: 'Westlake', state: 'OH', zip: '44145' };
const EXPECT_MATCH_TOKEN = 'westlake pointe'; // matched Google place must be the rebranded one
const VILLAGE_PLACE_ID = 'ChIJgfxQFzOSMIgRVf_I4oRReWE'; // the OTHER Brookdale Westlake building

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
    where: { name: OLD_NAME, status: 'ACTIVE' },
    select: {
      id: true, name: true, description: true, googlePlaceId: true, googleRating: true, googleRatingCount: true,
      address: { select: { id: true, street: true, city: true, state: true, zipCode: true } },
      operator: { select: { user: { select: { email: true } } } },
    },
  });

  console.log(`\n=== Fix Westlake Pointe rebrand (was "${OLD_NAME}") — ${force ? 'LIVE (--force)' : 'DRY RUN'} ===\n`);
  if (!home) { console.log(`✓ No ACTIVE "${OLD_NAME}" row — likely already renamed. Nothing to do.`); return; }

  const ownerEmail = (home.operator?.user?.email ?? '').toLowerCase();
  if (ownerEmail !== DIRECTORY_UNCLAIMED_EMAIL) {
    console.log(`⚠ "${home.name}" is CLAIMED — SKIP (operator manages its own listing).`); return;
  }

  console.log(`current: "${home.name}" · ${home.address?.street ?? '(none)'}, ${home.address?.city ?? ''} ${home.address?.state ?? ''} · ${home.googleRating ?? '—'}★ (${home.googleRatingCount ?? 0}) [${home.googlePlaceId ?? 'none'}]`);
  if (!home.address) { console.log('⚠ no Address row — manual fix needed.'); return; }

  const hit = await placesLookup(NEW_NAME, CORRECT.street, CORRECT.city, CORRECT.state, apiKey);
  if (!hit?.id) { console.log('✗ no Places candidate — aborting (no write).'); return; }
  const matchedName = (hit.displayName?.text ?? '');
  const nameOk = matchedName.toLowerCase().includes(EXPECT_MATCH_TOKEN);
  const addrOk = (hit.formattedAddress ?? '').includes('27569');
  const distinctOk = hit.id !== VILLAGE_PLACE_ID;

  console.log(`\nrebrand → "${NEW_NAME}" · ${CORRECT.street}, ${CORRECT.city} ${CORRECT.state} ${CORRECT.zip}`);
  console.log(`Places match: "${matchedName}" — ${hit.rating ?? '—'}★ (${hit.userRatingCount ?? 0}) [${hit.id}]`);
  console.log(`matched address: ${hit.formattedAddress}`);
  console.log(`  matched name is "Westlake Pointe": ${nameOk ? 'YES ✓' : 'NO ⚠'}`);
  console.log(`  street-number 27569 confirmed:   ${addrOk ? 'YES ✓' : 'NO ⚠'}`);
  console.log(`  distinct from Westlake Village:   ${distinctOk ? 'YES ✓' : 'NO ⚠'}`);

  if (!nameOk || !addrOk || !distinctOk) {
    console.log('\n⚠ Could not confidently confirm the rebranded Detroit-Rd place — NOT writing. Verify manually.');
    return;
  }

  const newDescription = home.description?.includes(OLD_NAME)
    ? home.description.split(OLD_NAME).join(NEW_NAME)
    : null;
  if (newDescription) console.log(`  description: de-staling old brand name → "${NEW_NAME}"`);

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
        name: NEW_NAME,
        ...(newDescription ? { description: newDescription } : {}),
        googlePlaceId: hit.id,
        googleRating: hit.rating ?? null,
        googleRatingCount: hit.userRatingCount ?? null,
        googleRatingUpdatedAt: new Date(),
      },
    });
    console.log('\n✓ Applied: renamed to Westlake Pointe, address corrected + re-geocoded, rating re-matched.');
  } else {
    console.log('\nDRY RUN — re-run with --force to apply the rebrand + address + rating fix.');
  }
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
