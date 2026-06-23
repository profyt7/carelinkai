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
 * Quality bar (a home is PUBLISHABLE only if ALL hold):
 *   - complete address: non-empty street, city, state, zipCode
 *   - description present and substantive (>= MIN_DESC_LEN chars)
 *   - at least one real care type: ASSISTED, MEMORY_CARE, or SKILLED_NURSING
 *     (an INDEPENDENT-only listing is held — the platform targets AL/MC/SNF)
 * Anything failing is HELD with reasons and left DRAFT.
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
const REAL_CARE_TYPES: CareLevel[] = [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.SKILLED_NURSING];

function getFlag(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

function publishability(home: {
  description: string | null;
  careLevel: CareLevel[];
  address: { street: string; city: string; state: string; zipCode: string } | null;
}): string[] {
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
  if (!home.careLevel || home.careLevel.length === 0) {
    reasons.push('no careLevel');
  } else if (!home.careLevel.some((c) => REAL_CARE_TYPES.includes(c))) {
    reasons.push('INDEPENDENT-only (no AL/MC/SNF care type)');
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

  for (const h of drafts) {
    const reasons = publishability(h);
    if (reasons.length === 0) publishable.push(h);
    else held.push({ home: h, reasons });
  }

  console.log(`DRAFT directory listings in ${state}: ${drafts.length}`);
  console.log(`  → publishable: ${publishable.length}`);
  console.log(`  → held:        ${held.length}\n`);

  for (const h of publishable) {
    console.log(`  PUBLISH  "${h.name}" (${h.id})  ${h.address?.city}, ${h.address?.state}  [${h.careLevel.join(', ')}]`);
  }

  if (held.length > 0) {
    console.log(`\n⚠ ${held.length} held (left DRAFT — fix content then re-run):`);
    for (const h of held) {
      console.log(`  - "${h.home.name}" (${h.home.id})`);
      for (const r of h.reasons) console.log(`      • ${r}`);
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`To publish: ${publishable.length}`);
  console.log(`Held:       ${held.length}`);
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
  console.log('─────────────────────────────────────────────');
  console.log('Publish complete.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
