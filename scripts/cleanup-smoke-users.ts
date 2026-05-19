#!/usr/bin/env ts-node
/**
 * Deletes smoke-test users older than 7 days.
 * Smoke-test users are identified by their email matching: smoke-*@test.carelinkai.com
 * Run: npx ts-node scripts/cleanup-smoke-users.ts
 */
import { PrismaClient } from '@prisma/client';

const SMOKE_EMAIL_PATTERN = '%@test.carelinkai.com';
const MAX_AGE_DAYS = 7;

async function main() {
  const prisma = new PrismaClient();
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  try {
    const stale = await prisma.user.findMany({
      where: {
        email: { contains: '@test.carelinkai.com' },
        createdAt: { lt: cutoff },
      },
      select: { id: true, email: true, createdAt: true },
    });

    console.log(`Found ${stale.length} stale smoke-test users (older than ${MAX_AGE_DAYS} days)`);
    if (stale.length === 0) {
      console.log('Nothing to clean up.');
      return;
    }

    const ids = stale.map((u) => u.id);
    const { count } = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted ${count} users.`);
    for (const u of stale) {
      console.log(`  - ${u.email} (created ${u.createdAt.toISOString()})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('cleanup-smoke-users failed:', err);
  process.exit(1);
});
