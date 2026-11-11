#!/usr/bin/env npx tsx
/**
 * scripts/rename-demo-emails-to-test.ts — one-off
 *
 * carelinkai.com is not our domain. Seed/demo logins created on it (operator+seed@, family.seed1@, admin@,
 * *@test.carelinkai.com …) are renamed to the .test addresses the seeds now use (src/lib/admin/demo-email-rename.ts).
 * Since the send-guard (src/lib/email/recipient-guard.ts) these rows already receive no mail; this keeps the
 * stored addresses honest. Only User.email changes — no row is deleted, no password, role or flag changes.
 *
 * Effects to expect:
 *   - Anyone logged in as one of these accounts is signed out on their next request (the session's email no
 *     longer matches) and must log in with the new address.
 *   - Copies of the old address elsewhere (Inquiry.contactEmail, InboundLead, audit logs) are not rewritten.
 *
 * Dry-run by default: prints every carelinkai.com user, what it would become, and why (or why skipped).
 * Usage (Render shell):
 *   npx tsx scripts/rename-demo-emails-to-test.ts                                  # dry-run
 *   npx tsx scripts/rename-demo-emails-to-test.ts --exclude=a@carelinkai.com,b@…   # dry-run, keep those
 *   npx tsx scripts/rename-demo-emails-to-test.ts --map=admin@carelinkai.com=you@getcarelinkai.com
 *                                                   # dry-run; that login moves to the given address instead of .test
 *   npx tsx scripts/rename-demo-emails-to-test.ts --force [--exclude=…] [--map=…]  # apply (one transaction)
 */
import { PrismaClient } from '@prisma/client';
import { parseRenameMap, planDemoEmailRenames } from '../src/lib/admin/demo-email-rename';

const SAFETY_LIMIT = 300; // abort if more carelinkai.com users than this — likely a bad query

async function main() {
  const prisma = new PrismaClient();
  const force = process.argv.includes('--force');
  const excludeArg = process.argv.find((a) => a.startsWith('--exclude='));
  const exclude = new Set((excludeArg?.slice('--exclude='.length) ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const overrides = parseRenameMap(process.argv.find((a) => a.startsWith('--map='))?.slice('--map='.length));
  try {
    console.log(`=== rename carelinkai.com demo logins → .test — ${force ? 'APPLY (--force)' : 'DRY-RUN'} ===\n`);
    const users = await prisma.user.findMany({
      where: { OR: [{ email: { endsWith: '@carelinkai.com', mode: 'insensitive' } }, { email: { endsWith: '.carelinkai.com', mode: 'insensitive' } }] },
      select: { id: true, email: true, role: true, isDemo: true, lastLoginAt: true },
      orderBy: { email: 'asc' },
    });
    if (users.length > SAFETY_LIMIT) {
      console.error(`ABORT: ${users.length} users match — exceeds safety limit ${SAFETY_LIMIT}. Investigate before running.`);
      process.exitCode = 1;
      return;
    }
    const plannedTargets = planDemoEmailRenames(users, new Set(), exclude, overrides).map((r) => r.to).filter((t): t is string => !!t);
    const existing = new Set(
      (await prisma.user.findMany({ where: { email: { in: plannedTargets } }, select: { email: true } })).map((u) => u.email.toLowerCase())
    );
    const plan = planDemoEmailRenames(users, existing, exclude, overrides);

    for (const r of plan) {
      const last = r.lastLoginAt ? r.lastLoginAt.toISOString().slice(0, 10) : 'never';
      console.log(`${r.action === 'rename' ? 'RENAME' : 'skip  '}  ${r.email.padEnd(44)} → ${(r.to ?? '—').padEnd(46)} ${r.role.padEnd(18)} demo=${r.isDemo ? 'Y' : 'n'} lastLogin=${last}  (${r.why})`);
    }
    const renames = plan.filter((r) => r.action === 'rename');
    const activeAdmins = renames.filter((r) => r.role === 'ADMIN' && r.lastLoginAt && r.why !== 'mapped (--map)');
    console.log(`\n${users.length} carelinkai.com user(s): ${renames.length} to rename, ${plan.length - renames.length} skipped.`);
    for (const r of renames.filter((x) => x.why === 'mapped (--map)')) {
      console.log(`ℹ ${r.email} → ${r.to} is a real inbox: password resets and notices for this ${r.role} login go there from now on.`);
    }
    for (const [from] of overrides) {
      if (!users.some((u) => u.email.toLowerCase() === from)) console.log(`⚠ --map ${from}: no such carelinkai.com user — ignored.`);
    }
    if (activeAdmins.length) {
      console.log(`⚠ ${activeAdmins.length} ADMIN login(s) above have logged in before — their login address changes. Use --exclude= to keep any you still use.`);
    }

    if (!force) {
      console.log('\nDry-run only. Re-run with --force to apply.');
      return;
    }
    await prisma.$transaction(renames.map((r) => prisma.user.update({ where: { id: r.id }, data: { email: r.to! } })));
    console.log(`\n✅ Renamed ${renames.length} user(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
