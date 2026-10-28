/**
 * seed-cleveland-batch2.ts
 *
 * Seeds the Batch 2 Greater-Cleveland assisted-living candidate pool (15
 * web-researched facilities) as DRAFT listings, attached to the same
 * placeholder "CareLinkAI Directory - Unclaimed Listings" operator used by
 * seed-cleveland-directory.ts.
 *
 * These 15 were curated by the outreach research pass (Cowork) to widen supply
 * into Greater-Cleveland suburbs NOT covered by batch 1 (Beachwood, Solon,
 * Westlake, Rocky River, Strongsville, Mayfield Heights, Mentor, Independence,
 * Brecksville). None overlap batch 1, and none were in the original Tier-A DOH
 * seed (scripts/seed-cleveland-directory.ts) — so all 15 are new rows.
 *
 * IMPORTANT — capacity:
 *   Unlike the Tier-A DOH seed (which carries licensed bed counts from public
 *   records), these chain/community candidates have NO authoritative public bed
 *   count, so capacity is seeded as 0 ("unknown — verify"). The PR #545 enrich
 *   pipeline (autopopulate-cohort.ts) does NOT write capacity, so it stays 0
 *   until set from the Cowork research pass or an operator claim. Do not treat
 *   capacity 0 as real.
 *
 * Listings are DRAFT (NOT publicly visible). careLevel here is a starting hint
 * from the research notes; the enrich pipeline refines it from the website.
 *
 * Idempotent: re-running skips facilities already seeded under the directory
 * operator (deduped by name).
 *
 * Usage:
 *   npx tsx scripts/seed-cleveland-batch2.ts --dry-run        # preview only
 *   npx tsx scripts/seed-cleveland-batch2.ts                  # write to DB
 *   npx tsx scripts/seed-cleveland-batch2.ts --with-websites  # also auto-discover
 *                                                             # website URLs via
 *                                                             # Google Places
 *   (--with-websites requires GOOGLE_PLACES_API_KEY)
 *
 * Source: ChrisOS vault 03_Execution/cleveland_outreach/batch2_supply_prep.md
 * Risk register: Risk 2 (two-sided marketplace cold start).
 */

import { PrismaClient, CareLevel, HomeStatus, UserRole } from '@prisma/client';
import { findWebsiteUrl, isAnyLookupConfigured } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

// Be polite to the Places API between lookups.
const PLACES_DELAY_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEED_USER_EMAIL = 'directory-unclaimed@carelinkai.system';
const SEED_OPERATOR_NAME = 'CareLinkAI Directory - Unclaimed Listings';

interface SeedFacility {
  name: string;
  city: string;
  county: string;
  /** Starting-hint care levels from the research notes; enrich refines from the website. */
  careLevel: CareLevel[];
  /** Optional public-record note (e.g. a known street) carried into the description. */
  note?: string;
}

const IL_AL_MC: CareLevel[] = [CareLevel.INDEPENDENT, CareLevel.ASSISTED, CareLevel.MEMORY_CARE];
const AL_MC: CareLevel[] = [CareLevel.ASSISTED, CareLevel.MEMORY_CARE];
const IL_AL: CareLevel[] = [CareLevel.INDEPENDENT, CareLevel.ASSISTED];
const AL: CareLevel[] = [CareLevel.ASSISTED];

// 15 web-researched batch-2 candidates (counties are accurate Ohio geography;
// all Cuyahoga except Symphony at Mentor, which is Lake).
const BATCH_2: SeedFacility[] = [
  { name: 'Rose Senior Living Beachwood', city: 'Beachwood', county: 'Cuyahoga', careLevel: IL_AL_MC, note: 'Atria/Rose' },
  { name: 'Windsor Heights', city: 'Beachwood', county: 'Cuyahoga', careLevel: AL_MC },
  { name: 'Beachwood Commons', city: 'Beachwood', county: 'Cuyahoga', careLevel: AL_MC, note: 'New Perspective' },
  { name: 'Solon Pointe', city: 'Solon', county: 'Cuyahoga', careLevel: IL_AL_MC },
  { name: 'Vitalia Active Adult - Solon', city: 'Solon', county: 'Cuyahoga', careLevel: IL_AL, note: 'Vitalia/Omni — Active Adult (verify AL vs IL-only)' },
  { name: 'Fairmont of Westlake', city: 'Westlake', county: 'Cuyahoga', careLevel: AL_MC },
  { name: 'Bickford of Rocky River', city: 'Rocky River', county: 'Cuyahoga', careLevel: AL_MC, note: '21600 Detroit Rd, 44116' },
  { name: 'Rocky River Village', city: 'Rocky River', county: 'Cuyahoga', careLevel: AL_MC },
  { name: 'Embassy of Rockport', city: 'Rocky River', county: 'Cuyahoga', careLevel: IL_AL_MC, note: '20375 Center Ridge Rd' },
  { name: 'Vitalia Strongsville', city: 'Strongsville', county: 'Cuyahoga', careLevel: AL_MC, note: 'Vitalia/Omni' },
  { name: 'Anthology of Mayfield Heights', city: 'Mayfield Heights', county: 'Cuyahoga', careLevel: IL_AL_MC, note: 'Anthology' },
  { name: 'Villa Serena', city: 'Mayfield Heights', county: 'Cuyahoga', careLevel: AL, note: '6-acre campus' },
  { name: 'Symphony at Mentor', city: 'Mentor', county: 'Lake', careLevel: AL, note: 'near Lake West/Hillcrest' },
  { name: 'Vista Springs Ravinia Estate', city: 'Independence', county: 'Cuyahoga', careLevel: AL_MC, note: 'Vista Springs — AL/MC/respite' },
  { name: 'Jennings at Brecksville', city: 'Brecksville', county: 'Cuyahoga', careLevel: IL_AL, note: 'Jennings (faith-based)' },
];

function descriptionFor(f: SeedFacility): string {
  return (
    'Assisted living community in ' + f.city + ', Ohio (' + f.county + ' County). ' +
    'Unclaimed listing — staged for the CareLinkAI Cleveland operator outreach ' +
    '(batch 2). Capacity, address, pricing, and amenities are pending the enrich ' +
    'pass and operator claim. The operator can claim this listing to add photos, ' +
    'current pricing, amenities, availability, and verified details.' +
    (f.note ? ' (Research note: ' + f.note + ')' : '')
  );
}

/**
 * Look up and persist a home's website URL via Google Places. Stores only
 * HIGH/MEDIUM-confidence matches so low-quality guesses don't pollute the data.
 */
async function discoverAndStoreWebsite(
  homeId: string,
  name: string,
  city: string,
): Promise<string> {
  const result = await findWebsiteUrl({ name, city, state: 'OH' });
  await sleep(PLACES_DELAY_MS);
  if (!result) return 'no match';
  const via = result.source === 'web_search' ? 'web' : 'places';
  if (result.confidence === 'LOW') return `low-confidence (skipped, ${via}): ${result.url}`;
  await prisma.assistedLivingHome.update({
    where: { id: homeId },
    data: { websiteUrl: result.url },
  });
  return `${result.confidence} via ${via}: ${result.url}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const withWebsites = process.argv.includes('--with-websites');
  console.log(dryRun ? '=== DRY RUN - no writes ===' : '=== LIVE RUN ===');
  if (withWebsites) {
    if (!isAnyLookupConfigured()) {
      console.error(
        'ERROR: --with-websites requires GOOGLE_PLACES_API_KEY (Places) and/or ' +
        'GOOGLE_SEARCH_ENGINE_ID + an API key (web-search fallback).',
      );
      process.exit(1);
    }
    console.log('=== Website discovery ENABLED (Google Places + web-search fallback) ===');
  }
  console.log('Batch 2 facilities to seed: ' + BATCH_2.length + '\n');

  // 1. Seed User (system placeholder; shared with seed-cleveland-directory.ts)
  let seedUser;
  if (dryRun) {
    seedUser = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
    console.log('Seed user: ' + (seedUser ? 'exists (' + seedUser.id + ')' : 'WOULD CREATE'));
  } else {
    seedUser = await prisma.user.upsert({
      where: { email: SEED_USER_EMAIL },
      update: {},
      create: {
        email: SEED_USER_EMAIL,
        firstName: 'CareLinkAI',
        lastName: 'Directory (Unclaimed)',
        role: UserRole.OPERATOR,
      },
    });
    console.log('Seed user ready: ' + seedUser.id);
  }

  // 2. Seed Operator
  let seedOperator;
  if (dryRun) {
    seedOperator = seedUser
      ? await prisma.operator.findUnique({ where: { userId: seedUser.id } })
      : null;
    console.log('Seed operator: ' + (seedOperator ? 'exists (' + seedOperator.id + ')' : 'WOULD CREATE') + '\n');
  } else {
    if (!seedUser) throw new Error('Seed user was not initialized.');
    seedOperator = await prisma.operator.upsert({
      where: { userId: seedUser.id },
      update: {},
      create: { userId: seedUser.id, companyName: SEED_OPERATOR_NAME },
    });
    console.log('Seed operator ready: ' + seedOperator.id + '\n');
  }

  // 3. Seed the facilities as DRAFT listings
  let created = 0;
  let skipped = 0;
  for (const f of BATCH_2) {
    const existing = seedOperator
      ? await prisma.assistedLivingHome.findFirst({
          where: { name: f.name, operatorId: seedOperator.id },
        })
      : null;
    if (existing) {
      if (withWebsites && !dryRun && !existing.websiteUrl) {
        const status = await discoverAndStoreWebsite(existing.id, f.name, f.city);
        console.log('SKIP  (exists): ' + f.name + ' — website ' + status);
      } else {
        console.log('SKIP  (exists): ' + f.name);
      }
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(
        'WOULD CREATE:   ' + f.name + ' (' + f.city + ')' +
        (withWebsites ? ' [+website lookup]' : ''),
      );
      created++;
      continue;
    }
    if (!seedOperator) throw new Error('Seed operator was not initialized.');
    const home = await prisma.assistedLivingHome.create({
      data: {
        operatorId: seedOperator.id,
        name: f.name,
        description: descriptionFor(f),
        capacity: 0, // unknown at seed time — verify in research/claim (see header note)
        status: HomeStatus.DRAFT,
        careLevel: f.careLevel,
      },
    });
    let websiteNote = '';
    if (withWebsites) {
      const status = await discoverAndStoreWebsite(home.id, f.name, f.city);
      websiteNote = ' — website ' + status;
    }
    console.log('CREATED:        ' + f.name + ' (' + f.city + ')' + websiteNote);
    created++;
  }

  console.log('\n=== Summary ===');
  console.log((dryRun ? 'Would create' : 'Created') + ': ' + created);
  console.log('Skipped (already seeded): ' + skipped);

  if (!dryRun && seedOperator) {
    const total = await prisma.assistedLivingHome.count({
      where: { operatorId: seedOperator.id },
    });
    const nonDraft = await prisma.assistedLivingHome.count({
      where: { operatorId: seedOperator.id, status: { not: HomeStatus.DRAFT } },
    });
    console.log('Total listings under directory operator: ' + total);
    console.log('Non-DRAFT (publicly visible) under directory operator: ' + nonDraft + ' (expected 0)');
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
