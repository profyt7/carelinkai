#!/usr/bin/env npx tsx
/**
 * scripts/cleanup-test-operators.ts
 *
 * Removes test operator accounts created during pre-launch testing
 * (email pattern: profyt7+*@gmail.com) and reverts any homes they claimed
 * back to the CareLinkAI Directory placeholder operator in DRAFT status.
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-operators.ts --dry-run   # preview only (default)
 *   npx tsx scripts/cleanup-test-operators.ts --force     # execute
 *
 * Idempotent: safe to run multiple times.
 *
 * Cascade behaviour:
 *   - Homes owned by test operator → operatorId reset to directory placeholder, status → DRAFT
 *   - AuditLog.actionedBy references to test user → set null (preserve log record)
 *   - AuditLog records where test user is the SUBJECT → deleted (no PHI compliance need)
 *   - ActivityFeedItem records where test user is the actor → deleted
 *   - User delete cascades to: Operator, Session, Notification, Caregiver, Family, and
 *     all other user-owned records via onDelete: Cascade in the schema
 */

import { PrismaClient, HomeStatus } from '@prisma/client';

const prisma = new PrismaClient();
const DIRECTORY_EMAIL = 'directory-unclaimed@carelinkai.system';

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE CLEANUP ===');
  console.log('');

  // 1. Resolve directory placeholder operator
  const directoryUser = await prisma.user.findUnique({ where: { email: DIRECTORY_EMAIL } });
  if (!directoryUser) {
    console.error('ERROR: Directory placeholder user not found. Run seed-cleveland-directory.ts first.');
    process.exit(1);
  }
  const directoryOp = await prisma.operator.findUnique({ where: { userId: directoryUser.id } });
  if (!directoryOp) {
    console.error('ERROR: Directory operator record not found.');
    process.exit(1);
  }
  console.log(`Directory operator: ${directoryOp.companyName} (${directoryOp.id})\n`);

  // 2. Find test users matching profyt7+*@gmail.com
  const testUsers = await prisma.user.findMany({
    where: {
      AND: [
        { email: { startsWith: 'profyt7+' } },
        { email: { endsWith: '@gmail.com' } },
      ],
    },
    include: {
      operator: {
        include: {
          homes: { include: { address: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (testUsers.length === 0) {
    console.log('No test users found matching profyt7+*@gmail.com — nothing to do.');
    return;
  }

  console.log(`Found ${testUsers.length} test user(s):\n`);

  let totalHomesToRevert = 0;
  let totalAuditLogsToDelete = 0;
  let totalActivityToDelete = 0;

  for (const user of testUsers) {
    const op = user.operator;
    const homes = op?.homes ?? [];

    const auditLogCount = await prisma.auditLog.count({ where: { userId: user.id } });
    const activityCount = await prisma.activityFeedItem.count({ where: { actorId: user.id } });
    const actionedByCount = await prisma.auditLog.count({ where: { actionedBy: user.id } });

    console.log(`  User:     ${user.email}`);
    console.log(`  ID:       ${user.id}`);
    console.log(`  Role:     ${user.role}  Status: ${user.status}  Created: ${user.createdAt.toISOString().slice(0, 10)}`);
    console.log(`  Operator: ${op ? `"${op.companyName}" (${op.id})` : 'none'}`);

    if (homes.length > 0) {
      for (const h of homes) {
        const loc = h.address ? `${h.address.city}, ${h.address.state}` : 'no address';
        console.log(`    HOME → REVERT: "${h.name}" (${h.id})  status=${h.status}  loc=${loc}`);
        totalHomesToRevert++;
      }
    } else {
      console.log(`    Homes: none`);
    }

    console.log(`    AuditLogs (subject):  ${auditLogCount}  → will DELETE`);
    console.log(`    AuditLogs (actor):    ${actionedByCount}  → will NULL actionedBy (log preserved)`);
    console.log(`    ActivityFeedItems:    ${activityCount}  → will DELETE`);
    console.log('');

    totalAuditLogsToDelete += auditLogCount;
    totalActivityToDelete += activityCount;
  }

  console.log('─────────────────────────────────────────────');
  console.log(`Test users to delete:        ${testUsers.length}`);
  console.log(`Homes to revert → DRAFT:     ${totalHomesToRevert}`);
  console.log(`AuditLogs to delete:         ${totalAuditLogsToDelete}`);
  console.log(`ActivityFeedItems to delete: ${totalActivityToDelete}`);
  console.log('─────────────────────────────────────────────');
  console.log('');

  if (dryRun) {
    console.log('DRY RUN complete. No changes written.');
    console.log('Re-run with --force to execute.');
    return;
  }

  // 3. Execute cleanup
  let revertedHomes = 0;
  let deletedAuditLogs = 0;
  let deletedActivity = 0;
  let deletedUsers = 0;

  for (const user of testUsers) {
    const op = user.operator;
    const homes = op?.homes ?? [];

    // 3a. Revert homes to directory operator, status DRAFT
    for (const home of homes) {
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: {
          operatorId: directoryOp.id,
          status: HomeStatus.DRAFT,
        },
      });
      console.log(`REVERTED: "${home.name}" → directory operator, status=DRAFT`);
      revertedHomes++;
    }

    // 3b. Null out actionedBy where this user was the admin/actor (preserve log record)
    await prisma.auditLog.updateMany({
      where: { actionedBy: user.id },
      data: { actionedBy: null },
    });

    // 3c. Delete audit logs where test user is the subject
    const { count: logCount } = await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    deletedAuditLogs += logCount;

    // 3d. Delete ActivityFeedItem where test user is the actor
    const { count: actCount } = await prisma.activityFeedItem.deleteMany({ where: { actorId: user.id } });
    deletedActivity += actCount;

    // 3e. Delete user — cascades to Operator, Sessions, Notifications, and all
    //     other records with onDelete: Cascade pointing to User.
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`DELETED:  user ${user.email} (${user.id})`);
    deletedUsers++;
  }

  console.log('');
  console.log('─────────────────────────────────────────────');
  console.log(`Homes reverted to DRAFT:     ${revertedHomes}`);
  console.log(`AuditLogs deleted:           ${deletedAuditLogs}`);
  console.log(`ActivityFeedItems deleted:   ${deletedActivity}`);
  console.log(`Users deleted:               ${deletedUsers}`);
  console.log('─────────────────────────────────────────────');
  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
