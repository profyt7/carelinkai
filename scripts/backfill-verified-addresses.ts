#!/usr/bin/env npx tsx
/**
 * scripts/backfill-verified-addresses.ts
 *
 * OL-059/OL-083 — fill the missing street/zip on directory DRAFT homes that the
 * Google Places auto-backfill (autopopulate-cohort.ts --addresses-only) could NOT
 * safely resolve. For this NE-Ohio cohort the Places path was unsafe: many seeded
 * brands are closed/rebranded, so Places returned a *different* facility at/near the
 * site (e.g. Elmcroft of Medina → "Life Care Center of Medina"), and several correct
 * matches were rejected on a city-label technicality (Google calling a suburb
 * "Cleveland"). So these addresses were HUMAN-VERIFIED against the facility's own
 * site + a second independent source (Ohio DOH licensure / Caring.com / A Place for
 * Mom) and are hardcoded here with provenance.
 *
 * SCOPE — Batch A only: facilities confirmed OPEN and still operating under their
 * CURRENT seeded name. Rebranded facilities (name changed) are intentionally NOT
 * here — they need a name update + content review, handled separately.
 *
 * SAFETY:
 *   - Hardcoded ids; each target guarded by an expected current name AND must be
 *     status=DRAFT (never touches a claimed/ACTIVE listing).
 *   - Sets the full verified address (street/city/state/zip) — this deliberately
 *     corrects wrong seeded cities (e.g. Bainbridge → Chagrin Falls; Elyria →
 *     Willoughby), which the fill-only Places path could not do.
 *   - Marks the touched address fields VERIFIED in preFilledFields (honest
 *     provenance: human-verified, not machine-scraped).
 *   - Dry-run by default; only writes with --force.
 *   - Idempotent: a home whose address already matches the target is reported
 *     "unchanged" and skipped.
 *
 * Usage:
 *   npx tsx scripts/backfill-verified-addresses.ts            # DRY RUN
 *   npx tsx scripts/backfill-verified-addresses.ts --force    # apply
 *
 * After --force, re-run scripts/publish-directory-homes.ts to take the now-complete
 * homes live.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Target = {
  id: string;
  /** Current seeded name(s) the home must still have (guards against drift). */
  expectNames: string[];
  street: string;
  city: string;
  state: string;
  zipCode: string;
  /** Authoritative source the address was verified against. */
  source: string;
};

// Batch A — OPEN, current-name, two-source-verified (2026-06-24).
const TARGETS: Target[] = [
  {
    id: 'cmqqrkj50001krlmbx4qkh8jp',
    expectNames: ['Light of Hearts Villa'],
    street: '283 Union St', city: 'Bedford', state: 'OH', zipCode: '44146',
    source: 'sistersofcharityhealth.org/health-care/light-of-hearts-villa',
  },
  {
    id: 'cmp71kmrh000klpiouf5sm5rk',
    expectNames: ['Pleasant Lake Villa'],
    street: '7260 Ridge Rd', city: 'Parma', state: 'OH', zipCode: '44129',
    source: 'pleasantlakevilla.com (Legacy Health Services)',
  },
  {
    id: 'cmqqrkjm9001mrlmb9umruvps',
    expectNames: ['Marymount Place'],
    street: '5100 Marymount Village Dr', city: 'Garfield Heights', state: 'OH', zipCode: '44125',
    source: 'marymounthcs.org/assisted-living-facility-garfield-heights-oh',
  },
  {
    id: 'cmp71kmsp001mlpiot2a118ng',
    expectNames: ['South Franklin Circle'],
    street: '16600 Warren Ct', city: 'Chagrin Falls', state: 'OH', zipCode: '44023',
    source: 'judsonsmartliving.org/south-franklin-circle (postal city Chagrin Falls, not Bainbridge)',
  },
  {
    id: 'cmqqrkp57002arlmbvqnyq71f',
    expectNames: ['The Woodlands of Shaker Heights'],
    street: '16333 Chagrin Blvd', city: 'Shaker Heights', state: 'OH', zipCode: '44120',
    source: 'aplaceformom.com/community/the-woodlands-by-heritage-retirement-communities',
  },
  {
    id: 'cmqqrln04006erlmbpae67m2d',
    expectNames: ['Maplewood at Heather Hill'],
    street: '12350 Bass Lake Rd', city: 'Chardon', state: 'OH', zipCode: '44024',
    source: 'whereyoulivematters.org/find-a-community/maplewood-at-chardon',
  },
  {
    id: 'cmqqrl7iu004irlmbfb8b7onx',
    expectNames: ['Avenue Assisted Living'],
    street: '500 Community Dr', city: 'Avon Lake', state: 'OH', zipCode: '44012',
    source: 'sprengerhealthcare.com/facility/avenue-assisted-living',
  },
  {
    id: 'cmqqrlfp8005irlmb6hnte9bh',
    expectNames: ['Van Gorder Manor'],
    street: '37819 Euclid Ave', city: 'Willoughby', state: 'OH', zipCode: '44094',
    source: 'apartments.com + A Place for Mom + Seniorly (Willoughby, not Elyria)',
  },
  {
    id: 'cmqqrli42005srlmb0rd3pdrk',
    expectNames: ['Inn at Coal Ridge'],
    street: '1300 Coalridge Pkwy', city: 'Wadsworth', state: 'OH', zipCode: '44281',
    source: 'innatcoalridge.com',
  },
  {
    id: 'cmqqrlnf5006grlmbkc457lxs',
    expectNames: ['Pines at Brooks House'],
    street: '18122 Claridon Troy Rd', city: 'Hiram', state: 'OH', zipCode: '44234',
    source: 'aplaceformom.com/community/the-pines-at-brooks-house (Hiram 44234, not Burton)',
  },
  {
    id: 'cmqqrk6w70004rlmbkayh2vk2',
    expectNames: ['A.M. McGregor Home'],
    street: '14900 Private Dr', city: 'East Cleveland', state: 'OH', zipCode: '44112',
    source: 'case.edu/ech/articles/a/m-mcgregor-home + SeniorLivingGuide',
  },
];

const ADDR_FIELDS = ['street', 'city', 'state', 'zipCode'] as const;

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — writing verified addresses ===');
  console.log(`Batch A: ${TARGETS.length} OPEN, current-name, two-source-verified homes\n`);

  let willWrite = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const t of TARGETS) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: t.id },
      select: {
        id: true, name: true, status: true, preFilledFields: true,
        address: { select: { id: true, street: true, city: true, state: true, zipCode: true } },
      },
    });

    if (!home) {
      console.log(`  ⚠ SKIP "${t.expectNames[0]}" (${t.id}) — not found`);
      skipped++;
      continue;
    }
    if (!t.expectNames.includes(home.name)) {
      console.log(`  ⚠ SKIP "${home.name}" (${t.id}) — name drift (expected ${t.expectNames.map((n) => `"${n}"`).join(' / ')}); not touching`);
      skipped++;
      continue;
    }
    if (home.status !== 'DRAFT') {
      console.log(`  ⚠ SKIP "${home.name}" (${t.id}) — status=${home.status} (only DRAFT)`);
      skipped++;
      continue;
    }

    const a = home.address;
    const matches = a && a.street === t.street && a.city === t.city && a.state === t.state && a.zipCode === t.zipCode;
    if (matches) {
      console.log(`  ✓ unchanged "${home.name}" — ${t.street}, ${t.city}, ${t.state} ${t.zipCode}`);
      unchanged++;
      continue;
    }

    const verb = a ? 'UPDATE' : 'CREATE';
    console.log(`  📍 ${verb} "${home.name}" → ${t.street}, ${t.city}, ${t.state} ${t.zipCode}`);
    if (a && (a.street || a.city)) {
      console.log(`        was: ${a.street ?? '—'}, ${a.city ?? '—'}, ${a.state ?? '—'} ${a.zipCode ?? '—'}`);
    }
    console.log(`        src: ${t.source}`);
    willWrite++;

    if (!dryRun) {
      if (a) {
        await prisma.address.update({
          where: { id: a.id },
          data: { street: t.street, city: t.city, state: t.state, zipCode: t.zipCode },
        });
      } else {
        await prisma.address.create({
          data: { homeId: home.id, street: t.street, city: t.city, state: t.state, zipCode: t.zipCode },
        });
      }
      const prov = (home.preFilledFields as Record<string, string> | null) ?? {};
      for (const f of ADDR_FIELDS) prov[f] = 'VERIFIED';
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: { preFilledFields: prov },
      });
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would write' : 'Wrote'}: ${willWrite}`);
  console.log(`Unchanged:  ${unchanged}`);
  console.log(`Skipped:    ${skipped}`);
  console.log('─────────────────────────────────────────────');
  if (dryRun) console.log('\nDRY RUN complete. Re-run with --force to write, then run publish-directory-homes.ts.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
