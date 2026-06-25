#!/usr/bin/env npx tsx
/**
 * scripts/dedupe-directory-homes.ts
 *
 * OL-091 follow-up. The Cowork outreach-research pass (2026-06-25) surfaced directory
 * listings that are the SAME physical facility seeded twice under different names. If we
 * fire claim-nudges before resolving these, an operator gets two claim invites for one
 * building. This archives the redundant row (→ INACTIVE) and KEEPS the canonical one.
 *
 * For each pair we keep the row that carries the current operator brand and/or the
 * verified address, and archive the stale-name twin. The script REQUIRES the keeper to
 * exist and be ACTIVE before it will archive its twin — so a facility is never removed
 * from the public directory entirely.
 *
 * Pairs (archive → keep):
 *   1. Briarcliff Manor            → Ohman Family Living at Briar (15950 Pierce St; Batch B verified)
 *   2. Harbor Court Retirement…    → Meadow Falls of Rocky River (22900 Center Ridge Rd; current brand)
 *   3. Cuyahoga Falls Danbury Woods→ Danbury Woods (same StoryPoint Cuyahoga Falls campus)
 *   4. Solon Pointe                → Solon Pointe at Emerald Ridge (5625 Emerald Ridge Pkwy)
 *   5. Sunrise at Shaker Heights   → The Woodlands of Shaker Heights (16333 Chagrin Blvd; current operator)
 *   6. Ohman Family Living at Holly→ Holly Hill (DRAFT pending twin; mirrors the OL-091 Briar case)
 *
 * NOT included (Cowork flagged "possible" only — needs a human look, may be distinct units):
 *   - Nason Center of Breckenridge Village vs Ohio Living Breckenridge Village (Nason is the
 *     SNF health center on the same campus — likely a separate sub-unit, not a true dup).
 *
 * SAFETY:
 *   - Hardcoded ids; archive guarded by expected name AND status≠INACTIVE.
 *   - Keeper must exist AND be ACTIVE, else the pair is SKIPPED (never orphan a facility).
 *   - Dry-run by default; only writes with --force. Idempotent (already-INACTIVE → unchanged).
 *
 * Usage:
 *   npx tsx scripts/dedupe-directory-homes.ts            # DRY RUN
 *   npx tsx scripts/dedupe-directory-homes.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Pair = {
  archiveId: string;
  archiveName: string;
  keepId: string;
  keepName: string;
  reason: string;
};

const PAIRS: Pair[] = [
  {
    archiveId: 'cmqqrlmby006arlmbyyuhra21', archiveName: 'Briarcliff Manor',
    keepId: 'cmqqrllu60068rlmb2s9y5s9m', keepName: 'Ohman Family Living at Briar',
    reason: 'same facility — 15950 Pierce St, Middlefield (ohmanfamilyliving.com/briar)',
  },
  {
    archiveId: 'cmqqrkfhn0014rlmbtqruq6x2', archiveName: 'Harbor Court Retirement Community',
    keepId: 'cmql0xbpc000ir7jc3zf5c77q', keepName: 'Meadow Falls of Rocky River',
    reason: 'Harbor Court rebranded → Meadow Falls of Rocky River, 22900 Center Ridge Rd',
  },
  {
    archiveId: 'cmp71kmtv002klpio0b5064xx', archiveName: 'Cuyahoga Falls Danbury Woods',
    keepId: 'cmqqrktp9002urlmbcy445jw3', keepName: 'Danbury Woods',
    reason: 'same StoryPoint Cuyahoga Falls campus, same phone/site',
  },
  {
    archiveId: 'cmql0xboz000ar7jcfnjgumpm', archiveName: 'Solon Pointe',
    keepId: 'cmqqrkna30022rlmb9tsdrvzm', keepName: 'Solon Pointe at Emerald Ridge',
    reason: 'same name/address/phone/site — 5625 Emerald Ridge Pkwy (CommuniCare)',
  },
  {
    archiveId: 'cmqqrko6c0026rlmbp4r307ll', archiveName: 'Sunrise at Shaker Heights',
    keepId: 'cmqqrkp57002arlmbvqnyq71f', keepName: 'The Woodlands of Shaker Heights',
    reason: 'same address 16333 Chagrin Blvd; Sunrise no longer the operator',
  },
  {
    archiveId: 'cmp71kmsu001qlpioer97o29c', archiveName: 'Ohman Family Living at Holly',
    keepId: 'cmqqrlmnv006crlmb18mwhnq5', keepName: 'Holly Hill',
    reason: 'DRAFT pending twin of ACTIVE Holly Hill (10190 Fairmount Rd; same phone/site)',
  },
];

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — archiving duplicate directory homes ===');
  console.log(`Duplicate pairs: ${PAIRS.length}\n`);

  let willArchive = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const p of PAIRS) {
    const [archive, keep] = await Promise.all([
      prisma.assistedLivingHome.findUnique({ where: { id: p.archiveId }, select: { id: true, name: true, status: true } }),
      prisma.assistedLivingHome.findUnique({ where: { id: p.keepId }, select: { id: true, name: true, status: true } }),
    ]);

    if (!archive) {
      console.log(`  ⚠ SKIP "${p.archiveName}" (${p.archiveId}) — not found`);
      skipped++;
      continue;
    }
    if (archive.name !== p.archiveName) {
      console.log(`  ⚠ SKIP (${p.archiveId}) — name drift: expected "${p.archiveName}", found "${archive.name}"`);
      skipped++;
      continue;
    }
    if (archive.status === 'INACTIVE') {
      console.log(`  ✓ unchanged "${archive.name}" — already INACTIVE`);
      unchanged++;
      continue;
    }
    // Never orphan a facility: the keeper must exist and be ACTIVE.
    if (!keep || keep.status !== 'ACTIVE') {
      console.log(`  ⚠ SKIP "${archive.name}" — keeper "${p.keepName}" (${p.keepId}) is ${keep ? keep.status : 'MISSING'}, not ACTIVE; refusing to archive the only live row`);
      skipped++;
      continue;
    }

    console.log(`  📦 ARCHIVE "${archive.name}" [${archive.status} → INACTIVE]`);
    console.log(`        keep → "${keep.name}" (ACTIVE)`);
    console.log(`        ${p.reason}`);
    willArchive++;

    if (!dryRun) {
      await prisma.assistedLivingHome.update({ where: { id: archive.id }, data: { status: 'INACTIVE' } });
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would archive' : 'Archived'}: ${willArchive}`);
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
