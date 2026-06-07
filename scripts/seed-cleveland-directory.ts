/**
 * seed-cleveland-directory.ts
 *
 * Pre-populates the CareLinkAI directory with Tier A Greater-Cleveland
 * assisted-living facilities (50 unique sites) sourced from public Ohio
 * Department of Health licensing records.
 *
 * Listings are created as DRAFT (NOT publicly visible) and attached to a
 * placeholder "CareLinkAI Directory - Unclaimed Listings" operator account.
 * When a real operator signs up, an admin reassigns the listing's operatorId
 * to their account ("claiming" it).
 *
 * Only public-record data is used: facility name, city, licensed bed capacity.
 * No phone, email, pricing, or other non-public detail is seeded.
 *
 * Idempotent: re-running skips facilities already seeded under the directory
 * operator (deduped by name).
 *
 * Usage:
 *   npx tsx scripts/seed-cleveland-directory.ts --dry-run        # preview only
 *   npx tsx scripts/seed-cleveland-directory.ts                  # write to DB
 *   npx tsx scripts/seed-cleveland-directory.ts --with-websites  # also auto-discover
 *                                                                # website URLs via
 *                                                                # Google Places
 *   (--with-websites requires GOOGLE_PLACES_API_KEY)
 *
 * Source: ChrisOS vault 03_Execution/CARELINKAI_OPERATOR_OUTREACH_CLEVELAND.md
 * Risk register: Risk 2 (two-sided marketplace cold start).
 */

import { PrismaClient, CareLevel, HomeStatus, UserRole } from '@prisma/client';
import { findWebsiteUrl, isPlaceLookupConfigured } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

// Be polite to the Places API between lookups.
const PLACES_DELAY_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Look up and persist a home's website URL via Google Places. Stores only
 * HIGH/MEDIUM-confidence matches so low-quality guesses don't pollute the data.
 * Returns a short status string for logging.
 */
async function discoverAndStoreWebsite(
  homeId: string,
  name: string,
  city: string,
): Promise<string> {
  const result = await findWebsiteUrl({ name, city, state: 'OH' });
  await sleep(PLACES_DELAY_MS);
  if (!result) return 'no match';
  if (result.confidence === 'LOW') return `low-confidence (skipped): ${result.url}`;
  await prisma.assistedLivingHome.update({
    where: { id: homeId },
    data: { websiteUrl: result.url },
  });
  return `${result.confidence}: ${result.url}`;
}

const SEED_USER_EMAIL = 'directory-unclaimed@carelinkai.system';
const SEED_OPERATOR_NAME = 'CareLinkAI Directory - Unclaimed Listings';

interface SeedFacility {
  name: string;
  city: string;
  beds: number;
  county: string;
}

// 50 unique Tier A facilities. The 2 "(small license)" duplicate licenses at
// shared sites (Ohman Family Living at Briar, Inn at the Pines) are
// intentionally excluded - one listing per physical facility.
const TIER_A: SeedFacility[] = [
  // Cuyahoga (23)
  { name: 'Slovene Home for the Aged', city: 'Cleveland', beds: 12, county: 'Cuyahoga' },
  { name: 'Welsh Home for the Aged', city: 'Rocky River', beds: 12, county: 'Cuyahoga' },
  { name: 'Windsor House Senior Living', city: 'Brook Park', beds: 12, county: 'Cuyahoga' },
  { name: 'Avenue at Lyndhurst', city: 'Lyndhurst', beds: 16, county: 'Cuyahoga' },
  { name: 'Cedar Living at Mayfield Heights', city: 'Mayfield Heights', beds: 18, county: 'Cuyahoga' },
  { name: 'Singleton Health Care Center', city: 'Cleveland', beds: 22, county: 'Cuyahoga' },
  { name: 'East Park Memory Care Facility', city: 'Brook Park', beds: 30, county: 'Cuyahoga' },
  { name: 'Judson Manor', city: 'Cleveland', beds: 30, county: 'Cuyahoga' },
  { name: 'Pleasant Lake Villa', city: 'Parma', beds: 30, county: 'Cuyahoga' },
  { name: 'St Joseph Center', city: 'Cleveland', beds: 30, county: 'Cuyahoga' },
  { name: 'Brookdale Westlake Village', city: 'Westlake', beds: 32, county: 'Cuyahoga' },
  { name: 'Resorts at Daughters of Miriam', city: 'Beachwood', beds: 33, county: 'Cuyahoga' },
  { name: 'Parkside Villa', city: 'Middleburg Heights', beds: 35, county: 'Cuyahoga' },
  { name: 'Holy Spirit Ridge', city: 'Garfield Heights', beds: 36, county: 'Cuyahoga' },
  { name: 'Lakewood Health Care Center', city: 'Lakewood', beds: 36, county: 'Cuyahoga' },
  { name: 'Ancora at Mount Alverna Village', city: 'Parma', beds: 42, county: 'Cuyahoga' },
  { name: 'Concord Reserve (Paragon Building)', city: 'Westlake', beds: 43, county: 'Cuyahoga' },
  { name: 'Mount Alverna Village', city: 'Parma', beds: 45, county: 'Cuyahoga' },
  { name: 'Algart Health Care', city: 'Cleveland', beds: 47, county: 'Cuyahoga' },
  { name: 'Village of the Falls', city: 'Olmsted Falls', beds: 47, county: 'Cuyahoga' },
  { name: "O'Neill Healthcare Lakewood", city: 'Cleveland', beds: 54, county: 'Cuyahoga' },
  { name: 'Hilltop Village Assisted Living', city: 'Euclid', beds: 57, county: 'Cuyahoga' },
  { name: 'Arden Courts (Parma)', city: 'Parma', beds: 59, county: 'Cuyahoga' },
  // Geauga (7)
  { name: 'Autumn Hills Healthcare Community', city: 'Huntsburg', beds: 5, county: 'Geauga' },
  { name: 'Thistle House Senior Living', city: 'Chardon', beds: 22, county: 'Geauga' },
  { name: 'Ohman Family Living at Briar', city: 'Middlefield', beds: 40, county: 'Geauga' },
  { name: 'Inn at the Pines', city: 'Hiram', beds: 42, county: 'Geauga' },
  { name: 'South Franklin Circle', city: 'Chagrin Falls', beds: 44, county: 'Geauga' },
  { name: 'The Residence of Chardon', city: 'Chardon', beds: 52, county: 'Geauga' },
  { name: 'Ohman Family Living at Holly', city: 'Newbury', beds: 58, county: 'Geauga' },
  // Lake (4)
  { name: 'Divine Living of Madison', city: 'Madison', beds: 16, county: 'Lake' },
  { name: 'Bileci, LLC', city: 'Painesville', beds: 35, county: 'Lake' },
  { name: "Governor's Pointe", city: 'Mentor', beds: 44, county: 'Lake' },
  { name: 'Ohio Living Breckenridge Village', city: 'Willoughby', beds: 54, county: 'Lake' },
  // Lorain (4)
  { name: 'Amherst Manor', city: 'Amherst', beds: 36, county: 'Lorain' },
  { name: 'Elms Retirement Village', city: 'Wellington', beds: 36, county: 'Lorain' },
  { name: "O'Neill Healthcare North Ridgeville", city: 'North Ridgeville', beds: 44, county: 'Lorain' },
  { name: 'The Gardens of French Creek at Avon Oaks', city: 'Avon', beds: 48, county: 'Lorain' },
  // Medina (2)
  { name: 'Wadsworth Pointe', city: 'Wadsworth', beds: 7, county: 'Medina' },
  { name: 'Samaritan Villa', city: 'Medina', beds: 30, county: 'Medina' },
  // Portage (1)
  { name: 'Alpine House of Ravenna', city: 'Ravenna', beds: 36, county: 'Portage' },
  // Summit (9)
  { name: 'Camella at Copley', city: 'Copley', beds: 12, county: 'Summit' },
  { name: 'Arbors Landing Assisted Living', city: 'Fairlawn', beds: 18, county: 'Summit' },
  { name: 'Concordia at Sumner', city: 'Copley', beds: 44, county: 'Summit' },
  { name: 'Cuyahoga Falls Danbury Woods', city: 'Cuyahoga Falls', beds: 46, county: 'Summit' },
  { name: 'The Elms Assisted Living', city: 'Hudson', beds: 49, county: 'Summit' },
  { name: 'Pleasant Pointe Assisted Living', city: 'Barberton', beds: 54, county: 'Summit' },
  { name: 'Regina Health Center', city: 'Richfield', beds: 54, county: 'Summit' },
  { name: 'Arden Courts (Bath)', city: 'Akron', beds: 56, county: 'Summit' },
  { name: 'Canterbury Commons', city: 'Twinsburg', beds: 56, county: 'Summit' },
];

function descriptionFor(f: SeedFacility): string {
  return (
    'Residential care / assisted living community in ' + f.city + ', Ohio. ' +
    'Unclaimed listing - basic information sourced from public Ohio Department ' +
    'of Health licensing records (licensed capacity: ' + f.beds + ' beds, ' +
    f.county + ' County). The operator can claim this listing to add photos, ' +
    'current pricing, amenities, availability, and verified details.'
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const withWebsites = process.argv.includes('--with-websites');
  console.log(dryRun ? '=== DRY RUN - no writes ===' : '=== LIVE RUN ===');
  if (withWebsites) {
    if (!isPlaceLookupConfigured()) {
      console.error('ERROR: --with-websites requires GOOGLE_PLACES_API_KEY to be set.');
      process.exit(1);
    }
    console.log('=== Website discovery ENABLED (Google Places) ===');
  }
  console.log('Tier A facilities to seed: ' + TIER_A.length + '\n');

  // 1. Seed User (system placeholder account; no password - cannot be logged in)
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
  for (const f of TIER_A) {
    const existing = seedOperator
      ? await prisma.assistedLivingHome.findFirst({
          where: { name: f.name, operatorId: seedOperator.id },
        })
      : null;
    if (existing) {
      // Backfill website for already-seeded homes that don't have one yet.
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
        'WOULD CREATE:   ' + f.name + ' (' + f.city + ', ' + f.beds + ' beds)' +
        (withWebsites ? ' [+website lookup]' : ''),
      );
      created++;
      continue;
    }
    const home = await prisma.assistedLivingHome.create({
      data: {
        operatorId: seedOperator.id,
        name: f.name,
        description: descriptionFor(f),
        capacity: f.beds,
        status: HomeStatus.DRAFT,
        careLevel: [CareLevel.ASSISTED],
      },
    });
    let websiteNote = '';
    if (withWebsites) {
      const status = await discoverAndStoreWebsite(home.id, f.name, f.city);
      websiteNote = ' — website ' + status;
    }
    console.log('CREATED:        ' + f.name + ' (' + f.city + ', ' + f.beds + ' beds)' + websiteNote);
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
