#!/usr/bin/env npx tsx
/**
 * scripts/report-founder-free-access.ts
 *
 * READ-ONLY, aggregate-only count of operators affected by the founding-operator free period
 * (`Operator.freeAccessUntil`, OL-244). Prints numbers only — no ids, names, emails or dates per record.
 * Writes nothing. Safe to run anytime.
 *
 * Usage (Render shell, or anywhere with the prod DATABASE_URL):
 *   npx tsx scripts/report-founder-free-access.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const [operators, withFreeAccess, freeAccessActive, freeAccessExpired, clevelandFounder, founderWithPlan] = await Promise.all([
    prisma.operator.count(),
    prisma.operator.count({ where: { freeAccessUntil: { not: null } } }),
    prisma.operator.count({ where: { freeAccessUntil: { gt: now } } }),
    prisma.operator.count({ where: { freeAccessUntil: { lte: now } } }),
    prisma.operator.count({ where: { clevelandFounder: true } }),
    prisma.operator.count({ where: { freeAccessUntil: { not: null }, subscriptionPlan: { not: null } } }),
  ]);
  console.log(JSON.stringify({ operators, withFreeAccess, freeAccessActive, freeAccessExpired, clevelandFounder, founderWithPlan }, null, 2));
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
