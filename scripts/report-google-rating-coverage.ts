/**
 * report-google-rating-coverage.ts  (READ-ONLY — no DB writes)
 *
 * Answers ONE question before we invest in a Google-rating trust badge:
 * how many of the live directory homes actually have a Google rating?
 *
 * For each ACTIVE directory (sentinel-owned) home it runs a single Places API
 * (New) Text Search — `${name} assisted living ${city} ${state}` — reading
 * `rating` + `userRatingCount`. A rating is only counted when the top candidate
 * is a confident name/city match (so a wrong nearby business can't inflate the
 * number). Prints coverage %, rating distribution, and review-count buckets.
 *
 * Cost: ~1 Text Search call per home. The rating fields put this on the Places
 * "Enterprise" SKU (~$35/1000), so ~144 homes ≈ $5 — comfortably inside Google's
 * $200/mo Maps free credit. NOTHING is written to the DB or to Google.
 *
 * Usage (Render shell — has DATABASE_URL + GOOGLE_PLACES_API_KEY):
 *   npx tsx scripts/report-google-rating-coverage.ts            # all ACTIVE directory homes
 *   npx tsx scripts/report-google-rating-coverage.ts --limit 10 # cheap sample
 *   npx tsx scripts/report-google-rating-coverage.ts --all-active # every ACTIVE home, any operator
 */

import { PrismaClient } from '@prisma/client';
import { nameMatchScore } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const REQUEST_TIMEOUT_MS = 10_000;

type PlaceHit = { name: string | null; rating: number | null; count: number | null; matchScore: number; cityMatch: boolean };

async function lookupRating(name: string, city: string | null, state: string | null, apiKey: string): Promise<PlaceHit | null> {
  const textQuery = `${name} assisted living ${[city, state].filter(Boolean).join(' ')}`.trim();
  let res: Response;
  try {
    res = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery, maxResultCount: 5, regionCode: 'US' }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e: any) {
    console.log(`   ⚠ network error for "${name}": ${String(e?.message ?? e)}`);
    return null;
  }
  if (!res.ok) {
    console.log(`   ⚠ HTTP ${res.status} for "${name}"`);
    return null;
  }
  const data = (await res.json()) as { places?: Array<{ displayName?: { text?: string }; formattedAddress?: string; rating?: number; userRatingCount?: number }> };
  const places = Array.isArray(data.places) ? data.places : [];
  if (places.length === 0) return null;

  // Pick the best name match; require a confident match before trusting its rating.
  let best: PlaceHit | null = null;
  for (const p of places) {
    const matchedName = p.displayName?.text ?? null;
    const addr = p.formattedAddress ?? '';
    const score = matchedName ? nameMatchScore(name, matchedName) : 0;
    const cityMatch = !!city && addr.toLowerCase().includes(city.toLowerCase());
    if (!best || score > best.matchScore) {
      best = { name: matchedName, rating: p.rating ?? null, count: p.userRatingCount ?? null, matchScore: score, cityMatch };
    }
  }
  return best;
}

function bucketCount(n: number): string {
  if (n === 0) return '0';
  if (n < 10) return '1-9';
  if (n < 50) return '10-49';
  if (n < 100) return '50-99';
  return '100+';
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('⛔ GOOGLE_PLACES_API_KEY is not set. Run on Render where the key exists.');
    process.exit(1);
  }
  const allActive = process.argv.includes('--all-active');
  const limArg = process.argv.indexOf('--limit');
  const limit = limArg !== -1 ? parseInt(process.argv[limArg + 1] || '0', 10) : 0;

  let operatorFilter = {};
  if (!allActive) {
    const seedUser = await prisma.user.findUnique({ where: { email: DIRECTORY_UNCLAIMED_EMAIL } });
    const seedOperator = seedUser ? await prisma.operator.findUnique({ where: { userId: seedUser.id } }) : null;
    if (!seedOperator) {
      console.error('⛔ directory sentinel operator not found. Use --all-active to scan all ACTIVE homes.');
      process.exit(1);
    }
    operatorFilter = { operatorId: seedOperator.id };
  }

  const homes = await prisma.assistedLivingHome.findMany({
    where: { status: 'ACTIVE', ...operatorFilter },
    select: { id: true, name: true, address: { select: { city: true, state: true } } },
    orderBy: { name: 'asc' },
    ...(limit > 0 ? { take: limit } : {}),
  });

  console.log(`\n=== Google rating coverage (READ-ONLY) ===`);
  console.log(`Scanning ${homes.length} ACTIVE ${allActive ? '' : 'directory '}home(s)…\n`);

  // A rating "counts" only with a confident match: name score ≥ 0.6, or ≥ 0.34 + city match.
  const confident = (h: PlaceHit) => h.matchScore >= 0.6 || (h.matchScore >= 0.34 && h.cityMatch);

  let matched = 0, rated = 0, noCandidate = 0, weakMatch = 0;
  const ratings: number[] = [];
  const counts: number[] = [];
  const countBuckets: Record<string, number> = {};
  const sample: string[] = [];

  for (const h of homes) {
    const hit = await lookupRating(h.name, h.address?.city ?? null, h.address?.state ?? null, apiKey);
    if (!hit) { noCandidate++; sample.push(`  ✗ ${h.name} — no candidate`); continue; }
    if (!confident(hit)) { weakMatch++; sample.push(`  ~ ${h.name} — weak match ("${hit.name}", score ${hit.matchScore.toFixed(2)}) — not counted`); continue; }
    matched++;
    if (hit.rating != null && hit.count != null && hit.count > 0) {
      rated++;
      ratings.push(hit.rating);
      counts.push(hit.count);
      countBuckets[bucketCount(hit.count)] = (countBuckets[bucketCount(hit.count)] ?? 0) + 1;
      sample.push(`  ★ ${h.name} — ${hit.rating}★ (${hit.count} reviews)`);
    } else {
      sample.push(`  ○ ${h.name} — matched "${hit.name}" but no rating`);
    }
  }

  const pct = (n: number) => homes.length ? ((n / homes.length) * 100).toFixed(0) : '0';
  const avg = (xs: number[]) => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
  const median = (xs: number[]) => {
    if (!xs.length) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  console.log('\n──── per-home ────');
  for (const line of sample) console.log(line);

  console.log('\n──── SUMMARY ────');
  console.log(`Homes scanned:          ${homes.length}`);
  console.log(`Confident place match:  ${matched} (${pct(matched)}%)`);
  console.log(`  └─ HAS Google rating: ${rated} (${pct(rated)}%)   ← coverage number`);
  console.log(`Weak/uncertain match:   ${weakMatch} (not counted)`);
  console.log(`No candidate at all:    ${noCandidate}`);
  if (rated > 0) {
    console.log(`\nAmong rated homes:`);
    console.log(`  avg rating:    ${avg(ratings).toFixed(2)}★`);
    console.log(`  median reviews:${median(counts)}`);
    console.log(`  review-count buckets: ${JSON.stringify(countBuckets)}`);
  }
  console.log('\nREAD-ONLY — nothing written to the DB or Google.');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
