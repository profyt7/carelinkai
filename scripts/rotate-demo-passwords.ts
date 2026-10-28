#!/usr/bin/env npx tsx
/**
 * scripts/rotate-demo-passwords.ts — OL-212
 *
 * Sets every seeded demo / test login to DEMO_ACCOUNT_PASSWORD. The old seed
 * passwords were literals in a repo that is going public, so any row a seed
 * ever created must stop accepting them. Use this in production instead of
 * re-running the seeds (`npm run seed` also inserts mock caregivers and jobs;
 * `seed:demo` refuses remote databases).
 *
 * Which users:
 *   - DEMO_EMAIL_RE (demo.*@carelinkai.test, *@test.carelinkai.com,
 *     *+seed@carelinkai.com, family.seed*@carelinkai.com)
 *   - *@example.com (prisma/seed.ts mock caregivers / families)
 *   - the fixed seed logins in SEED_LOGINS below
 * Only the password hash changes; nothing is deleted. Dry-run by default.
 *
 * Usage (Render shell, after setting DEMO_ACCOUNT_PASSWORD on the service):
 *   npx tsx scripts/rotate-demo-passwords.ts            # dry-run: lists the users
 *   npx tsx scripts/rotate-demo-passwords.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEMO_EMAIL_RE, demoAccountPassword } from '../src/lib/admin/demo-identity';

// Every fixed @carelinkai.com login a seed script or setup.sh has created.
const SEED_LOGINS = [
  'admin@carelinkai.com',
  'operator@carelinkai.com',
  'family@carelinkai.com',
  'family2@carelinkai.com',
  'demo.discharge@carelinkai.com',
  'admin.test@carelinkai.com',
  'operator.test@carelinkai.com',
  'caregiver.test@carelinkai.com',
  'family.test@carelinkai.com',
];

const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force');

function isSeededLogin(email: string): boolean {
  const e = email.toLowerCase();
  return DEMO_EMAIL_RE.test(e) || e.endsWith('@example.com') || SEED_LOGINS.includes(e);
}

async function main() {
  const password = demoAccountPassword(); // throws before touching the DB if unset
  console.log(`=== OL-212 demo password rotation — ${FORCE ? 'APPLY (--force)' : 'DRY-RUN'} ===\n`);

  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  const targets = users.filter((u) => isSeededLogin(u.email));
  for (const u of targets) console.log(`  USER  ${u.email} (${u.role})`);

  if (FORCE && targets.length > 0) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.updateMany({
      where: { id: { in: targets.map((u) => u.id) } },
      data: { passwordHash },
    });
  }

  console.log(`\n${FORCE ? 'Rotated' : 'Would rotate'}: ${targets.length} user(s). Nothing deleted.`);
  if (!FORCE && targets.length) console.log('Re-run with --force to write.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
