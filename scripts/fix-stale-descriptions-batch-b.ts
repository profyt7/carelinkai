#!/usr/bin/env npx tsx
/**
 * scripts/fix-stale-descriptions-batch-b.ts
 *
 * OL-059/OL-083 — Batch B follow-up. The rebrand script (rebrand-and-address-batch-b.ts)
 * updates a rebranded home's NAME + ADDRESS but, by design, only FLAGS stale descriptions —
 * it never rewrites prose. This script closes that loop for the homes whose seeded
 * description still names the OLD brand, regenerating a clean, brand-neutral description
 * from the same template seed-cleveland-metro.ts used, with the corrected city + county.
 *
 * Only "Eliza at Chagrin Falls" (formerly Weils of Bainbridge) tripped the stale-token
 * guard on the Batch B dry-run: its description carried a trailing "(Note: aka The Weils)"
 * clause and the old municipality "Bainbridge". We rebuild the description for the new
 * postal city (Chagrin Falls, Geauga County) and drop the legacy note.
 *
 * SAFETY:
 *   - Hardcoded id, guarded by: home found, status=DRAFT, and the CURRENT description
 *     still contains at least one stale token (so we never clobber a human-edited desc).
 *   - Dry-run by default; only writes with --force.
 *   - Idempotent: a home whose description no longer contains any stale token → "clean".
 *   - Marks description VERIFIED in preFilledFields (consistent with name/address).
 *
 * Usage:
 *   npx tsx scripts/fix-stale-descriptions-batch-b.ts            # DRY RUN
 *   npx tsx scripts/fix-stale-descriptions-batch-b.ts --force    # apply
 *
 * After --force, run publish-directory-homes.ts to take the homes live.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Fix = {
  id: string;
  name: string;
  /** Corrected postal city + county for the rebuilt description. */
  city: string;
  county: string;
  /** Care-type phrases, in the seed's house style (lowercase, comma-joined). */
  careTypes: string;
  /** Tokens that, if present in the current description, mean it still names the old brand. */
  staleTokens: string[];
};

// Mirrors seed-cleveland-metro.ts descriptionFor() — minus the per-facility license/note clauses,
// which is exactly what we want to drop for a rebranded home.
function descriptionFor(f: Fix): string {
  return (
    'Senior living community in ' + f.city + ', Ohio (' + f.county + ' County) ' +
    'offering ' + f.careTypes + '. Unclaimed directory listing — ' +
    'staged for CareLinkAI Greater-Cleveland metro coverage. Address, pricing, ' +
    'amenities, and current availability are pending the enrich pass and operator ' +
    'claim. The operator can claim this listing to add photos, verified details, ' +
    'pricing, and availability.'
  );
}

const FIXES: Fix[] = [
  {
    id: 'cmqqrlo85006krlmbl79j6l27',
    name: 'Eliza at Chagrin Falls',
    city: 'Chagrin Falls',
    county: 'Geauga',
    careTypes: 'assisted living, memory care, skilled nursing',
    staleTokens: ['Weils', 'Weil'],
  },
];

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — rewriting stale descriptions ===');
  console.log(`Batch B stale-description fixes: ${FIXES.length}\n`);

  let willWrite = 0;
  let clean = 0;
  let skipped = 0;

  for (const f of FIXES) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: f.id },
      select: { id: true, name: true, status: true, description: true, preFilledFields: true },
    });

    if (!home) {
      console.log(`  ⚠ SKIP "${f.name}" (${f.id}) — not found`);
      skipped++;
      continue;
    }
    if (home.status !== 'DRAFT') {
      console.log(`  ⚠ SKIP "${home.name}" (${f.id}) — status=${home.status} (only DRAFT)`);
      skipped++;
      continue;
    }

    const desc = home.description ?? '';
    const lower = desc.toLowerCase();
    const hitTokens = f.staleTokens.filter((tok) => lower.includes(tok.toLowerCase()));
    if (hitTokens.length === 0) {
      console.log(`  ✓ clean "${home.name}" — no stale tokens; leaving description as-is`);
      clean++;
      continue;
    }

    const next = descriptionFor(f);
    console.log(`  ✏️  "${home.name}" — description still names old brand: ${hitTokens.join(', ')}`);
    console.log(`        old: ${desc}`);
    console.log(`        new: ${next}`);
    willWrite++;

    if (!dryRun) {
      const prov = (home.preFilledFields as Record<string, string> | null) ?? {};
      prov.description = 'VERIFIED';
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: { description: next, preFilledFields: prov },
      });
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would write' : 'Wrote'}: ${willWrite}`);
  console.log(`Clean:      ${clean}`);
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
