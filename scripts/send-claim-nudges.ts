#!/usr/bin/env npx tsx
/**
 * scripts/send-claim-nudges.ts
 *
 * PROACTIVE batch claim-nudge sender. The existing nudge engine
 * (src/lib/claim-engine/inquiry-claim-notification.ts) only fires reactively when a
 * family inquiry lands on an unclaimed listing. This script lets us deliberately
 * invite operators to claim their free directory listing, in controlled batches.
 *
 * It reuses the same primitives as the reactive engine — signed 45-day claim token
 * (src/lib/claim-token.ts) + the 24h `claimNudgeLastSentAt` throttle — but sends the
 * HONEST proactive copy (sendDirectoryClaimInviteEmail), NOT the "families are trying
 * to reach you" inquiry copy (which would be false with zero inquiries).
 *
 * PILOT-FIRST: defaults to the HIGH-confidence tier (named decision-makers, best
 * deliverability) so we can measure opens/claims before scaling. The loader
 * (load-directory-outreach-contacts.ts) stamped preFilledFields.outreachEmail with the
 * Cowork confidence ('HIGH'/'MEDIUM'), which is how we tier here.
 *
 * Targets: ACTIVE listings still owned by the directory sentinel operator (i.e. truly
 * unclaimed + public), with an outreachEmail set, not nudged within the throttle window.
 *
 * SAFETY:
 *   - DRY-RUN BY DEFAULT. Prints exactly who would be emailed + the claim URL. No send,
 *     no DB write. Sending requires --force.
 *   - Tiered: --tier high (default) | medium | all. `all` REQUIRES an explicit --limit
 *     so a full blast is never one keystroke away.
 *   - 24h throttle respected (won't re-nudge a recently-nudged home).
 *   - --limit N caps the batch. Email-only (no SMS) for the pilot.
 *
 * Usage:
 *   npx tsx scripts/send-claim-nudges.ts                       # DRY RUN, high tier
 *   npx tsx scripts/send-claim-nudges.ts --limit 5             # DRY RUN, first 5 high
 *   npx tsx scripts/send-claim-nudges.ts --force               # SEND high tier
 *   npx tsx scripts/send-claim-nudges.ts --tier medium --force # SEND high+medium
 *   npx tsx scripts/send-claim-nudges.ts --tier all --limit 20 --force
 */

import { PrismaClient } from '@prisma/client';
import { signClaimToken, DEFAULT_CLAIM_TOKEN_TTL_HOURS } from '../src/lib/claim-token';
import { sendDirectoryClaimInviteEmail } from '../src/lib/email';

const prisma = new PrismaClient();

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
const THROTTLE_HOURS = 24;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function buildClaimUrl(homeId: string, operatorEmail: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const token = signClaimToken(
    { operatorEmail: operatorEmail.toLowerCase(), homeId, clevelandFounder: true, iat: now, exp: now + DEFAULT_CLAIM_TOKEN_TTL_HOURS * 3600 },
    secret,
  );
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com';
  return `${appUrl.replace(/\/$/, '')}/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;
}

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;
  const tier = (argValue('--tier') ?? 'high').toLowerCase();
  const limitRaw = argValue('--limit');
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  if (!['high', 'medium', 'all'].includes(tier)) {
    console.error(`Invalid --tier "${tier}" (use: high | medium | all)`);
    process.exit(1);
  }
  if (tier === 'all' && !limit) {
    console.error('Refusing "--tier all" without an explicit --limit (guards against a full blast). Add e.g. --limit 20.');
    process.exit(1);
  }

  console.log(dryRun ? '=== DRY RUN — no emails sent ===' : '=== LIVE — sending claim invites ===');
  console.log(`Tier: ${tier}${limit ? `  ·  limit: ${limit}` : ''}\n`);

  const seedUser = await prisma.user.findUnique({ where: { email: DIRECTORY_UNCLAIMED_EMAIL } });
  const seedOperator = seedUser
    ? await prisma.operator.findUnique({ where: { userId: seedUser.id } })
    : null;
  if (!seedOperator) {
    console.error('Directory seed operator not found — aborting.');
    process.exit(1);
  }

  const secret = process.env['NEXTAUTH_SECRET'] || '';
  if (!secret) {
    console.error('NEXTAUTH_SECRET not set — cannot mint claim links. Aborting.');
    process.exit(1);
  }

  const throttleCutoff = new Date(Date.now() - THROTTLE_HOURS * 3600 * 1000);

  const homes = await prisma.assistedLivingHome.findMany({
    where: {
      operatorId: seedOperator.id,
      status: 'ACTIVE',
      outreachEmail: { not: null },
      OR: [{ claimNudgeLastSentAt: null }, { claimNudgeLastSentAt: { lt: throttleCutoff } }],
    },
    select: { id: true, name: true, outreachEmail: true, claimNudgeLastSentAt: true, preFilledFields: true },
    orderBy: { name: 'asc' },
  });

  const tierAllows = (conf: string | undefined): boolean => {
    if (tier === 'all') return true;
    if (tier === 'medium') return conf === 'HIGH' || conf === 'MEDIUM';
    return conf === 'HIGH';
  };

  let eligible = homes.filter((h) => {
    const conf = (h.preFilledFields as Record<string, string> | null)?.outreachEmail;
    return tierAllows(conf);
  });
  const totalEligible = eligible.length;
  if (limit) eligible = eligible.slice(0, limit);

  let sent = 0;
  let failed = 0;

  for (const h of eligible) {
    const email = h.outreachEmail!.trim();
    const conf = (h.preFilledFields as Record<string, string> | null)?.outreachEmail ?? '?';
    const claimUrl = buildClaimUrl(h.id, email, secret);

    if (dryRun) {
      console.log(`  ✉ WOULD SEND → ${email} [${conf}]  "${h.name}"`);
      continue;
    }

    const ok = await sendDirectoryClaimInviteEmail({ facilityName: h.name, toEmail: email, claimUrl });
    if (ok) {
      await prisma.assistedLivingHome.update({ where: { id: h.id }, data: { claimNudgeLastSentAt: new Date() } });
      console.log(`  ✅ SENT → ${email} [${conf}]  "${h.name}"`);
      sent++;
    } else {
      console.log(`  ❌ FAILED → ${email}  "${h.name}" (left un-throttled to retry)`);
      failed++;
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`Eligible (tier=${tier}, not throttled): ${totalEligible}`);
  console.log(`${dryRun ? 'Would send' : 'Sent'}: ${dryRun ? eligible.length : sent}`);
  if (!dryRun && failed) console.log(`Failed:    ${failed}`);
  console.log('─────────────────────────────────────────────');
  if (dryRun) console.log('\nDRY RUN complete. Re-run with --force to actually send.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
