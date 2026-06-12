#!/usr/bin/env npx tsx
/**
 * scripts/reset-canterbury-claim.ts
 *
 * Reverts the real Canterbury Commons (cmp71kmu9002ulpioyuv8hf5x) from its
 * smoke-test-claimed ACTIVE/operator-owned state back to the pre-claim seeded
 * state: owned by the 'CareLinkAI Directory - Unclaimed Listings' placeholder
 * operator, status DRAFT — so the REAL operator (vfoy@inspirahealthgroup.com)
 * can claim it with a fresh batch-1 claim token.
 *
 * Background: during the 2026-06-08 prod smoke test a throwaway founder account
 * claimed the real Canterbury listing, leaving it ACTIVE + operator-owned. This
 * one-off restores the exact pre-claim state that seed-cleveland-directory.ts
 * produces (directory placeholder operator + DRAFT) so a fresh claim works.
 *
 * Preserves Canterbury's auto-populated profile, photos, and address (9928 Vail Dr) —
 * only operatorId and status change. Removes the smoke-test founder account ONLY
 * if it now owns nothing else, has zero activity, AND its email matches a test
 * pattern; otherwise leaves it in place (detached) and reports.
 *
 * Usage (run from the project directory so '@prisma/client' resolves):
 *   npx tsx scripts/reset-canterbury-claim.ts            # dry-run (default)
 *   npx tsx scripts/reset-canterbury-claim.ts --force    # execute
 *
 * Idempotent: re-running after a reset is a no-op for the ownership revert.
 */

import { PrismaClient, HomeStatus } from '@prisma/client';

const prisma = new PrismaClient();

const CANTERBURY_ID = 'cmp71kmu9002ulpioyuv8hf5x';
const DIRECTORY_EMAIL = 'directory-unclaimed@carelinkai.system';
const DIRECTORY_OPERATOR_NAME = 'CareLinkAI Directory - Unclaimed Listings';

// Only auto-delete a detached founder when its email clearly looks test/smoke.
const TEST_EMAIL = /(@test\.carelinkai\.com$)|(^profyt7\+.*@gmail\.com$)|(smoke)|(claim-founder-)/i;

async function main() {
  const force = process.argv.includes('--force');
  const dryRun = !force;
  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE RESET ===');
  console.log('');

  // 1. Load Canterbury + current owner.
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: CANTERBURY_ID },
    include: {
      address: true,
      operator: { include: { user: true } },
      _count: { select: { photos: true, bookings: true, residents: true, inquiries: true, tourRequests: true } },
    },
  });
  if (!home) {
    console.error(`ERROR: home ${CANTERBURY_ID} not found.`);
    process.exit(1);
  }

  const currentOp = home.operator;
  const currentUser = currentOp?.user ?? null;

  console.log('Canterbury Commons:');
  console.log(`  id:            ${home.id}`);
  console.log(`  name:          ${home.name}`);
  console.log(`  status:        ${home.status}`);
  console.log(`  autoPopulated: ${home.autoPopulatedAt ? home.autoPopulatedAt.toISOString() : 'NO'}`);
  console.log(`  address:       ${home.address ? `${home.address.street}, ${home.address.city}, ${home.address.state} ${home.address.zipCode}` : 'none'}`);
  console.log(`  photos:        ${home._count.photos}`);
  console.log(`  activity:      bookings=${home._count.bookings} residents=${home._count.residents} inquiries=${home._count.inquiries} tours=${home._count.tourRequests}`);
  console.log(`  current owner: operator "${currentOp?.companyName ?? 'none'}" (${currentOp?.id ?? '-'})  user=${currentUser?.email ?? 'none'} (${currentUser?.id ?? '-'})`);
  console.log('');

  // 2. Resolve the directory placeholder operator (must already exist).
  const dirUser = await prisma.user.findUnique({ where: { email: DIRECTORY_EMAIL } });
  const dirOp = dirUser ? await prisma.operator.findUnique({ where: { userId: dirUser.id } }) : null;
  if (!dirOp) {
    console.error(`ERROR: directory placeholder operator not found (user ${DIRECTORY_EMAIL}). Run seed-cleveland-directory.ts first.`);
    process.exit(1);
  }
  console.log(`Directory operator: "${dirOp.companyName}" (${dirOp.id})  user=${DIRECTORY_EMAIL}`);
  if (dirOp.companyName !== DIRECTORY_OPERATOR_NAME) {
    console.log(`  (note: companyName is "${dirOp.companyName}", expected "${DIRECTORY_OPERATOR_NAME}" — using the operator resolved by email)`);
  }
  console.log('');

  const alreadyReset = currentOp?.id === dirOp.id && home.status === HomeStatus.DRAFT;
  if (alreadyReset) {
    console.log('Canterbury is ALREADY owned by the directory operator and DRAFT — ownership revert is a no-op.');
    console.log('');
  }

  // 3. Assess the smoke-test founder (the account currently owning Canterbury).
  let founderPlan: 'delete' | 'detach-only' | 'none' = 'none';
  let founderReason = '';
  if (currentOp && currentUser && currentOp.id !== dirOp.id) {
    const otherHomes = await prisma.assistedLivingHome.count({
      where: { operatorId: currentOp.id, id: { not: CANTERBURY_ID } },
    });
    const otherHomeRows = await prisma.assistedLivingHome.findMany({
      where: { operatorId: currentOp.id, id: { not: CANTERBURY_ID } },
      select: { _count: { select: { bookings: true, residents: true, inquiries: true, tourRequests: true } } },
    });
    const activity = otherHomeRows.reduce(
      (s, h) => s + h._count.bookings + h._count.residents + h._count.inquiries + h._count.tourRequests,
      0,
    );
    const emailIsTest = TEST_EMAIL.test(currentUser.email);

    console.log('Smoke-test founder assessment:');
    console.log(`  other homes owned (excl. Canterbury): ${otherHomes}`);
    console.log(`  activity on those homes:              ${activity}`);
    console.log(`  email looks like a test account:      ${emailIsTest} (${currentUser.email})`);

    if (otherHomes === 0 && activity === 0 && emailIsTest) {
      founderPlan = 'delete';
      founderReason = 'owns nothing else, no activity, test-pattern email';
    } else if (otherHomes === 0 && activity === 0) {
      founderPlan = 'detach-only';
      founderReason = 'empty but email is NOT a test account — refusing to delete; detached only';
    } else {
      founderPlan = 'detach-only';
      founderReason = `still owns ${otherHomes} home(s) / ${activity} activity record(s) — detached only`;
    }
    console.log(`  -> plan: ${founderPlan.toUpperCase()} (${founderReason})`);
    console.log('');
  }

  console.log('Planned actions:');
  console.log(`  1. Canterbury.operatorId -> ${dirOp.id} (directory), status -> DRAFT`);
  console.log('     (description / photos / address / autoPopulatedAt: PRESERVED)');
  console.log('  2. Clear any operator.seededHomeId still pointing at Canterbury (defensive).');
  if (founderPlan === 'delete') console.log(`  3. DELETE smoke-test founder ${currentUser?.email} (cascades its now-empty operator)`);
  else if (founderPlan === 'detach-only') console.log(`  3. KEEP founder ${currentUser?.email} (detached) — ${founderReason}`);
  console.log('');

  if (dryRun) {
    console.log('DRY RUN complete. Re-run with --force to execute.');
    return;
  }

  // 4. Revert ownership + status.
  if (!alreadyReset) {
    await prisma.assistedLivingHome.update({
      where: { id: CANTERBURY_ID },
      data: { operatorId: dirOp.id, status: HomeStatus.DRAFT },
    });
    console.log(`REVERTED: Canterbury -> directory operator (${dirOp.id}), status=DRAFT`);
  }

  // 5. Defensive: no operator should still claim Canterbury as its seeded home.
  const { count: clearedSeeded } = await prisma.operator.updateMany({
    where: { seededHomeId: CANTERBURY_ID },
    data: { seededHomeId: null },
  });
  if (clearedSeeded > 0) console.log(`CLEARED: seededHomeId on ${clearedSeeded} operator(s) that referenced Canterbury.`);

  // 6. Founder cleanup.
  if (founderPlan === 'delete' && currentUser) {
    await prisma.auditLog.updateMany({ where: { actionedBy: currentUser.id }, data: { actionedBy: null } });
    await prisma.auditLog.deleteMany({ where: { userId: currentUser.id } });
    await prisma.activityFeedItem.deleteMany({ where: { actorId: currentUser.id } });
    await prisma.user.delete({ where: { id: currentUser.id } });
    console.log(`DELETED: smoke-test founder ${currentUser.email} (${currentUser.id})`);
  } else if (founderPlan === 'detach-only' && currentUser) {
    console.log(`KEPT:    founder ${currentUser.email} left in place — ${founderReason}`);
  }

  // 7. Verify.
  const after = await prisma.assistedLivingHome.findUnique({
    where: { id: CANTERBURY_ID },
    include: { address: true, operator: { include: { user: true } }, _count: { select: { photos: true } } },
  });
  console.log('');
  console.log('Post-reset state:');
  console.log(`  status:          ${after?.status}`);
  console.log(`  owner:           "${after?.operator?.companyName}" (${after?.operator?.id})  user=${after?.operator?.user?.email}`);
  console.log(`  photos:          ${after?._count.photos}`);
  console.log(`  address:         ${after?.address ? `${after.address.street}, ${after.address.city}, ${after.address.state} ${after.address.zipCode}` : 'none'}`);
  console.log(`  autoPopulatedAt: ${after?.autoPopulatedAt ? after.autoPopulatedAt.toISOString() : 'NO'}`);
  console.log('');
  console.log('Reset complete. A fresh claim token for this home + vfoy@inspirahealthgroup.com will now work end-to-end.');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
