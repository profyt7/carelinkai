#!/usr/bin/env npx tsx
/**
 * scripts/publish-directory-homes.ts
 *
 * Quality-gated publisher (OL-083 PART C). Promotes Cleveland *directory* listings
 * from DRAFT → ACTIVE so they appear in family search — but only the ones that
 * clear a minimum content bar. Run the pre-publish sweep first
 * (scripts/pre-publish-test-demo-sweep.ts) to clear any test/demo rows.
 *
 * Scope (only these homes are even considered):
 *   - status === 'DRAFT'
 *   - owned by the directory sentinel operator (directory-unclaimed@carelinkai.system).
 *     Real operators' DRAFT homes are THEIRS to publish — never auto-published here.
 *   - address.state === target state (default 'OH'; override with --state=XX)
 *
 * AL/RCF-only policy (codified): the directory is assisted-living discovery, so a
 * home is only in scope if it offers ASSISTED or MEMORY_CARE. Homes whose care is
 * SKILLED_NURSING-only / SNF-primary (SNF +/- INDEPENDENT, no AL/MC) or INDEPENDENT-only
 * are SKIPPED as out-of-scope — a permanent policy exclusion, NOT a fixable-content
 * hold (we don't chase their addresses). Mixed AL/SNF facilities stay eligible
 * because they carry ASSISTED.
 *
 * Quality bar (a home is PUBLISHABLE only if ALL hold):
 *   - in AL/RCF scope: careLevel includes ASSISTED or MEMORY_CARE
 *   - complete address: non-empty street, city, state, zipCode
 *   - description present and substantive (>= MIN_DESC_LEN chars)
 * In-scope homes failing a content check are HELD with reasons and left DRAFT.
 * Out-of-scope homes are SKIPPED (also left DRAFT) and reported separately.
 *
 * Safety:
 *   - Dry-run by default; only writes with --force.
 *   - Publishing is reversible (flip back to DRAFT), but it is outward-facing, so
 *     the dry-run report is the gate — review it before --force.
 *
 * Usage:
 *   npx tsx scripts/publish-directory-homes.ts                 # preview (default), OH
 *   npx tsx scripts/publish-directory-homes.ts --state=OH      # explicit state
 *   npx tsx scripts/publish-directory-homes.ts --force         # execute publish
 *
 * Idempotent: re-running only acts on homes still in DRAFT.
 */

import { PrismaClient, CareLevel } from '@prisma/client';

const prisma = new PrismaClient();

const DIRECTORY_EMAIL = 'directory-unclaimed@carelinkai.system';
const MIN_DESC_LEN = 40;
// AL/RCF scope: only homes offering assisted living or memory care belong in the
// directory. SKILLED_NURSING / INDEPENDENT alone do not qualify on their own.
const AL_CARE_TYPES: CareLevel[] = [CareLevel.ASSISTED, CareLevel.MEMORY_CARE];

function getFlag(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

type DraftHome = {
  description: string | null;
  careLevel: CareLevel[];
  address: { street: string; city: string; state: string; zipCode: string } | null;
};

/** Out of AL/RCF scope: has care type(s) but none is ASSISTED/MEMORY_CARE
 *  (SNF-primary, SNF+IL, or INDEPENDENT-only). Permanent policy exclusion. */
function isOutOfScope(home: DraftHome): boolean {
  return home.careLevel.length > 0 && !home.careLevel.some((c) => AL_CARE_TYPES.includes(c));
}

/** Content checks for an in-scope home. Empty array ⇒ publishable. */
function contentReasons(home: DraftHome): string[] {
  const reasons: string[] = [];
  const a = home.address;
  if (!a) {
    reasons.push('no address');
  } else {
    if (!a.street?.trim()) reasons.push('missing street');
    if (!a.city?.trim()) reasons.push('missing city');
    if (!a.state?.trim()) reasons.push('missing state');
    if (!a.zipCode?.trim()) reasons.push('missing zipCode');
  }
  if (!home.description || home.description.trim().length < MIN_DESC_LEN) {
    reasons.push(`description too short (< ${MIN_DESC_LEN} chars)`);
  }
  // No care type at all is a content gap (enrich could add AL/MC), not a policy skip.
  if (!home.careLevel || home.careLevel.length === 0) {
    reasons.push('no careLevel');
  }
  return reasons;
}

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;
  const state = getFlag('state', 'OH').toUpperCase();

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE PUBLISH ===');
  console.log(`Target: DRAFT directory listings in state=${state}\n`);

  const sentinel = await prisma.user.findUnique({
    where: { email: DIRECTORY_EMAIL },
    select: { operator: { select: { id: true } } },
  });
  if (!sentinel?.operator) {
    console.error(`ERROR: directory sentinel operator (${DIRECTORY_EMAIL}) not found. Run seed-cleveland-directory.ts first.`);
    process.exit(1);
  }

  const drafts = await prisma.assistedLivingHome.findMany({
    where: {
      status: 'DRAFT',
      operatorId: sentinel.operator.id,
      address: { is: { state } },
    },
    select: {
      id: true,
      name: true,
      description: true,
      careLevel: true,
      address: { select: { street: true, city: true, state: true, zipCode: true } },
    },
    orderBy: { name: 'asc' },
  });

  const publishable: typeof drafts = [];
  const held: { home: (typeof drafts)[number]; reasons: string[] }[] = [];
  const skipped: typeof drafts = [];

  for (const h of drafts) {
    if (isOutOfScope(h)) {
      skipped.push(h);
      continue;
    }
    const reasons = contentReasons(h);
    if (reasons.length === 0) publishable.push(h);
    else held.push({ home: h, reasons });
  }

  console.log(`DRAFT directory listings in ${state}: ${drafts.length}`);
  console.log(`  → publishable:        ${publishable.length}`);
  console.log(`  → held (fix content): ${held.length}`);
  console.log(`  → skipped (off-scope): ${skipped.length}\n`);

  for (const h of publishable) {
    console.log(`  PUBLISH  "${h.name}" (${h.id})  ${h.address?.city}, ${h.address?.state}  [${h.careLevel.join(', ')}]`);
  }

  if (held.length > 0) {
    console.log(`\n⚠ ${held.length} held (in scope — fix content then re-run):`);
    for (const h of held) {
      console.log(`  - "${h.home.name}" (${h.home.id})  [${h.home.careLevel.join(', ')}]`);
      for (const r of h.reasons) console.log(`      • ${r}`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\n⊘ ${skipped.length} skipped — out of AL/RCF scope (no ASSISTED/MEMORY_CARE; left DRAFT):`);
    for (const h of skipped) {
      console.log(`  - "${h.name}" (${h.id})  [${h.careLevel.join(', ')}]`);
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`To publish: ${publishable.length}`);
  console.log(`Held:       ${held.length}`);
  console.log(`Skipped:    ${skipped.length}`);
  console.log('─────────────────────────────────────────────');

  if (dryRun) {
    console.log('\nDRY RUN complete. No changes written. Re-run with --force to publish.');
    return;
  }
  if (publishable.length === 0) {
    console.log('\nNothing publishable. ✅');
    return;
  }

  const { count } = await prisma.assistedLivingHome.updateMany({
    where: { id: { in: publishable.map((h) => h.id) }, status: 'DRAFT' },
    data: { status: 'ACTIVE' },
  });

  console.log('\n─────────────────────────────────────────────');
  console.log(`Published (DRAFT → ACTIVE): ${count}`);
  console.log(`Still held in DRAFT:        ${held.length}`);
  console.log(`Skipped (off-scope):        ${skipped.length}`);
  console.log('─────────────────────────────────────────────');
  console.log('Publish complete.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
