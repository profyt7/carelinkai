#!/usr/bin/env npx tsx
/**
 * scripts/backfill-demo-flags.ts — OL-112 (FILTER, don't purge)
 *
 * Stamps `isDemo=true` on the RETAINED demo/tutorial fixtures so admin metrics
 * can exclude them (and the public directory gets a structural guard) without
 * deleting anything tutorials depend on.
 *
 * What gets flagged:
 *   USERS whose email matches the demo/seed conventions:
 *     - demo.*@carelinkai.test           (docs/DEMO_ACCOUNTS.md tutorial accounts)
 *     - *@test.carelinkai.com            (e2e harness operators)
 *     - *+seed@carelinkai.com            (runDemoSeed operator/caregiver accounts)
 *     - family.seed*@carelinkai.com      (runDemoSeed families)
 *   HOMES that are owned by a flagged demo user's operator, OR match the
 *   pre-publish demo NAME/DESCRIPTION signature (same one the ODH ingest and
 *   pre-publish sweep use).
 *
 * Flag-only and reversible (`isDemo=false` can be set back by hand); never
 * deletes; idempotent. Dry-run by default; --force to write.
 *
 * Usage (Render shell):
 *   npx tsx scripts/backfill-demo-flags.ts            # dry-run
 *   npx tsx scripts/backfill-demo-flags.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';
import { isExcludedDemoHome } from '../src/lib/inspections/matcher';
import { DEMO_EMAIL_RE } from '../src/lib/admin/demo-identity';

const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force');

async function main() {
  console.log(`=== OL-112 demo-flag backfill — ${FORCE ? 'APPLY (--force)' : 'DRY-RUN'} ===\n`);

  // 1. Users by email convention.
  const users = await prisma.user.findMany({
    where: { isDemo: false },
    select: { id: true, email: true, role: true },
  });
  const demoUsers = users.filter((u) => DEMO_EMAIL_RE.test(u.email));
  for (const u of demoUsers) console.log(`  USER  ${u.email} (${u.role})`);
  if (FORCE && demoUsers.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: demoUsers.map((u) => u.id) } },
      data: { isDemo: true },
    });
  }

  // 2. Homes: demo-operator-owned OR matching the demo name/desc signature.
  const homes = await prisma.assistedLivingHome.findMany({
    where: { isDemo: false },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      operator: { select: { user: { select: { email: true } } } },
    },
  });
  const demoHomes = homes.filter((h) => {
    const operatorEmail = h.operator?.user?.email ?? null;
    return (
      (operatorEmail && DEMO_EMAIL_RE.test(operatorEmail)) ||
      isExcludedDemoHome({ name: h.name, description: h.description, operatorEmail })
    );
  });
  for (const h of demoHomes) console.log(`  HOME  ${h.name} (${h.status}, operator ${h.operator?.user?.email ?? 'n/a'})`);
  if (FORCE && demoHomes.length > 0) {
    await prisma.assistedLivingHome.updateMany({
      where: { id: { in: demoHomes.map((h) => h.id) } },
      data: { isDemo: true },
    });
  }

  console.log(`\n${FORCE ? 'Flagged' : 'Would flag'}: ${demoUsers.length} user(s), ${demoHomes.length} home(s). Nothing deleted.`);
  if (!FORCE && (demoUsers.length || demoHomes.length)) console.log('Re-run with --force to write.');

  // 3. Sanity: any ACTIVE home about to be flagged would have been publicly
  // visible — call it out loudly (should be zero; demo homes stay DRAFT).
  const activeDemo = demoHomes.filter((h) => h.status === 'ACTIVE');
  if (activeDemo.length > 0) {
    console.log(`\n⚠️  ${activeDemo.length} demo-flagged home(s) are ACTIVE (publicly visible until now):`);
    for (const h of activeDemo) console.log(`   - ${h.name}`);
    console.log('   The public search now also filters isDemo=true, so flagging fixes the leak.');
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
