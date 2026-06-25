#!/usr/bin/env npx tsx
/**
 * scripts/archive-hold-resolved-homes.ts
 *
 * Resolves the 10 HOLD listings the SEND_READY backfill flagged (their outreachEmail
 * was already nulled to 'HOLD-REVIEW' by load-outreach-send-ready.ts, #621). Founder
 * review confirmed:
 *
 *   ARCHIVE — pure skilled-nursing, no public assisted-living product (out of AL scope):
 *     Park East, Oaks of Brecksville, Heritage of Hudson, Avenue at Macedonia,
 *     Landerbrook Transitional Care, Heather Knoll (Tallmadge = SNF; Sprenger AL is Avon Lake).
 *
 *   ARCHIVE — duplicate of an existing ACTIVE listing (keep the twin):
 *     Sunrise at Shaker Heights → The Woodlands of Shaker Heights
 *       (already archived in #617's dedupe — handled idempotently here)
 *     Legacy Place - Twinsburg  → Canterbury Commons (Inspira; same 9928 Vail Dr)
 *     Nason Center of Breckenridge → Ohio Living Breckenridge Village (same campus)
 *
 *   KEEP ACTIVE — Hudson Elms / The Elms: real 25-suite AL wing (+50 SNF), CALL-ONLY.
 *     No change here (stays ACTIVE, email already null). See note below for an ops to-do.
 *
 * All archives set status=INACTIVE (the public directory shows only ACTIVE; the publisher
 * only promotes DRAFT→ACTIVE), so they're permanently out of the directory yet reversible.
 * outreachEmail is left as-is (already null) so the claim engine can't reach them.
 *
 * SAFETY:
 *   - Hardcoded ids; each guarded by expected name AND status≠INACTIVE.
 *   - DUP archives also require the keeper to exist AND be ACTIVE (never orphan a facility).
 *   - Dry-run by default; only writes with --force. Idempotent.
 *
 * Usage:
 *   npx tsx scripts/archive-hold-resolved-homes.ts            # DRY RUN
 *   npx tsx scripts/archive-hold-resolved-homes.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SnfTarget = { id: string; name: string; reason: string };
type DupTarget = { id: string; name: string; keepId: string; keepName: string };

// Pure SNF / non-AL — out of directory scope.
const SNF: SnfTarget[] = [
  { id: 'cmqqrkmww0020rlmbthcvype7', name: 'Park East', reason: 'SNF/rehab, no public AL' },
  { id: 'cmqqrklyn001wrlmbt6hki35l', name: 'Oaks of Brecksville', reason: 'SNF/rehab (Saber)' },
  { id: 'cmqqrky1c003crlmbocgnuoq2', name: 'Heritage of Hudson', reason: 'SNF/rehab (Foundations Health)' },
  { id: 'cmqqrkpl2002crlmbhj7ksqix', name: 'Avenue at Macedonia', reason: 'skilled nursing & rehab' },
  { id: 'cmqqrki6j001grlmbevwl3hue', name: 'Landerbrook Transitional Care', reason: 'SNF (54 beds)' },
  { id: 'cmqqrkxjg003arlmbw6qywbk9', name: 'Heather Knoll Retirement Village', reason: 'Tallmadge = SNF (Sprenger AL is Avon Lake)' },
];

// Duplicates of an existing ACTIVE listing — keep the twin.
const DUP: DupTarget[] = [
  { id: 'cmqqrko6c0026rlmbp4r307ll', name: 'Sunrise at Shaker Heights', keepId: 'cmqqrkp57002arlmbvqnyq71f', keepName: 'The Woodlands of Shaker Heights' },
  { id: 'cmqqrkyi2003erlmbg1lq5e3x', name: 'Legacy Place - Twinsburg', keepId: 'cmp71kmu9002ulpioyuv8hf5x', keepName: 'Canterbury Commons' },
  { id: 'cmqqrles0005erlmbl17xexe1', name: 'Nason Center of Breckenridge Village', keepId: 'cmp71kmt3001ylpio15cx3euh', keepName: 'Ohio Living Breckenridge Village' },
];

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — archiving HOLD-resolved homes ===');
  console.log(`SNF/out-of-scope: ${SNF.length}  ·  duplicates: ${DUP.length}\n`);

  let archived = 0, unchanged = 0, skipped = 0;

  const archive = async (id: string, name: string, label: string) => {
    const home = await prisma.assistedLivingHome.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
    if (!home) { console.log(`  ⚠ SKIP "${name}" (${id}) — not found`); skipped++; return; }
    if (home.name !== name) { console.log(`  ⚠ SKIP (${id}) — name drift: expected "${name}", found "${home.name}"`); skipped++; return; }
    if (home.status === 'INACTIVE') { console.log(`  ✓ unchanged "${name}" — already INACTIVE`); unchanged++; return; }
    console.log(`  📦 ARCHIVE "${name}" [${home.status} → INACTIVE]  ${label}`);
    archived++;
    if (!dryRun) await prisma.assistedLivingHome.update({ where: { id }, data: { status: 'INACTIVE' } });
  };

  console.log('── SNF / out-of-AL-scope ──');
  for (const t of SNF) await archive(t.id, t.name, t.reason);

  console.log('\n── Duplicates (keep the twin) ──');
  for (const t of DUP) {
    const keep = await prisma.assistedLivingHome.findUnique({ where: { id: t.keepId }, select: { name: true, status: true } });
    if (!keep || keep.status !== 'ACTIVE') {
      console.log(`  ⚠ SKIP "${t.name}" — keeper "${t.keepName}" is ${keep ? keep.status : 'MISSING'}, not ACTIVE; refusing to archive`);
      skipped++;
      continue;
    }
    await archive(t.id, t.name, `→ keep "${t.keepName}"`);
  }

  console.log('\n── Kept ACTIVE (no change) ──');
  console.log('  • Hudson Elms / The Elms (cmp71kmty002mlpion9nyi9d2) — real 25-suite AL wing; CALL-ONLY.');
  console.log('    OPS TODO: one call to confirm the AL wing is still admitting before promoting.');

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would archive' : 'Archived'}: ${archived}`);
  console.log(`Unchanged:    ${unchanged}`);
  console.log(`Skipped:      ${skipped}`);
  console.log('─────────────────────────────────────────────');
  if (dryRun) console.log('\nDRY RUN complete. Re-run with --force to write.');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
