/**
 * backfill-google-ratings.ts
 *
 * Populate the Google Places aggregate rating fields used by the "See reviews on
 * Google" trust badge: googleRating, googleRatingCount, googlePlaceId,
 * googleRatingUpdatedAt. ONE Places (New) Text Search per home; writes only on a
 * confident name/city match (so a wrong nearby business never lands a rating).
 *
 * Stores rating + count + place id ONLY. NEVER stores Google review TEXT (Maps
 * Platform ToS). Idempotent / refreshable: re-running updates the numbers.
 *
 * Dry-run by default. Cost ≈ ~$5 for ~144 homes (Places "Enterprise" SKU), inside
 * Google's $200/mo Maps free credit.
 *
 * Usage (Render shell — DATABASE_URL + GOOGLE_PLACES_API_KEY):
 *   npx tsx scripts/backfill-google-ratings.ts             # DRY RUN
 *   npx tsx scripts/backfill-google-ratings.ts --force      # write
 *   npx tsx scripts/backfill-google-ratings.ts --limit 10 --force
 *   npx tsx scripts/backfill-google-ratings.ts --all-active --force  # every ACTIVE home
 */

import { PrismaClient } from '@prisma/client';
import { nameMatchScore } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const REQUEST_TIMEOUT_MS = 10_000;

type Hit = { placeId: string | null; name: string | null; rating: number | null; count: number | null; matchScore: number; cityMatch: boolean };

async function lookup(name: string, city: string | null, state: string | null, apiKey: string): Promise<Hit | null> {
  const textQuery = `${name} assisted living ${[city, state].filter(Boolean).join(' ')}`.trim();
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
    console.log(`   ⚠ network error for "${name}": ${String(e?.message ?? e)}`);
    return null;
  }
  if (!res.ok) { console.log(`   ⚠ HTTP ${res.status} for "${name}"`); return null; }
  const data = (await res.json()) as { places?: Array<{ id?: string; displayName?: { text?: string }; formattedAddress?: string; rating?: number; userRatingCount?: number }> };
  const places = Array.isArray(data.places) ? data.places : [];
  if (places.length === 0) return null;

  let best: Hit | null = null;
  for (const p of places) {
    const matchedName = p.displayName?.text ?? null;
    const addr = p.formattedAddress ?? '';
    const score = matchedName ? nameMatchScore(name, matchedName) : 0;
    const cityMatch = !!city && addr.toLowerCase().includes(city.toLowerCase());
    if (!best || score > best.matchScore) {
      best = { placeId: p.id ?? null, name: matchedName, rating: p.rating ?? null, count: p.userRatingCount ?? null, matchScore: score, cityMatch };
    }
  }
  return best;
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) { console.error('⛔ GOOGLE_PLACES_API_KEY not set. Run on Render.'); process.exit(1); }
  const force = process.argv.includes('--force');
  const allActive = process.argv.includes('--all-active');
  const limArg = process.argv.indexOf('--limit');
  const limit = limArg !== -1 ? parseInt(process.argv[limArg + 1] || '0', 10) : 0;

  let operatorFilter = {};
  if (!allActive) {
    const seedUser = await prisma.user.findUnique({ where: { email: DIRECTORY_UNCLAIMED_EMAIL } });
    const seedOperator = seedUser ? await prisma.operator.findUnique({ where: { userId: seedUser.id } }) : null;
    if (!seedOperator) { console.error('⛔ directory sentinel operator not found. Use --all-active.'); process.exit(1); }
    operatorFilter = { operatorId: seedOperator.id };
  }

  const homes = await prisma.assistedLivingHome.findMany({
    where: { status: 'ACTIVE', ...operatorFilter },
    select: { id: true, name: true, address: { select: { city: true, state: true } } },
    orderBy: { name: 'asc' },
    ...(limit > 0 ? { take: limit } : {}),
  });

  console.log(`\n=== Backfill Google ratings — ${force ? 'LIVE (--force)' : 'DRY RUN'} ===`);
  console.log(`Scanning ${homes.length} ACTIVE ${allActive ? '' : 'directory '}home(s)…\n`);

  const confident = (h: Hit) => h.matchScore >= 0.6 || (h.matchScore >= 0.34 && h.cityMatch);
  let written = 0, rated = 0, weak = 0, none = 0, cleared = 0;

  for (const h of homes) {
    const hit = await lookup(h.name, h.address?.city ?? null, h.address?.state ?? null, apiKey);
    if (!hit) { none++; console.log(`  ✗ ${h.name} — no candidate`); continue; }
    if (!confident(hit)) { weak++; console.log(`  ~ ${h.name} — weak match ("${hit.name}", ${hit.matchScore.toFixed(2)}) — skip`); continue; }

    if (hit.rating != null && hit.count != null && hit.count > 0 && hit.placeId) {
      rated++;
      console.log(`  ★ ${h.name} — ${hit.rating}★ (${hit.count}) [${hit.placeId}]`);
      if (force) {
        await prisma.assistedLivingHome.update({
          where: { id: h.id },
          data: {
            googleRating: hit.rating,
            googleRatingCount: hit.count,
            googlePlaceId: hit.placeId,
            googleRatingUpdatedAt: new Date(),
          },
        });
        written++;
      }
    } else {
      // Matched but Google has no rating → clear any stale value so we never show a wrong number.
      console.log(`  ○ ${h.name} — matched "${hit.name}" but no rating`);
      if (force) {
        await prisma.assistedLivingHome.update({
          where: { id: h.id },
          data: { googleRating: null, googleRatingCount: null, googleRatingUpdatedAt: new Date(), googlePlaceId: hit.placeId ?? undefined },
        });
        cleared++;
      }
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`Rated matches: ${rated} | weak: ${weak} | no candidate: ${none}`);
  console.log(force ? `Written: ${written} ratings, ${cleared} cleared` : 'DRY RUN — re-run with --force to write.');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
