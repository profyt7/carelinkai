#!/usr/bin/env npx tsx
/**
 * scripts/seed-symphony-at-mentor.ts
 *
 * One-off warm-lead prep for Symphony at Mentor (Elegance Living / Symphony brand,
 * Mentor, OH — Lake County). Ensures the DRAFT directory listing exists and carries
 * its human-verified address, ODH license number, and public phone, so the operator
 * can be sent a personal branded claim email (claim contact: Jeanne Onuska, Sales &
 * Marketing — jeanne.onuska@symphonyatmentor.com).
 *
 * This script is SEED + ADDRESS ONLY. It does NOT mint the claim link and does NOT
 * send any email. After running it with --force on Render, mint the link with the
 * existing tool (mint-only, read-only):
 *
 *   npx tsx scripts/mint-claim-link.ts \
 *     --email jeanne.onuska@symphonyatmentor.com \
 *     --name "Symphony at Mentor" --city Mentor
 *
 * The automated claim-drip / claim email cron is intentionally disabled — Chris sends
 * a hand-written branded email manually. This is prep-only.
 *
 * WHY A DEDICATED SCRIPT: Symphony at Mentor is already staged in
 * seed-cleveland-batch2.ts (batch 2), so it is normally already present as a DRAFT
 * with NO address (batch 2 does not seed addresses). backfill-verified-addresses.ts
 * keys off hardcoded prod ids we don't have here, so this script resolves the home by
 * name (+ city) instead — and creates it if batch 2 was never run.
 *
 * SAFETY (mirrors backfill-verified-addresses.ts):
 *   - Only ever touches a listing owned by the directory-unclaimed placeholder
 *     operator AND with status=DRAFT — never a claimed/ACTIVE listing.
 *   - Marks the written address fields VERIFIED in preFilledFields (honest provenance:
 *     human-verified against the ODH RCF roster + the community's own listing, not
 *     machine-scraped).
 *   - Dry-run by default; only writes with --force.
 *   - Idempotent: re-running reports "unchanged" for fields already correct.
 *
 * Usage:
 *   npx tsx scripts/seed-symphony-at-mentor.ts            # DRY RUN
 *   npx tsx scripts/seed-symphony-at-mentor.ts --force    # apply
 *
 * Address provenance (two independent sources, 2026-07-09):
 *   1. ODH RCF roster — scripts/data/odh_rcf_cleveland_metro_2026_07_04.csv:
 *      "SYMPHONY AT MENTOR, 8155 MENTOR HILLS DRIVE, MENTOR, LAKE, (440)256-8320,
 *       ACTIVE, 2346R"  (street, city, county, phone, license — no ZIP)
 *   2. seniorhousingnet.com / assistedlivingnearme.net — 8155 Mentor Hills Dr,
 *      Mentor, OH 44060 (supplies the ZIP the roster omits)
 */

import { PrismaClient, CareLevel, HomeStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Shared directory placeholder operator (same account used by the Cleveland seeds).
const SEED_USER_EMAIL = 'directory-unclaimed@carelinkai.system';
const SEED_OPERATOR_NAME = 'CareLinkAI Directory - Unclaimed Listings';

const FACILITY = {
  name: 'Symphony at Mentor',
  city: 'Mentor',
  county: 'Lake',
  street: '8155 Mentor Hills Drive',
  state: 'OH',
  zipCode: '44060',
  phone: '(440) 256-8320',
  odhLicenseNumber: '2346R',
  careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE],
  // Batch-2 convention: no authoritative public ODH bed count → capacity 0 ("unknown").
  capacity: 0,
} as const;

const ADDR_FIELDS = ['street', 'city', 'state', 'zipCode'] as const;

function descriptionFor(): string {
  return (
    'Assisted living and memory-care community in ' + FACILITY.city + ', Ohio (' +
    FACILITY.county + ' County). Unclaimed listing — staged for CareLinkAI Cleveland ' +
    'operator outreach. Address and ODH license verified against public records; ' +
    'capacity, pricing, photos, and amenities are pending the operator claim. The ' +
    'operator can claim this listing to add photos, current pricing, amenities, ' +
    'availability, and verified details.'
  );
}

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — writing ===');
  console.log(`Facility: ${FACILITY.name} — ${FACILITY.street}, ${FACILITY.city}, ${FACILITY.state} ${FACILITY.zipCode} (license ${FACILITY.odhLicenseNumber})\n`);

  // 1. Directory placeholder user + operator (shared with the Cleveland seeds).
  let seedUser;
  if (dryRun) {
    seedUser = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
    console.log('Directory user: ' + (seedUser ? 'exists (' + seedUser.id + ')' : 'WOULD CREATE'));
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
    console.log('Directory user ready: ' + seedUser.id);
  }

  let seedOperator;
  if (dryRun) {
    seedOperator = seedUser
      ? await prisma.operator.findUnique({ where: { userId: seedUser.id } })
      : null;
    console.log('Directory operator: ' + (seedOperator ? 'exists (' + seedOperator.id + ')' : 'WOULD CREATE') + '\n');
  } else {
    if (!seedUser) throw new Error('Directory user was not initialized.');
    seedOperator = await prisma.operator.upsert({
      where: { userId: seedUser.id },
      update: {},
      create: { userId: seedUser.id, companyName: SEED_OPERATOR_NAME },
    });
    console.log('Directory operator ready: ' + seedOperator.id + '\n');
  }

  // 2. Find (or, if batch 2 was never run, create) the DRAFT listing.
  //    Resolve within the directory operator to avoid ever touching a claimed home.
  let home = seedOperator
    ? await prisma.assistedLivingHome.findFirst({
        where: { name: FACILITY.name, operatorId: seedOperator.id },
        select: {
          id: true, name: true, status: true, preFilledFields: true, phone: true,
          odhLicenseNumber: true,
          address: { select: { id: true, street: true, city: true, state: true, zipCode: true } },
        },
      })
    : null;

  if (!home) {
    if (dryRun) {
      console.log(`Listing: WOULD CREATE DRAFT "${FACILITY.name}" (${FACILITY.city})`);
    } else {
      if (!seedOperator) throw new Error('Directory operator was not initialized.');
      const created = await prisma.assistedLivingHome.create({
        data: {
          operatorId: seedOperator.id,
          name: FACILITY.name,
          description: descriptionFor(),
          capacity: FACILITY.capacity,
          status: HomeStatus.DRAFT,
          careLevel: [...FACILITY.careLevel],
        },
        select: {
          id: true, name: true, status: true, preFilledFields: true, phone: true,
          odhLicenseNumber: true,
          address: { select: { id: true, street: true, city: true, state: true, zipCode: true } },
        },
      });
      home = created;
      console.log(`Listing: CREATED DRAFT "${FACILITY.name}" (${created.id})`);
    }
  } else {
    console.log(`Listing: found "${home.name}" (${home.id}) [${home.status}]`);
  }

  // In dry-run with no pre-existing home, there is nothing to inspect further.
  if (!home) {
    console.log('\nDRY RUN complete. Re-run with --force to create + write, then mint (see header).');
    return;
  }

  // 3. Guard: only DRAFT listings under the directory operator are eligible.
  if (home.status !== 'DRAFT') {
    console.log(`\n⚠ SKIP — status=${home.status} (only DRAFT). Not touching a claimed/live listing.`);
    return;
  }

  // 4. Verified address.
  const a = home.address;
  const addrMatches =
    a && a.street === FACILITY.street && a.city === FACILITY.city &&
    a.state === FACILITY.state && a.zipCode === FACILITY.zipCode;
  if (addrMatches) {
    console.log(`  ✓ address unchanged — ${FACILITY.street}, ${FACILITY.city}, ${FACILITY.state} ${FACILITY.zipCode}`);
  } else {
    console.log(`  📍 ${a ? 'UPDATE' : 'CREATE'} address → ${FACILITY.street}, ${FACILITY.city}, ${FACILITY.state} ${FACILITY.zipCode}`);
    if (a && (a.street || a.city)) console.log(`        was: ${a.street ?? '—'}, ${a.city ?? '—'}, ${a.state ?? '—'} ${a.zipCode ?? '—'}`);
    if (!dryRun) {
      if (a) {
        await prisma.address.update({
          where: { id: a.id },
          data: { street: FACILITY.street, city: FACILITY.city, state: FACILITY.state, zipCode: FACILITY.zipCode },
        });
      } else {
        await prisma.address.create({
          data: { homeId: home.id, street: FACILITY.street, city: FACILITY.city, state: FACILITY.state, zipCode: FACILITY.zipCode },
        });
      }
      const prov = (home.preFilledFields as Record<string, string> | null) ?? {};
      for (const f of ADDR_FIELDS) prov[f] = 'VERIFIED';
      await prisma.assistedLivingHome.update({ where: { id: home.id }, data: { preFilledFields: prov } });
    }
  }

  // 5. ODH license number + public phone (only fill when empty/changed).
  const licenseChange = home.odhLicenseNumber !== FACILITY.odhLicenseNumber;
  const phoneChange = home.phone !== FACILITY.phone;
  if (!licenseChange && !phoneChange) {
    console.log(`  ✓ license + phone unchanged — ${FACILITY.odhLicenseNumber} / ${FACILITY.phone}`);
  } else {
    if (licenseChange) console.log(`  🪪 license → ${FACILITY.odhLicenseNumber}${home.odhLicenseNumber ? ` (was ${home.odhLicenseNumber})` : ''}`);
    if (phoneChange) console.log(`  ☎ phone → ${FACILITY.phone}${home.phone ? ` (was ${home.phone})` : ''}`);
    if (!dryRun) {
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: { odhLicenseNumber: FACILITY.odhLicenseNumber, phone: FACILITY.phone },
      });
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'DRY RUN complete — re-run with --force to write.' : 'Done.'}`);
  console.log('Next (mint the claim link — mint-only, no email):');
  console.log('  npx tsx scripts/mint-claim-link.ts \\');
  console.log('    --email jeanne.onuska@symphonyatmentor.com \\');
  console.log('    --name "Symphony at Mentor" --city Mentor');
  console.log('─────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
