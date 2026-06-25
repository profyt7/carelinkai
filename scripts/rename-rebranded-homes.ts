#!/usr/bin/env npx tsx
/**
 * scripts/rename-rebranded-homes.ts
 *
 * Display-name cleanup for ACTIVE directory listings still showing a defunct brand.
 * The Cowork outreach-research pass (2026-06-25) flagged 21 listings whose seeded name
 * is outdated; this renames the 12 with a clear, current operator name so families see
 * the brand they'll actually find. (Held: "Brookdale Richmond Heights → Richmond Heights
 * Place" — Cowork marked it "confirm operator". Excluded: "Harbor Court → Meadow Falls of
 * Rocky River", handled as a duplicate by dedupe-directory-homes.ts. The other 7 flagged
 * rows already show their current name.)
 *
 * NAME ONLY: these are same-location rebrands, so the verified address already on the
 * listing is unchanged. Home detail routes are id-based and `name` is non-unique, so a
 * rename is non-breaking and reversible. Source for each new name is Cowork's research
 * (single-source) — the dry-run is the review gate before --force.
 *
 * SAFETY:
 *   - Hardcoded ids; each guarded by the expected OLD name AND status=ACTIVE.
 *   - Accepts the new name too (idempotent re-run → "unchanged").
 *   - Dry-run by default; only writes with --force.
 *   - Marks name VERIFIED in preFilledFields.
 *
 * Usage:
 *   npx tsx scripts/rename-rebranded-homes.ts            # DRY RUN
 *   npx tsx scripts/rename-rebranded-homes.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Rename = { id: string; oldName: string; newName: string; note: string };

const RENAMES: Rename[] = [
  { id: 'cmqqrkuns002yrlmb13y1glzr', oldName: 'Gables of Hudson', newName: 'Hudson Grande Senior Living', note: 'Arrow Senior Living' },
  { id: 'cmqqrl8hf004mrlmbvsxilf5r', oldName: 'Elmcroft of Lorain', newName: 'Lorain Estates Senior Living', note: 'Sinceri Senior Living' },
  { id: 'cmqqrleah005crlmbqbcz3m0s', oldName: 'Lantern of Madison', newName: 'Meadow Falls of Madison', note: 'Meadow Falls Senior Living' },
  { id: 'cmqqrk8xx000crlmbtl4lnkuw', oldName: 'Belvedere of Westlake', newName: 'Saint Therese of Westlake', note: 'acquired ~May 2025; 29591 Detroit Rd' },
  { id: 'cmqqrkqwf002irlmbc9lqw5x7', oldName: 'Brookdale Bath', newName: 'Meadow Falls of Bath', note: 'Brookdale divestiture' },
  { id: 'cmqqrkqja002grlmbkm2gfnvo', oldName: 'Brookdale Barberton', newName: 'Barberton Pointe Senior Living', note: 'Sinceri; 487 Austin Dr' },
  { id: 'cmqqrlbal004yrlmbj9pskeq6', oldName: 'Brookdale Newell Creek', newName: 'The Enclave of Newell Creek', note: 'Bridge Senior Living; 7900 Center St' },
  { id: 'cmqqrka8c000irlmb28e0u22z', oldName: 'Brookdale Middleburg Heights', newName: 'Middleburg Heights Assisted Living', note: 'independent, ex-Paramount; 15435 Bagley Rd' },
  { id: 'cmqqrkrtz002mrlmbmx9iuuvz', oldName: 'Brookdale Stow', newName: 'Eden Vista Stow', note: 'Vista Senior Living Mgmt; 5511 Fishcreek Rd' },
  { id: 'cmqqrlbrc0050rlmbdpf37w19', oldName: 'Brookdale Wickliffe', newName: 'Meadow Falls of Wickliffe', note: '30630 Ridge Rd' },
  { id: 'cmqqrlc5m0052rlmbbocwczdc', oldName: 'Brookdale Willoughby', newName: 'Maple Ridge Senior Living', note: 'Vista; 35300 Kaiser Ct' },
  { id: 'cmqqrkezr0012rlmbafv7zu32', oldName: 'HarborChase of Shaker Heights', newName: 'StoryPoint Shaker Heights', note: '17000 Van Aken Blvd' },
];

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — renaming rebranded listings ===');
  console.log(`Rebrand renames: ${RENAMES.length}\n`);

  let willWrite = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const r of RENAMES) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: r.id },
      select: { id: true, name: true, status: true, preFilledFields: true },
    });

    if (!home) {
      console.log(`  ⚠ SKIP "${r.oldName}" (${r.id}) — not found`);
      skipped++;
      continue;
    }
    if (home.name === r.newName) {
      console.log(`  ✓ unchanged "${r.newName}" — already renamed`);
      unchanged++;
      continue;
    }
    if (home.name !== r.oldName) {
      console.log(`  ⚠ SKIP (${r.id}) — name drift: expected "${r.oldName}", found "${home.name}"; not touching`);
      skipped++;
      continue;
    }
    if (home.status !== 'ACTIVE') {
      console.log(`  ⚠ SKIP "${home.name}" (${r.id}) — status=${home.status} (only ACTIVE)`);
      skipped++;
      continue;
    }

    console.log(`  🔄 "${home.name}" → "${r.newName}"   (${r.note})`);
    willWrite++;

    if (!dryRun) {
      const prov = (home.preFilledFields as Record<string, string> | null) ?? {};
      prov.name = 'VERIFIED';
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: { name: r.newName, preFilledFields: prov },
      });
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would rename' : 'Renamed'}: ${willWrite}`);
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
