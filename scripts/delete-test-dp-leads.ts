/**
 * delete-test-dp-leads.ts — remove the seeded TEST rows from the DPLead table.
 *
 * TIGHTLY scoped so no real lead is ever touched: matches ONLY rows where the
 * planner name starts with "TEST" AND hospital is exactly "TEST Hospital"
 * (the signature of the manual test submissions — e.g. "TEST", "TEST 2", …,
 * hospital "TEST Hospital", profyt7@gmail.com). A real lead like "Karen Lockman"
 * at a real hospital can't match either clause.
 *
 * Dry-run by default: it prints the exact rows that WOULD be deleted so you can
 * eyeball them first. Pass --force to actually delete. A safety cap (--max,
 * default 25) refuses to delete if the match set is unexpectedly large.
 *
 * Usage (Render shell, on the deployed code):
 *   npx tsx scripts/delete-test-dp-leads.ts            # DRY RUN — show matches
 *   npx tsx scripts/delete-test-dp-leads.ts --force    # DELETE the matched rows
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const FORCE = process.argv.includes('--force');
const MAX = Number(argValue('--max') ?? 25);

// The ONLY match criteria — both must hold.
const WHERE = { name: { startsWith: 'TEST' }, hospital: 'TEST Hospital' } as const;

async function main() {
  const matches = await prisma.dPLead.findMany({
    where: WHERE,
    select: { id: true, name: true, email: true, hospital: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n=== delete-test-dp-leads ${FORCE ? '(DELETE)' : '(DRY RUN — pass --force to delete)'} ===`);
  console.log(`Match criteria: name starts with "TEST" AND hospital = "TEST Hospital"`);
  console.log(`Matched rows: ${matches.length}\n`);

  if (matches.length === 0) {
    console.log('Nothing to delete — no rows match. (Already cleaned up?)\n');
    return;
  }

  for (const m of matches) {
    console.log(`  • ${m.name.padEnd(10)} | ${m.hospital} | ${m.email} | status=${m.status} | ${m.createdAt.toISOString().slice(0, 10)} | id=${m.id}`);
  }

  if (!FORCE) {
    console.log(`\nDRY RUN — nothing deleted. Verify the ${matches.length} row(s) above, then re-run with --force.\n`);
    return;
  }

  if (matches.length > MAX) {
    console.error(`\n⛔ ABORT: ${matches.length} matches exceeds the safety cap (--max ${MAX}). That's more TEST rows than expected — inspect before deleting, or raise --max deliberately.\n`);
    process.exit(1);
  }

  const result = await prisma.dPLead.deleteMany({ where: WHERE });
  console.log(`\n✅ Deleted ${result.count} test lead(s).\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
