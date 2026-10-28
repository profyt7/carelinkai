/**
 * cleanup-batch2.ts
 *
 * Targeted, guarded data-ops for the batch-2 Cleveland cohort + OL-068 test-data
 * purge. Every action is hardcoded to an explicit homeId and guarded so it can
 * only touch DRAFT, unclaimed, zero-activity listings. Default is a DRY RUN.
 *
 *   1. RENAME      cmql0xbpm… "Anthology of Mayfield Heights"
 *                  → "The Ashton at Mayfield Heights" (Sonida rebrand, ~2024).
 *   2. SOFT-DELETE cmql0xbpo… "Villa Serena" → status INACTIVE (HUD 202
 *                  independent-living — out of the AL outreach scope). Reversible.
 *   3. PURGE       two leftover test homes (hard delete; cascades to child rows):
 *                    - cmptv5deb… "Test Senior Living Cleveland"
 *                    - cmpv5rg35… "Chris Senior Care Home"  (extra-verify: a real
 *                      listing must NOT be deleted — guarded + flagged below).
 *
 * SAFETY: a home is only deleted/soft-deleted when it is status=DRAFT AND has
 * zero "activity" (inquiries, residents, bookings, tours, placements, waitlist,
 * shifts, reviews, favorites, match results/feedback). Anything else is SKIPPED
 * and flagged — we never cascade-delete real data. Photos/address are seed
 * artifacts and do not block.
 *
 * Usage:
 *   npx tsx scripts/cleanup-batch2.ts            # DRY RUN — shows what would change
 *   npx tsx scripts/cleanup-batch2.ts --force    # apply
 */

import { PrismaClient, HomeStatus } from '@prisma/client';

const prisma = new PrismaClient();

const RENAME = {
  id: 'cmql0xbpm000or7jc7oqp9ume',
  expectFrom: 'Anthology of Mayfield Heights',
  to: 'The Ashton at Mayfield Heights',
};

const SOFT_DELETE = {
  id: 'cmql0xbpo000qr7jchn7baaun',
  expectName: 'Villa Serena',
  reason: 'HUD 202 independent-living — out of AL outreach scope',
};

const PURGE: { id: string; expectName: string }[] = [
  { id: 'cmptv5deb000mptco1mzrgrgm', expectName: 'Test Senior Living Cleveland' },
  { id: 'cmpv5rg35000ilxcs17f7q58k', expectName: 'Chris Senior Care Home' },
];

// Relations that indicate the listing has been used by real people. Any of
// these > 0 blocks a delete/soft-delete.
const ACTIVITY_SELECT = {
  inquiries: true,
  residents: true,
  bookings: true,
  tourRequests: true,
  tourSlots: true,
  placementRequests: true,
  waitlistEntries: true,
  caregiverShifts: true,
  shiftNeeds: true,
  reviews: true,
  favorites: true,
  matchResults: true,
  matchFeedback: true,
} as const;

type HomeWithCounts = NonNullable<Awaited<ReturnType<typeof loadHome>>>;

function loadHome(id: string) {
  return prisma.assistedLivingHome.findUnique({
    where: { id },
    include: {
      operator: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
      _count: { select: { ...ACTIVITY_SELECT, photos: true } },
    },
  });
}

function activityTotal(home: HomeWithCounts): number {
  const c = home._count as Record<string, number>;
  return Object.keys(ACTIVITY_SELECT).reduce((sum, k) => sum + (c[k] ?? 0), 0);
}

function describe(home: HomeWithCounts): string {
  const c = home._count as Record<string, number>;
  const activity = activityTotal(home);
  const nonZero = Object.keys(ACTIVITY_SELECT)
    .filter((k) => (c[k] ?? 0) > 0)
    .map((k) => `${k}=${c[k]}`)
    .join(', ');
  const op = home.operator?.user?.email ?? home.operator?.companyName ?? '(no operator)';
  return (
    `status=${home.status}, operator=${op}, photos=${c.photos ?? 0}, ` +
    `activity=${activity}${nonZero ? ` (${nonZero})` : ''}, created=${home.createdAt.toISOString().slice(0, 10)}`
  );
}

async function main() {
  const force = process.argv.includes('--force');
  console.log(force ? '=== LIVE RUN (--force) ===\n' : '=== DRY RUN — no writes (pass --force to apply) ===\n');

  let applied = 0;
  let skipped = 0;

  // ── 1. RENAME ──────────────────────────────────────────────────────────────
  console.log('1) RENAME');
  const r = await loadHome(RENAME.id);
  if (!r) {
    console.log(`   ✗ ${RENAME.id} not found — SKIP`);
    skipped++;
  } else if (r.name === RENAME.to) {
    console.log(`   – already "${RENAME.to}" — idempotent, nothing to do`);
  } else if (r.name !== RENAME.expectFrom) {
    console.log(`   ⚠ name is "${r.name}", expected "${RENAME.expectFrom}" — SKIP (verify manually)`);
    skipped++;
  } else {
    console.log(`   "${r.name}" → "${RENAME.to}"  [${describe(r)}]`);
    if (force) {
      await prisma.assistedLivingHome.update({ where: { id: RENAME.id }, data: { name: RENAME.to } });
      console.log('   ✓ renamed');
      applied++;
    } else {
      console.log('   (dry run — would rename)');
    }
  }

  // ── 2. SOFT-DELETE (status → INACTIVE) ──────────────────────────────────────
  console.log('\n2) SOFT-DELETE (status → INACTIVE)');
  const v = await loadHome(SOFT_DELETE.id);
  if (!v) {
    console.log(`   ✗ ${SOFT_DELETE.id} not found — SKIP`);
    skipped++;
  } else if (v.name !== SOFT_DELETE.expectName) {
    console.log(`   ⚠ name is "${v.name}", expected "${SOFT_DELETE.expectName}" — SKIP (verify manually)`);
    skipped++;
  } else if (v.status === HomeStatus.INACTIVE) {
    console.log(`   – already INACTIVE — idempotent, nothing to do`);
  } else if (v.status !== HomeStatus.DRAFT) {
    console.log(`   ⚠ status is ${v.status} (not DRAFT) — SKIP (verify manually)  [${describe(v)}]`);
    skipped++;
  } else if (activityTotal(v) > 0) {
    console.log(`   ⚠ has activity — SKIP (do not retire a used listing)  [${describe(v)}]`);
    skipped++;
  } else {
    console.log(`   "${v.name}" → INACTIVE — ${SOFT_DELETE.reason}  [${describe(v)}]`);
    if (force) {
      await prisma.assistedLivingHome.update({ where: { id: SOFT_DELETE.id }, data: { status: HomeStatus.INACTIVE } });
      console.log('   ✓ retired (INACTIVE)');
      applied++;
    } else {
      console.log('   (dry run — would set INACTIVE)');
    }
  }

  // ── 3. PURGE (hard delete; cascades to child rows) ──────────────────────────
  console.log('\n3) PURGE test homes (hard delete)');
  for (const target of PURGE) {
    const h = await loadHome(target.id);
    if (!h) {
      console.log(`   – ${target.id} ("${target.expectName}") not found — already gone, SKIP`);
      continue;
    }
    if (h.name !== target.expectName) {
      console.log(`   ⚠ ${target.id}: name is "${h.name}", expected "${target.expectName}" — SKIP (verify manually)`);
      skipped++;
      continue;
    }
    if (h.status !== HomeStatus.DRAFT) {
      console.log(`   ⚠ "${h.name}": status ${h.status} (not DRAFT) — SKIP, likely a real listing  [${describe(h)}]`);
      skipped++;
      continue;
    }
    if (activityTotal(h) > 0) {
      console.log(`   ⚠ "${h.name}": has real activity — SKIP, do NOT delete  [${describe(h)}]`);
      skipped++;
      continue;
    }
    console.log(`   "${h.name}" — DELETE  [${describe(h)}]`);
    if (force) {
      await prisma.assistedLivingHome.delete({ where: { id: target.id } });
      console.log('   ✓ deleted (cascade)');
      applied++;
    } else {
      console.log('   (dry run — would delete)');
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(force ? `Applied: ${applied}, Skipped: ${skipped}` : `Would apply: ${applied}, Skipped/flagged: ${skipped}`);
  if (!force) console.log('DRY RUN — re-run with --force to apply.');
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
