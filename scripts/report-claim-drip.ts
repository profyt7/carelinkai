/**
 * report-claim-drip.ts  (READ-ONLY)
 *
 * Claim-drip funnel + inquiry→claim attribution by touch. For every home that has
 * started a drip, reports active step distribution, stop reasons, and — the key
 * metric — how many got CLAIMED after N touches (claimed = no longer owned by the
 * directory sentinel). Run anytime to see which touch is converting.
 *
 * Usage (Render shell): npx tsx scripts/report-claim-drip.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

async function main() {
  const homes = await prisma.assistedLivingHome.findMany({
    where: { claimDripStartedAt: { not: null } },
    select: {
      id: true, name: true, claimDripStep: true, claimDripStartedAt: true,
      claimDripNextAt: true, claimDripStoppedReason: true,
      operator: { select: { user: { select: { email: true } } } },
    },
    orderBy: { claimDripStartedAt: 'asc' },
  });

  const isClaimed = (e?: string | null) => (e ?? '').toLowerCase() !== DIRECTORY_UNCLAIMED_EMAIL;

  const started = homes.length;
  const claimedHomes = homes.filter((h) => isClaimed(h.operator?.user?.email));
  const activeHomes = homes.filter((h) => !isClaimed(h.operator?.user?.email) && !h.claimDripStoppedReason);

  // Claims attributed by the number of touches that had been sent.
  const claimsByTouch: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const h of claimedHomes) {
    const t = Math.min(4, Math.max(1, h.claimDripStep || 1));
    claimsByTouch[t] = (claimsByTouch[t] ?? 0) + 1;
  }

  const stepDist: Record<number, number> = {};
  for (const h of activeHomes) stepDist[h.claimDripStep] = (stepDist[h.claimDripStep] ?? 0) + 1;

  const stopReasons: Record<string, number> = {};
  for (const h of homes) {
    if (h.claimDripStoppedReason && !isClaimed(h.operator?.user?.email)) {
      stopReasons[h.claimDripStoppedReason] = (stopReasons[h.claimDripStoppedReason] ?? 0) + 1;
    }
  }

  console.log('\n=== Claim-drip funnel (READ-ONLY) ===');
  console.log(`Drips started:        ${started}`);
  console.log(`Currently active:     ${activeHomes.length}  (by touches sent: ${JSON.stringify(stepDist)})`);
  console.log(`Claimed:              ${claimedHomes.length}  (${started ? ((claimedHomes.length / started) * 100).toFixed(0) : '0'}% of started)`);
  console.log(`  └─ claims by touch: 1:${claimsByTouch[1]}  2:${claimsByTouch[2]}  3:${claimsByTouch[3]}  4:${claimsByTouch[4]}`);
  console.log(`Stopped (not claimed): ${JSON.stringify(stopReasons)}`);
  console.log('\nNote: a claim is attributed to the touch count sent before it. The cron also');
  console.log('marks stoppedReason=claimed on its next run; this report detects claims live.');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
