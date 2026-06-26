#!/usr/bin/env npx tsx
/**
 * scripts/send-claim-nudges.ts
 *
 * PROACTIVE batch claim-nudge sender, COLLAPSED BY UNIQUE EMAIL. The reactive engine
 * (src/lib/claim-engine/inquiry-claim-notification.ts) only fires on a real family
 * inquiry; this deliberately invites operators to claim their free directory listing(s).
 *
 * KEY BEHAVIORS:
 *   - Collapse by lower(outreachEmail): exactly ONE email per unique address, never one
 *     per home. When an address maps to several unclaimed communities (e.g.
 *     marketing@csig.com → many StoryPoint homes), the single email lists each community
 *     with its OWN claim link, so the recipient claims them all from one message.
 *   - Targets ACTIVE listings owned by the directory sentinel (truly unclaimed + public).
 *     INACTIVE/archived homes are excluded entirely.
 *   - Suppression: skips any address on the EmailSuppression list (unsubscribes/bounces).
 *   - Throttle: 24h PER ADDRESS (an address is throttled if ANY of its homes was nudged
 *     in the last 24h). On send, claimNudgeLastSentAt is stamped on every home in the group.
 *   - CAN-SPAM: each email carries a one-click unsubscribe link (+ List-Unsubscribe header)
 *     and the company physical address. The script REFUSES to send if COMPANY_POSTAL_ADDRESS
 *     is unset/placeholder.
 *
 * Tiers (by preFilledFields.outreachEmail confidence): high (default) | medium | all.
 * DRY-RUN BY DEFAULT — prints the collapsed unique-send list (address → [homes]) and a
 * sample rendered email; --force to actually send. `--tier all` requires an explicit --limit.
 *
 * Usage:
 *   npx tsx scripts/send-claim-nudges.ts                        # DRY RUN, high tier
 *   npx tsx scripts/send-claim-nudges.ts --tier medium          # DRY RUN, high+medium
 *   npx tsx scripts/send-claim-nudges.ts --tier medium --force  # SEND
 */

import { PrismaClient } from '@prisma/client';
import { signClaimToken, DEFAULT_CLAIM_TOKEN_TTL_HOURS } from '../src/lib/claim-token';
import { signUnsubscribeToken } from '../src/lib/unsubscribe-token';
import { sendDirectoryClaimInviteEmail } from '../src/lib/email';

const prisma = new PrismaClient();

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
const THROTTLE_HOURS = 24;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

function claimUrl(homeId: string, operatorEmail: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const token = signClaimToken(
    { operatorEmail: operatorEmail.toLowerCase(), homeId, clevelandFounder: true, iat: now, exp: now + DEFAULT_CLAIM_TOKEN_TTL_HOURS * 3600 },
    secret,
  );
  // → /claim landing page: works for first-timers (redirects to register/redeem) AND for
  //   already-signed-in operators (re-arm + claim), so one collapsed email can claim many homes.
  return `${appUrl()}/claim?token=${encodeURIComponent(token)}`;
}

function unsubscribeUrl(email: string, secret: string): string {
  return `${appUrl()}/api/outreach/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(email, secret))}`;
}

/** A real postal address must be configured for CAN-SPAM. Reject obvious placeholders. */
function postalAddressOrNull(): string | null {
  const v = (process.env['COMPANY_POSTAL_ADDRESS'] || '').trim();
  if (!v || /your address|placeholder|street address|123 /i.test(v)) return null;
  return v;
}

type HomeRow = { id: string; name: string; outreachEmail: string; claimNudgeLastSentAt: Date | null; preFilledFields: unknown };

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;
  const tier = (argValue('--tier') ?? 'high').toLowerCase();
  const limitRaw = argValue('--limit');
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  if (!['high', 'medium', 'all'].includes(tier)) { console.error(`Invalid --tier "${tier}"`); process.exit(1); }
  if (tier === 'all' && !limit) { console.error('Refusing "--tier all" without --limit.'); process.exit(1); }

  const secret = process.env['NEXTAUTH_SECRET'] || '';
  if (!secret) { console.error('NEXTAUTH_SECRET not set — aborting.'); process.exit(1); }

  const postalAddress = postalAddressOrNull();
  if (!dryRun && !postalAddress) {
    console.error('\n⛔ COMPANY_POSTAL_ADDRESS is not set (or is a placeholder).');
    console.error('   CAN-SPAM requires a real physical mailing address in every cold email.');
    console.error('   Set COMPANY_POSTAL_ADDRESS in Render env, then re-run with --force.\n');
    process.exit(1);
  }
  const addrForRender = postalAddress ?? '«SET COMPANY_POSTAL_ADDRESS BEFORE --force»';

  console.log(dryRun ? '=== DRY RUN — no emails sent ===' : '=== LIVE — sending claim invites ===');
  console.log(`Tier: ${tier}${limit ? `  ·  limit (unique sends): ${limit}` : ''}\n`);

  const seedUser = await prisma.user.findUnique({ where: { email: DIRECTORY_UNCLAIMED_EMAIL } });
  const seedOperator = seedUser ? await prisma.operator.findUnique({ where: { userId: seedUser.id } }) : null;
  if (!seedOperator) { console.error('Directory seed operator not found — aborting.'); process.exit(1); }

  // Suppression set (unsubscribes / bounces) — lowercased.
  const suppressed = new Set((await prisma.emailSuppression.findMany({ select: { email: true } })).map((s) => s.email.toLowerCase()));

  const homes = (await prisma.assistedLivingHome.findMany({
    where: { operatorId: seedOperator.id, status: 'ACTIVE', outreachEmail: { not: null } },
    select: { id: true, name: true, outreachEmail: true, claimNudgeLastSentAt: true, preFilledFields: true },
    orderBy: { name: 'asc' },
  })) as HomeRow[];

  const tierAllows = (conf: string | undefined): boolean =>
    tier === 'all' ? true : tier === 'medium' ? conf === 'HIGH' || conf === 'MEDIUM' : conf === 'HIGH';

  const eligibleHomes = homes.filter((h) => tierAllows((h.preFilledFields as Record<string, string> | null)?.outreachEmail));

  // Collapse by lower(email).
  const groups = new Map<string, HomeRow[]>();
  for (const h of eligibleHomes) {
    const key = h.outreachEmail.trim().toLowerCase();
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(h);
  }

  const cutoff = Date.now() - THROTTLE_HOURS * 3600 * 1000;
  let suppressedCount = 0, throttledCount = 0;
  const sendable: { email: string; homes: HomeRow[] }[] = [];
  for (const [email, grp] of groups) {
    if (suppressed.has(email)) { suppressedCount++; continue; }
    const lastSent = grp.reduce<number>((mx, h) => Math.max(mx, h.claimNudgeLastSentAt ? h.claimNudgeLastSentAt.getTime() : 0), 0);
    if (lastSent > cutoff) { throttledCount++; continue; }
    sendable.push({ email, homes: grp });
  }
  sendable.sort((a, b) => a.email.localeCompare(b.email));
  const batch = limit ? sendable.slice(0, limit) : sendable;

  console.log(`Collapse: ${eligibleHomes.length} homes → ${groups.size} unique addresses ` +
    `(${suppressedCount} suppressed, ${throttledCount} throttled) → ${sendable.length} sendable${limit ? `, ${batch.length} this batch` : ''}\n`);

  console.log('── Unique sends (address → communities) ──');
  for (const g of batch) {
    console.log(`  ✉ ${g.email}  (${g.homes.length} ${g.homes.length > 1 ? 'communities' : 'community'})`);
    for (const h of g.homes) console.log(`       • ${h.name}`);
  }

  // Sample rendered email (first multi-home group if any, else first group).
  const sample = batch.find((g) => g.homes.length > 1) ?? batch[0];
  if (sample) {
    const comms = sample.homes.map((h) => ({ name: h.name, claimUrl: claimUrl(h.id, sample.email, secret) }));
    const unsub = unsubscribeUrl(sample.email, secret);
    console.log('\n── Sample rendered email (text) ──');
    console.log(`To: ${sample.email}`);
    console.log(`Subject: ${comms.length > 1 ? `Claim your ${comms.length} free CareLinkAI listings` : `Claim your free CareLinkAI listing for ${comms[0].name}`}`);
    console.log('List-Unsubscribe: <' + unsub + '>, <mailto:noreply@getcarelinkai.com?subject=unsubscribe>');
    console.log('---');
    console.log(`${comms.length > 1 ? 'Your communities are' : `${comms[0].name} is`} listed on CareLinkAI…\n`);
    for (const c of comms) console.log(`• ${c.name}: ${c.claimUrl}`);
    console.log(`\n---\nCareLinkAI · ${addrForRender}\nUnsubscribe: ${unsub}`);
  }

  if (dryRun) {
    console.log('\n─────────────────────────────────────────────');
    console.log(`Would send: ${batch.length} emails to ${batch.length} unique addresses (${batch.reduce((n, g) => n + g.homes.length, 0)} homes)`);
    console.log('─────────────────────────────────────────────');
    console.log('\nDRY RUN complete. Re-run with --force to send.');
    if (!postalAddress) console.log('⚠ Set COMPANY_POSTAL_ADDRESS (real mailing address) before --force — required for CAN-SPAM.');
    return;
  }

  let sent = 0, failed = 0, homesSent = 0;
  for (const g of batch) {
    const comms = g.homes.map((h) => ({ name: h.name, claimUrl: claimUrl(h.id, g.email, secret) }));
    const ok = await sendDirectoryClaimInviteEmail({
      toEmail: g.email,
      communities: comms,
      unsubscribeUrl: unsubscribeUrl(g.email, secret),
      postalAddress: postalAddress!,
    });
    if (ok) {
      await prisma.assistedLivingHome.updateMany({ where: { id: { in: g.homes.map((h) => h.id) } }, data: { claimNudgeLastSentAt: new Date() } });
      console.log(`  ✅ SENT → ${g.email} (${g.homes.length} home${g.homes.length > 1 ? 's' : ''})`);
      sent++; homesSent += g.homes.length;
    } else {
      console.log(`  ❌ FAILED → ${g.email} (left un-throttled to retry)`);
      failed++;
    }
  }
  console.log('\n─────────────────────────────────────────────');
  console.log(`Sent: ${sent} emails  ·  ${homesSent} homes  ·  ${failed} failed`);
  console.log('─────────────────────────────────────────────');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
