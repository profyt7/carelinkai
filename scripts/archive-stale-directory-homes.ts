#!/usr/bin/env npx tsx
/**
 * scripts/archive-stale-directory-homes.ts
 *
 * OL-088 + OL-091 — retire two directory rows that should never reach families:
 *
 *   1. OL-088 — "Altercare at Saint Joseph Center" (id cmqqrk7gu0006rlmb2nfqnrvn).
 *      CLOSED since Nov 2019 (Crain's + Cleveland Jewish News). It was excluded from
 *      the Batch B rebrand PR (#612) and today stays out of the public directory ONLY
 *      because it has no street/zip (the publish gate holds it). That's incidental — if
 *      anyone backfills an address it would publish a defunct facility. Make it explicit.
 *
 *   2. OL-091 — duplicate "Ohman Family Living at Briar" (id cmp71kmsl001ilpiovrsvq7zu).
 *      An older DRAFT "(pending)" seed row with no city/address that duplicates the
 *      ACTIVE Middlefield listing (id cmqqrllu60068rlmb2s9y5s9m, the Batch B rebrand of
 *      "Briar Hill Health Care Residence"). The distinct Ohman properties — "Briarcliff
 *      Manor" and "Holly Hill"/"Ohman Family Living at Holly" — are intentionally NOT
 *      touched here.
 *
 * Both are set to status=INACTIVE (the retired/archived status — same one Villa Serena
 * uses). The public directory renders only ACTIVE homes and `publish-directory-homes.ts`
 * only promotes DRAFT→ACTIVE, so INACTIVE is permanently non-publishable + invisible,
 * yet fully reversible (no hard delete — preserves any relations/history).
 *
 * SAFETY:
 *   - Hardcoded ids, each guarded by expected name AND expected current status.
 *   - Dry-run by default; only writes with --force.
 *   - Idempotent: a home already INACTIVE → "unchanged".
 *   - Refuses to touch an ACTIVE home (guard against archiving a live listing by mistake).
 *
 * Usage:
 *   npx tsx scripts/archive-stale-directory-homes.ts            # DRY RUN
 *   npx tsx scripts/archive-stale-directory-homes.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Target = {
  id: string;
  expectName: string;
  /** Statuses we're willing to archive from (never ACTIVE). */
  fromStatuses: Array<'DRAFT' | 'PENDING_REVIEW' | 'SUSPENDED'>;
  reason: string;
};

const TARGETS: Target[] = [
  {
    id: 'cmqqrk7gu0006rlmb2nfqnrvn',
    expectName: 'Altercare at Saint Joseph Center',
    fromStatuses: ['DRAFT'],
    reason: 'OL-088 — facility CLOSED since Nov 2019 (Crain\'s + Cleveland Jewish News)',
  },
  {
    id: 'cmp71kmsl001ilpiovrsvq7zu',
    expectName: 'Ohman Family Living at Briar',
    fromStatuses: ['DRAFT'],
    reason: 'OL-091 — duplicate of ACTIVE Middlefield listing cmqqrllu60068rlmb2s9y5s9m',
  },
];

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — archiving stale directory homes ===');
  console.log(`Archive targets: ${TARGETS.length}\n`);

  let willWrite = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const t of TARGETS) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: t.id },
      select: { id: true, name: true, status: true },
    });

    if (!home) {
      console.log(`  ⚠ SKIP "${t.expectName}" (${t.id}) — not found`);
      skipped++;
      continue;
    }
    if (home.name !== t.expectName) {
      console.log(`  ⚠ SKIP (${t.id}) — name drift: expected "${t.expectName}", found "${home.name}"; not touching`);
      skipped++;
      continue;
    }
    if (home.status === 'INACTIVE') {
      console.log(`  ✓ unchanged "${home.name}" — already INACTIVE`);
      unchanged++;
      continue;
    }
    if (!t.fromStatuses.includes(home.status as Target['fromStatuses'][number])) {
      console.log(`  ⚠ SKIP "${home.name}" (${t.id}) — status=${home.status} not in [${t.fromStatuses.join(', ')}] (refusing to archive)`);
      skipped++;
      continue;
    }

    console.log(`  📦 ARCHIVE "${home.name}" — ${home.status} → INACTIVE`);
    console.log(`        ${t.reason}`);
    willWrite++;

    if (!dryRun) {
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: { status: 'INACTIVE' },
      });
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would archive' : 'Archived'}: ${willWrite}`);
  console.log(`Unchanged:    ${unchanged}`);
  console.log(`Skipped:      ${skipped}`);
  console.log('─────────────────────────────────────────────');

  if (dryRun) console.log('\nDRY RUN complete. Re-run with --force to write.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
