#!/usr/bin/env npx tsx
/**
 * scripts/hide-demo-caregivers.ts — OL-258 (hide, never delete)
 *
 * The marketplace already filters demo/seed/test caregivers at query time (src/lib/marketplace/real-caregivers.ts).
 * This one-off script makes the data match, so caregiver queries outside the marketplace (operator smart search,
 * shift auto-fill, on-call dispatch) never pick them up either.
 *
 * For every caregiver with isVisibleInMarketplace=true it applies the same rule as realCaregiverWhere():
 *   not User.isDemo; email not a demo/seed/test address; an Ohio address with a city.
 * Rows that fail get isVisibleInMarketplace=false. Nothing is deleted. Reversible by hand
 * (set isVisibleInMarketplace=true on a row). Idempotent.
 *
 * Usage (Render shell):
 *   npx tsx scripts/hide-demo-caregivers.ts            # dry-run: lists what would be hidden, writes nothing
 *   npx tsx scripts/hide-demo-caregivers.ts --force    # apply (only after Chris has reviewed the dry-run)
 */
import { PrismaClient } from '@prisma/client';
import { demoCaregiverReasons } from '../src/lib/marketplace/real-caregivers';

const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force');

async function main() {
  console.log(`=== OL-258 hide demo caregivers — ${FORCE ? 'APPLY (--force)' : 'DRY-RUN (no writes)'} ===\n`);
  const rows = await prisma.caregiver.findMany({
    where: { isVisibleInMarketplace: true },
    select: {
      id: true,
      isVisibleInMarketplace: true,
      backgroundCheckStatus: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true, isDemo: true, addresses: { select: { city: true, state: true } } } },
      backgroundCheckOrders: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  });

  const hide: typeof rows = [];
  const keep: typeof rows = [];
  for (const r of rows) (demoCaregiverReasons(r).length ? hide : keep).push(r);

  const where = (r: (typeof rows)[number]) => r.user.addresses.map((a) => `${a.city || '∅'}, ${a.state || '∅'}`).join(' | ') || 'no address';
  const line = (r: (typeof rows)[number]) =>
    `  ${r.id}  ${`${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim() || '(blank name)'}  <${r.user.email}>  [${where(r)}]  bg=${r.backgroundCheckStatus}${r.backgroundCheckOrders.length ? ' (has provider order)' : ''}`;

  console.log(`Visible in marketplace now: ${rows.length}`);
  console.log(`Would hide: ${hide.length}`);
  console.log(`Would keep (real, local): ${keep.length}\n`);

  const byReason = new Map<string, number>();
  for (const r of hide) for (const why of demoCaregiverReasons(r)) byReason.set(why, (byReason.get(why) ?? 0) + 1);
  console.log('Reasons (a row can have several):');
  for (const [why, n] of byReason) console.log(`  ${why}: ${n}`);

  console.log('\nTO HIDE:');
  for (const r of hide) console.log(`${line(r)}  ← ${demoCaregiverReasons(r).join(', ')}`);
  console.log('\nTO KEEP:');
  for (const r of keep) console.log(line(r));

  if (!FORCE) {
    console.log('\nDry-run only. Re-run with --force to set isVisibleInMarketplace=false on the TO HIDE rows.');
    return;
  }
  const res = await prisma.caregiver.updateMany({ where: { id: { in: hide.map((r) => r.id) } }, data: { isVisibleInMarketplace: false } });
  console.log(`\nHidden: ${res.count}. Nothing deleted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
