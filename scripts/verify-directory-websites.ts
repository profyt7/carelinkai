/**
 * verify-directory-websites.ts  (OL-083 follow-up — pre-enrich URL hygiene)
 *
 * The seed's --with-websites discovery stored a website per directory home, but a
 * number cross-matched: a rebranded building returns the CURRENT operator's site
 * (e.g. "Brookdale Stow" → vitaliastow.com), a sibling's site, or (pre-anchor) an
 * out-of-area site. If the text-enrich (autopopulate-cohort.ts) scrapes those, it
 * writes another facility's content onto our listing.
 *
 * This script re-checks each directory home's website via Google Places using the
 * home's (now-anchored) city, and KEEPS a URL only if the matched business name
 * actually corresponds to our facility — comparing name tokens with the city tokens
 * removed, so a match that overlaps only on the city (the rebrand signature) is
 * rejected. Anything that fails is NULLed so the enrich skips it (keeping the seed
 * description) rather than scraping the wrong site.
 *
 * Safety: dry-run by default; only writes with --force. Scoped to the directory
 * sentinel operator. Never touches a real operator's home.
 *
 * Usage:
 *   npx tsx scripts/verify-directory-websites.ts            # preview keep/refresh/null
 *   npx tsx scripts/verify-directory-websites.ts --force    # apply
 *
 * Requires GOOGLE_PLACES_API_KEY.
 */

import { PrismaClient } from '@prisma/client';
import { findWebsiteUrl, isPlaceLookupConfigured, isAggregatorUrl, normalizeForMatch } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

const DIRECTORY_EMAIL = 'directory-unclaimed@carelinkai.system';
const PLACES_DELAY_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Significant (non-city) name-token overlap between our name and the matched name. */
function significantOverlap(homeName: string, matchedName: string, city: string | null): { ratio: number; qn: number } {
  const cityTokens = new Set(
    (city ? normalizeForMatch(city) : '').split(' ').filter(Boolean),
  );
  const q = normalizeForMatch(homeName).split(' ').filter((t) => t && !cityTokens.has(t));
  const c = new Set(normalizeForMatch(matchedName).split(' ').filter((t) => t && !cityTokens.has(t)));
  if (q.length === 0) return { ratio: 1, qn: 0 };
  let hits = 0;
  for (const t of q) if (c.has(t)) hits += 1;
  return { ratio: hits / q.length, qn: q.length };
}

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;
  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE RUN ===');

  if (!isPlaceLookupConfigured()) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY is required.');
    process.exit(1);
  }

  const sentinel = await prisma.user.findUnique({
    where: { email: DIRECTORY_EMAIL },
    select: { operator: { select: { id: true } } },
  });
  if (!sentinel?.operator) {
    console.error(`ERROR: directory sentinel operator (${DIRECTORY_EMAIL}) not found.`);
    process.exit(1);
  }

  // Verify every directory home that currently has a stored website + a city to anchor on.
  const homes = await prisma.assistedLivingHome.findMany({
    where: {
      operatorId: sentinel.operator.id,
      websiteUrl: { not: null },
      address: { is: { city: { not: '' } } },
    },
    select: { id: true, name: true, websiteUrl: true, address: { select: { city: true } } },
    orderBy: { name: 'asc' },
  });
  console.log(`Directory homes with a stored website + city: ${homes.length}\n`);

  let kept = 0;
  let refreshed = 0;
  let nulled = 0;
  const keptRows: string[] = [];
  const refreshedRows: string[] = [];
  const nulledRows: string[] = [];

  for (const h of homes) {
    const city = h.address?.city ?? null;
    const result = await findWebsiteUrl({ name: h.name, city, state: 'OH' });
    await sleep(PLACES_DELAY_MS);

    let decision: 'keep' | 'refresh' | 'null';
    let detail: string;
    if (!result || isAggregatorUrl(result.url)) {
      decision = 'null';
      detail = result ? `aggregator (${result.url})` : 'no confident match';
    } else {
      const ov = significantOverlap(h.name, result.matchedName ?? '', city);
      const nameOk = ov.qn === 0 ? result.confidence === 'HIGH' : ov.ratio >= 0.5;
      const confOk = result.confidence !== 'LOW';
      if (nameOk && confOk) {
        decision = result.url === h.websiteUrl ? 'keep' : 'refresh';
        detail = `${result.confidence}, matched "${result.matchedName}" (overlap ${(ov.ratio * 100).toFixed(0)}%) → ${result.url}`;
      } else {
        decision = 'null';
        detail = `${result.confidence}, matched "${result.matchedName}" (overlap ${(ov.ratio * 100).toFixed(0)}%) — not our facility`;
      }
    }

    if (decision === 'keep') {
      kept++;
      keptRows.push(`  KEEP  ${h.name} (${city}) — ${detail}`);
    } else if (decision === 'refresh') {
      refreshed++;
      refreshedRows.push(`  REFRESH ${h.name} (${city})\n          old: ${h.websiteUrl}\n          new: ${detail}`);
      if (!dryRun) await prisma.assistedLivingHome.update({ where: { id: h.id }, data: { websiteUrl: result!.url } });
    } else {
      nulled++;
      nulledRows.push(`  NULL  ${h.name} (${city}) — was ${h.websiteUrl}\n          reason: ${detail}`);
      if (!dryRun) await prisma.assistedLivingHome.update({ where: { id: h.id }, data: { websiteUrl: null } });
    }
  }

  if (nulledRows.length) {
    console.log(`── NULL (cleared — wrong/unconfirmed site) (${nulled}) ──`);
    nulledRows.forEach((r) => console.log(r));
  }
  if (refreshedRows.length) {
    console.log(`\n── REFRESH (replaced with a better match) (${refreshed}) ──`);
    refreshedRows.forEach((r) => console.log(r));
  }
  if (keptRows.length) {
    console.log(`\n── KEEP (already correct) (${kept}) ──`);
    keptRows.forEach((r) => console.log(r));
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`Kept:     ${kept}`);
  console.log(`Refreshed:${refreshed}`);
  console.log(`Nulled:   ${nulled}`);
  console.log(`Total:    ${homes.length}`);
  console.log('─────────────────────────────────────────────');
  if (dryRun) console.log('\nDRY RUN complete. Re-run with --force to apply.');
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
