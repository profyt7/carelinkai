#!/usr/bin/env npx tsx
/**
 * scripts/report-claim-funnel.ts
 *
 * Read-only tracker for the proactive claim-nudge pilot (send-claim-nudges.ts).
 * Answers: of the listings we've nudged, how many have been CLAIMED?
 *
 * A directory listing is "claimed" when its ownership transfers off the directory
 * sentinel operator (directory-unclaimed@carelinkai.system) to a real operator — so
 * we look at EVERY home that has a claimNudgeLastSentAt stamp (claimed homes have
 * left the sentinel, so we can't filter by the sentinel operator), and classify by
 * current owner.
 *
 * Note: open/click metrics live in Resend, not our DB — check the Resend dashboard
 * for those. This reports the metric that matters: claims (the conversion).
 *
 * Writes nothing. Safe to run anytime.
 *
 * Usage:
 *   npx tsx scripts/report-claim-funnel.ts            # summary + claimed list
 *   npx tsx scripts/report-claim-funnel.ts --tsv      # tab-separated rows
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

async function main() {
  const tsv = process.argv.includes('--tsv');

  const homes = await prisma.assistedLivingHome.findMany({
    where: { claimNudgeLastSentAt: { not: null } },
    select: {
      id: true,
      name: true,
      status: true,
      outreachEmail: true,
      claimNudgeLastSentAt: true,
      operator: { select: { user: { select: { email: true } } } },
    },
    orderBy: { claimNudgeLastSentAt: 'desc' },
  });

  const rows = homes.map((h) => {
    const owner = (h.operator?.user?.email ?? '').toLowerCase();
    const claimed = owner !== DIRECTORY_UNCLAIMED_EMAIL;
    return {
      homeId: h.id,
      name: h.name,
      status: h.status,
      claimed: claimed ? 'CLAIMED' : 'pending',
      owner: claimed ? owner : '(unclaimed)',
      nudgedAt: h.claimNudgeLastSentAt ? h.claimNudgeLastSentAt.toISOString().slice(0, 10) : '',
      outreachEmail: h.outreachEmail ?? '',
    };
  });

  const claimed = rows.filter((r) => r.claimed === 'CLAIMED');

  if (tsv) {
    console.log(['homeId', 'name', 'status', 'claimed', 'owner', 'nudgedAt', 'outreachEmail'].join('\t'));
    for (const r of rows) {
      console.log([r.homeId, r.name, r.status, r.claimed, r.owner, r.nudgedAt, r.outreachEmail].join('\t'));
    }
    return;
  }

  console.log('=== Claim-nudge funnel ===\n');
  console.log(`Nudged (total):  ${rows.length}`);
  console.log(`Claimed:         ${claimed.length}`);
  const rate = rows.length ? ((claimed.length / rows.length) * 100).toFixed(1) : '0.0';
  console.log(`Claim rate:      ${rate}%\n`);

  if (claimed.length) {
    console.log('🎉 Claimed listings:');
    for (const r of claimed) {
      console.log(`  ✓ "${r.name}" — claimed by ${r.owner} (nudged ${r.nudgedAt})`);
    }
    console.log('');
  }

  console.log('Still pending (nudged, not yet claimed):');
  for (const r of rows.filter((r) => r.claimed !== 'CLAIMED')) {
    console.log(`  · "${r.name}" — ${r.outreachEmail} (nudged ${r.nudgedAt})`);
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
