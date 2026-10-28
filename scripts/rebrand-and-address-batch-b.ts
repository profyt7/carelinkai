#!/usr/bin/env npx tsx
/**
 * scripts/rebrand-and-address-batch-b.ts
 *
 * OL-059/OL-083 — Batch B. Directory DRAFT homes whose seeded brand has since been
 * renamed/sold. The home is still a real, currently-OPEN AL/MC facility at the same
 * (or corrected) location — it just trades under a new name now. We update BOTH the
 * display name AND the full verified address so the public directory shows the
 * facility families will actually find, not a defunct brand.
 *
 * All names + addresses were human-verified against the operator's own site + a
 * second independent source (Ohio DOH / Caring.com / A Place for Mom / rebrand
 * announcement). Renaming is safe: home detail routes are id-based, `name` is not
 * unique, and these directory homes have no slug.
 *
 * STALE-DESCRIPTION GUARD: the seeded description/amenities were written for the OLD
 * brand. On dry-run we scan the description for the old brand token(s) and print a
 * ⚠ when found, so a stale "Welcome to <old name>…" can be fixed before going live.
 * (This script does NOT rewrite descriptions — it only flags.)
 *
 * SAFETY:
 *   - Hardcoded ids; each guarded by the expected OLD name AND status=DRAFT.
 *   - Dry-run by default; only writes with --force.
 *   - Idempotent: a home already at the new name + target address → "unchanged".
 *   - Marks name + address fields VERIFIED in preFilledFields.
 *
 * Usage:
 *   npx tsx scripts/rebrand-and-address-batch-b.ts            # DRY RUN
 *   npx tsx scripts/rebrand-and-address-batch-b.ts --force    # apply
 *
 * After --force, review any ⚠ stale descriptions, then run publish-directory-homes.ts.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Target = {
  id: string;
  oldName: string;
  newName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  /** Tokens that, if present in the description, mean it still names the old brand. */
  staleTokens: string[];
  source: string;
};

// Batch B — OPEN, rebranded, two-source-verified (2026-06-24).
// Brookdale Medina North added 2026-06-25 (OL-089) after its address was re-verified to two
// independent sources (49-A Leisure Ln); it was originally held out as medium-confidence.
const TARGETS: Target[] = [
  {
    id: 'cmqqrlgra005mrlmbn1qbtn2q', oldName: 'Brookdale Medina South', newName: 'Traditions of Medina',
    street: '100 High Point Dr', city: 'Medina', state: 'OH', zipCode: '44256',
    staleTokens: ['Brookdale'], source: 'seniorcareauthority.com — Traditions of Medina (fka Brookdale Medina South)',
  },
  {
    id: 'cmqqrlhn9005qrlmbdh0rhweq', oldName: 'Elmcroft of Medina', newName: 'Broadway Creek Senior Living',
    street: '1046 N Jefferson St', city: 'Medina', state: 'OH', zipCode: '44256',
    staleTokens: ['Elmcroft'], source: 'seniorhousingnet.com — elmcroft-of-medina → Broadway Creek',
  },
  {
    id: 'cmqqrku5t002wrlmbu3agw9px', oldName: 'Elmcroft of Sagamore Hills', newName: 'Majestic Care of Sagamore Hills',
    street: '997 W Aurora Rd', city: 'Northfield', state: 'OH', zipCode: '44067',
    staleTokens: ['Elmcroft'], source: 'majesticcare.com/location/sagamore-hills-assisted-living',
  },
  {
    id: 'cmqqrkhpb001erlmb83zsyyhk', oldName: 'Kindred Living at The Fountains', newName: 'Heritage of Lyndhurst',
    street: '1555 Brainard Rd', city: 'Lyndhurst', state: 'OH', zipCode: '44124',
    staleTokens: ['Kindred', 'Fountains', 'Regent'], source: 'seniorcareauthority.com — Heritage of Lyndhurst (formerly Regent of Lyndhurst)',
  },
  {
    id: 'cmqqrlo85006krlmbl79j6l27', oldName: 'Weils of Bainbridge', newName: 'Eliza at Chagrin Falls',
    street: '16695 Chillicothe Rd', city: 'Chagrin Falls', state: 'OH', zipCode: '44023',
    staleTokens: ['Weils', 'Weil'], source: 'elizachagrinfalls.elizajennings.org (formerly The Weils)',
  },
  {
    id: 'cmqqrk9cz000erlmbnqt13awu', oldName: 'Berea Lake Towers Retirement Community', newName: 'Generations Senior Living of Berea',
    street: '4 Berea Commons', city: 'Berea', state: 'OH', zipCode: '44017',
    staleTokens: ['Berea Lake Towers', 'Lake Towers'], source: 'generationshcm.com/rebranding-of-berea-lake-towers-and-crystal-waters',
  },
  {
    id: 'cmqqrkdko000wrlmbua2b3sjo', oldName: 'Emerald Village Senior Living', newName: 'Otterbein North Olmsted SeniorLife Community',
    street: '30344 Lorain Rd', city: 'North Olmsted', state: 'OH', zipCode: '44070',
    staleTokens: ['Emerald Village', 'Vista Prairie'], source: 'otterbein.org/find-a-location/north-olmsted (acq. from Vista Prairie 2025)',
  },
  {
    id: 'cmqqrllu60068rlmb2s9y5s9m', oldName: 'Briar Hill Health Care Residence', newName: 'Ohman Family Living at Briar',
    street: '15950 Pierce St', city: 'Middlefield', state: 'OH', zipCode: '44062',
    staleTokens: ['Briar Hill'], source: 'ohmanfamilyliving.com/briar (same Medicare ID 365937 as Briar Hill)',
  },
  {
    id: 'cmqqrkwlr0036rlmbpauvg0ag', oldName: "Greenfield Estate Alzheimer's Special Care Center", newName: 'The Ridge at Copley',
    street: '3522 Commercial Dr', city: 'Akron', state: 'OH', zipCode: '44333',
    staleTokens: ['Greenfield', 'Anthem'], source: 'ridgeatcopley.com (Greenfield Estates → Anthem Memory Care → The Ridge at Copley)',
  },
  {
    id: 'cmqqrl4xl0046rlmbmbb0aj2d', oldName: 'Vista Springs Macedonia', newName: 'Summit Corners',
    street: '8400 S Bedford Rd', city: 'Macedonia', state: 'OH', zipCode: '44056',
    staleTokens: ['Vista Springs', 'American House'], source: 'sonidaseniorliving.com/community/summit-corners (Vista Springs → American House → Summit Corners)',
  },
  {
    id: 'cmqqrkq2y002erlmbedkk2hfa', oldName: 'Briarwood', newName: 'The Briarwood Healthcare Community',
    street: '3700 Englewood Dr', city: 'Stow', state: 'OH', zipCode: '44224',
    staleTokens: [], source: 'thebriarwood.com + caring.com (open AL/MC/SNF, Stow)',
  },
  {
    id: 'cmqqrlg91005krlmbyqjdxy5t', oldName: 'Brookdale Medina North', newName: 'Medina Pointe Senior Living',
    street: '49-A Leisure Ln', city: 'Medina', state: 'OH', zipCode: '44256',
    staleTokens: ['Brookdale'], source: 'seniorlivingguide.com (49-A Leisure Ln) + aplaceformom.com — Medina Pointe (fka Brookdale Medina North), Sinceri Senior Living (OL-089 re-verify)',
  },
];

const ADDR_FIELDS = ['street', 'city', 'state', 'zipCode'] as const;

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — renaming + writing verified addresses ===');
  console.log(`Batch B: ${TARGETS.length} OPEN, rebranded, two-source-verified homes\n`);

  let willWrite = 0;
  let unchanged = 0;
  let skipped = 0;
  const staleDescriptions: string[] = [];

  for (const t of TARGETS) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: t.id },
      select: {
        id: true, name: true, status: true, description: true, preFilledFields: true,
        address: { select: { id: true, street: true, city: true, state: true, zipCode: true } },
      },
    });

    if (!home) {
      console.log(`  ⚠ SKIP "${t.oldName}" (${t.id}) — not found`);
      skipped++;
      continue;
    }
    // Accept either the old name (not yet applied) or the new name (idempotent re-run).
    if (home.name !== t.oldName && home.name !== t.newName) {
      console.log(`  ⚠ SKIP "${home.name}" (${t.id}) — name drift (expected "${t.oldName}"); not touching`);
      skipped++;
      continue;
    }
    if (home.status !== 'DRAFT') {
      console.log(`  ⚠ SKIP "${home.name}" (${t.id}) — status=${home.status} (only DRAFT)`);
      skipped++;
      continue;
    }

    // Stale-description scan (uses current description regardless of write).
    const desc = (home.description ?? '').toLowerCase();
    const hitTokens = t.staleTokens.filter((tok) => desc.includes(tok.toLowerCase()));
    if (hitTokens.length > 0) {
      staleDescriptions.push(`${t.newName} — description still mentions: ${hitTokens.join(', ')}`);
    }

    const a = home.address;
    const nameMatches = home.name === t.newName;
    const addrMatches = a && a.street === t.street && a.city === t.city && a.state === t.state && a.zipCode === t.zipCode;
    if (nameMatches && addrMatches) {
      console.log(`  ✓ unchanged "${t.newName}" — ${t.street}, ${t.city}, ${t.state} ${t.zipCode}`);
      unchanged++;
      continue;
    }

    console.log(`  🔄 "${home.name}" → "${t.newName}"`);
    console.log(`        addr → ${t.street}, ${t.city}, ${t.state} ${t.zipCode}` + (a?.street || a?.city ? `   (was: ${a?.street ?? '—'}, ${a?.city ?? '—'} ${a?.zipCode ?? '—'})` : ''));
    console.log(`        src: ${t.source}`);
    if (hitTokens.length > 0) console.log(`        ⚠ description still names old brand: ${hitTokens.join(', ')}`);
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
      prov.name = 'VERIFIED';
      for (const f of ADDR_FIELDS) prov[f] = 'VERIFIED';
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: { name: t.newName, preFilledFields: prov },
      });
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would write' : 'Wrote'}: ${willWrite}`);
  console.log(`Unchanged:  ${unchanged}`);
  console.log(`Skipped:    ${skipped}`);
  console.log('─────────────────────────────────────────────');

  if (staleDescriptions.length > 0) {
    console.log(`\n⚠ ${staleDescriptions.length} description(s) still reference the old brand — review before publishing:`);
    for (const s of staleDescriptions) console.log(`  - ${s}`);
  }

  if (dryRun) console.log('\nDRY RUN complete. Re-run with --force to write, then review ⚠ descriptions and run publish-directory-homes.ts.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
