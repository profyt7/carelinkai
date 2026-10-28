#!/usr/bin/env npx tsx
/**
 * scripts/cleanup-e2e-test-homes.ts
 *
 * Removes e2e/CI test data that leaked into a database: the test homes created
 * by `/api/dev/upsert-operator` (name "Founder Co Home" or description "Dev home
 * for E2E"), plus the test operators/users that own them and their photos/
 * addresses. Triggered by the 2026-06-10 incident where CI (pointed at prod) wrote
 * ~43 test homes into production.
 *
 * Targeting (a user is a deletion target only if ALL of these hold):
 *   - user email ends with the e2e test domain `@test.carelinkai.com`
 *   - the user has an Operator record
 *   - EVERY home the operator owns is a "test home", i.e. ALL of:
 *       • name === "Founder Co Home"  OR  description contains "e2e" (case-insensitive)
 *       • autoPopulatedAt IS NULL                      (never touch real/auto-populated homes)
 *       • zero bookings/residents/inquiries/tourRequests/tourSlots/waitlistEntries
 *   If ANY of the operator's homes fails the above, the WHOLE user is left
 *   untouched and reported (so a real home a test account somehow owns is never
 *   cascade-deleted).
 *
 * Safety:
 *   - Dry-run by default; only writes with --force.
 *   - Never touches homes with autoPopulatedAt set, or operators on any non-test
 *     email domain (only `@test.carelinkai.com`).
 *   - Aborts if the eligible set is implausibly large (>150) — a guard against a
 *     mis-scoped query nuking real data.
 *   - Also reports (but never deletes) any home matching the test signature whose
 *     operator is NOT on the test domain, for manual review.
 *
 * Deletion (per eligible user):
 *   - delete the operator's homes' Address rows (Address.homeId is SetNull, not
 *     cascade, so they would otherwise be orphaned)
 *   - null AuditLog.actionedBy where the user was the actor; delete AuditLog rows
 *     where the user is the subject; delete ActivityFeedItem rows by the user
 *   - delete the User — cascades Operator → AssistedLivingHome → HomePhoto, plus
 *     Sessions/Notifications/etc. via onDelete: Cascade
 *
 * Usage:
 *   npx tsx scripts/cleanup-e2e-test-homes.ts --dry-run   # preview (default)
 *   npx tsx scripts/cleanup-e2e-test-homes.ts --force     # execute
 *
 * Idempotent: safe to run multiple times.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_EMAIL_DOMAIN = '@test.carelinkai.com';
const SAFETY_LIMIT = 150; // abort if more users than this match — likely a bad query

function isTestSignatureHome(home: { name: string; description: string | null }): boolean {
  return home.name === 'Founder Co Home' || /e2e/i.test(home.description ?? '');
}

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE CLEANUP ===');
  console.log('');

  // 1. Test users on the e2e domain that own an operator.
  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    include: {
      operator: {
        include: {
          homes: {
            include: {
              address: true,
              _count: {
                select: {
                  bookings: true,
                  residents: true,
                  inquiries: true,
                  tourRequests: true,
                  tourSlots: true,
                  waitlistEntries: true,
                  photos: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const operatorUsers = testUsers.filter((u) => u.operator);
  const nonOperatorTestUsers = testUsers.filter((u) => !u.operator);

  if (testUsers.length > SAFETY_LIMIT) {
    console.error(`ABORT: ${testUsers.length} users match ${TEST_EMAIL_DOMAIN} — exceeds safety limit ${SAFETY_LIMIT}. Investigate the query before running.`);
    process.exit(1);
  }

  // 2. Classify each operator-user: eligible (all homes are clean test homes) vs blocked.
  type UserT = (typeof operatorUsers)[number];
  const eligible: UserT[] = [];
  const blocked: { user: UserT; reasons: string[] }[] = [];

  for (const u of operatorUsers) {
    const homes = u.operator?.homes ?? [];
    const reasons: string[] = [];
    for (const h of homes) {
      const activity =
        h._count.bookings + h._count.residents + h._count.inquiries +
        h._count.tourRequests + h._count.tourSlots + h._count.waitlistEntries;
      if (h.autoPopulatedAt) reasons.push(`home "${h.name}" (${h.id}) has autoPopulatedAt — real/auto-populated`);
      if (activity > 0) reasons.push(`home "${h.name}" (${h.id}) has ${activity} related record(s)`);
      if (!isTestSignatureHome(h)) reasons.push(`home "${h.name}" (${h.id}) does not match the test signature`);
    }
    if (reasons.length > 0) blocked.push({ user: u, reasons });
    else eligible.push(u);
  }

  const eligibleHomes = eligible.flatMap((u) => u.operator?.homes ?? []);

  // 3. Report.
  console.log(`Test-domain users (${TEST_EMAIL_DOMAIN}): ${testUsers.length}  (${operatorUsers.length} operators, ${nonOperatorTestUsers.length} non-operator)`);
  console.log(`Eligible operator-users to DELETE: ${eligible.length}  →  ${eligibleHomes.length} home(s)\n`);

  for (const u of eligible) {
    const homes = u.operator?.homes ?? [];
    console.log(`  DELETE user ${u.email} (${u.id})  operator="${u.operator?.companyName}"  homes=${homes.length}`);
    for (const h of homes) {
      const loc = h.address ? `${h.address.city ?? '?'}, ${h.address.state ?? '?'}` : 'no address';
      console.log(`      ↳ home "${h.name}" (${h.id})  status=${h.status}  photos=${h._count.photos}  ${loc}`);
    }
  }

  if (blocked.length > 0) {
    console.log(`\n⚠ ${blocked.length} test-domain operator-user(s) LEFT UNTOUCHED (a home failed a safety check):`);
    for (const b of blocked) {
      console.log(`  - ${b.user.email} (${b.user.id})`);
      for (const r of b.reasons) console.log(`      • ${r}`);
    }
  }

  // 4. Read-only diligence: test-signature homes owned by NON-test operators.
  const strayHomes = await prisma.assistedLivingHome.findMany({
    where: {
      autoPopulatedAt: null,
      OR: [{ name: 'Founder Co Home' }, { description: { contains: 'e2e', mode: 'insensitive' } }],
      operator: { is: { user: { is: { email: { not: { endsWith: TEST_EMAIL_DOMAIN } } } } } },
    },
    select: { id: true, name: true, operator: { select: { companyName: true, user: { select: { email: true } } } } },
  });
  if (strayHomes.length > 0) {
    console.log(`\n⚠ ${strayHomes.length} test-signature home(s) owned by a NON-test operator — NOT touched, review manually:`);
    for (const h of strayHomes) {
      console.log(`  - "${h.name}" (${h.id})  operator="${h.operator?.companyName}"  email=${h.operator?.user?.email}`);
    }
  }

  if (nonOperatorTestUsers.length > 0) {
    console.log(`\nℹ ${nonOperatorTestUsers.length} non-operator ${TEST_EMAIL_DOMAIN} user(s) exist (out of scope for this home-cleanup script): ` +
      nonOperatorTestUsers.map((u) => u.email).slice(0, 10).join(', ') + (nonOperatorTestUsers.length > 10 ? ' …' : ''));
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`Users to delete:  ${eligible.length}`);
  console.log(`Homes to delete:  ${eligibleHomes.length}`);
  console.log(`Photos to delete: ${eligibleHomes.reduce((s, h) => s + h._count.photos, 0)}`);
  console.log('─────────────────────────────────────────────');

  if (dryRun) {
    console.log('\nDRY RUN complete. No changes written. Re-run with --force to execute.');
    return;
  }
  if (eligible.length === 0) {
    console.log('\nNothing eligible to delete.');
    return;
  }

  // 5. Execute.
  let deletedUsers = 0;
  let deletedHomes = 0;
  let deletedAddresses = 0;

  for (const u of eligible) {
    const homes = u.operator?.homes ?? [];
    const homeIds = homes.map((h) => h.id);

    // 5a. Delete Address rows for these homes (SetNull on home delete → would orphan).
    if (homeIds.length > 0) {
      const { count } = await prisma.address.deleteMany({ where: { homeId: { in: homeIds } } });
      deletedAddresses += count;
    }

    // 5b. Preserve audit-log records authored by the user; delete subject/activity rows.
    await prisma.auditLog.updateMany({ where: { actionedBy: u.id }, data: { actionedBy: null } });
    await prisma.auditLog.deleteMany({ where: { userId: u.id } });
    await prisma.activityFeedItem.deleteMany({ where: { actorId: u.id } });

    // 5c. Delete the user — cascades Operator → homes → photos, Sessions, etc.
    await prisma.user.delete({ where: { id: u.id } });
    deletedUsers += 1;
    deletedHomes += homeIds.length;
    console.log(`DELETED: ${u.email} (operator "${u.operator?.companyName}", ${homeIds.length} home(s))`);
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`Users deleted:     ${deletedUsers}`);
  console.log(`Homes deleted:     ${deletedHomes} (cascade)`);
  console.log(`Addresses deleted: ${deletedAddresses}`);
  console.log('─────────────────────────────────────────────');
  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
