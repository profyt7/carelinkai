/**
 * hold-crossmatch-homes.ts  (OL-083 Part B cleanup)
 *
 * The Google Places address backfill (autopopulate-cohort.ts --addresses-only)
 * filled a handful of directory homes with a SAME-CITY sibling's address — the
 * city/state guard can't catch these because the match is in the right city, just
 * the wrong building. This script reverts those specific homes to DRAFT and clears
 * the suspect street/zip (keeping the city/state anchor), so they drop off the
 * public directory until a correct address is set (or an operator claims them).
 *
 * The IDs below come from the 2026-06-23 metro publish run. Each is annotated with
 * the wrong address it received and why. Verify with --dry-run before --force.
 *
 * Safety: dry-run by default; only writes with --force. Idempotent (re-running a
 * home already DRAFT with no street is a no-op).
 *
 * Usage:
 *   npx tsx scripts/hold-crossmatch-homes.ts            # preview (default)
 *   npx tsx scripts/hold-crossmatch-homes.ts --force    # revert to DRAFT + clear street/zip
 */

import { PrismaClient, HomeStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DIRECTORY_EMAIL = 'directory-unclaimed@carelinkai.system';

interface Suspect {
  id: string;
  name: string;
  reason: string;
}

// Same-city cross-matches from the 2026-06-23 metro address backfill.
const SUSPECTS: Suspect[] = [
  { id: 'cmqqrk9s8000grlmbxmmwyeo8', name: 'Brookdale Gardens at Westlake', reason: "got Brookdale Westlake Village's address (28550 Westlake Village Dr)" },
  { id: 'cmqqrld040056rlmb4iock17a', name: 'Homestead I', reason: "got Homestead II's address (60 Wood St)" },
  { id: 'cmqqrlker0062rlmbwi0mpuvs', name: 'StoryPoint Medina West', reason: "got StoryPoint Medina East's address (122 Medina Rd)" },
  { id: 'cmqqrlhn9005qrlmbdh0rhweq', name: 'Elmcroft of Medina', reason: 'matched "Life Care Center of Medina" (2400 Columbia Rd)' },
  { id: 'cmqqrkv3z0030rlmbqgfhcr3n', name: 'Gardens of Western Reserve at Cuyahoga Falls', reason: 'matched the hospice arm (3792 State Rd)' },
];

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;
  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE RUN ===');

  const sentinel = await prisma.user.findUnique({
    where: { email: DIRECTORY_EMAIL },
    select: { operator: { select: { id: true } } },
  });
  if (!sentinel?.operator) {
    console.error(`ERROR: directory sentinel operator (${DIRECTORY_EMAIL}) not found.`);
    process.exit(1);
  }

  let reverted = 0;
  let skipped = 0;
  for (const s of SUSPECTS) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: s.id },
      select: {
        id: true,
        name: true,
        status: true,
        operatorId: true,
        address: { select: { id: true, street: true, city: true, state: true, zipCode: true } },
      },
    });
    if (!home) {
      console.log(`  ⚠ NOT FOUND: ${s.name} (${s.id}) — skipping`);
      skipped++;
      continue;
    }
    // Safety: only ever touch the directory sentinel's own homes.
    if (home.operatorId !== sentinel.operator.id) {
      console.log(`  ⚠ SKIP (not a directory home): ${home.name} (${s.id})`);
      skipped++;
      continue;
    }
    if (home.name !== s.name) {
      console.log(`  ⚠ SKIP (name mismatch: DB="${home.name}" expected="${s.name}") — ${s.id}`);
      skipped++;
      continue;
    }

    console.log(`  HOLD: "${home.name}" — ${s.reason}`);
    console.log(`        was status=${home.status}, address="${home.address?.street ?? '—'}, ${home.address?.city ?? '—'} ${home.address?.zipCode ?? ''}"`);
    if (!dryRun) {
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: { status: HomeStatus.DRAFT },
      });
      if (home.address) {
        // Clear the suspect street/zip; keep the city/state anchor for a future retry.
        await prisma.address.update({
          where: { id: home.address.id },
          data: { street: '', zipCode: '' },
        });
      }
    }
    reverted++;
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would revert' : 'Reverted'} to DRAFT (street/zip cleared): ${reverted}`);
  console.log(`Skipped: ${skipped}`);
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
