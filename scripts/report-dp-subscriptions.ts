#!/usr/bin/env npx tsx
/**
 * scripts/report-dp-subscriptions.ts
 *
 * DP-BILLING SAFETY REPORT. Discharge-planner access went FREE on 2026-06-27
 * (#659) — revenue is operator-subscriptions only. The DP subscribe endpoint now
 * returns 410, so no NEW DP charges can start. This script finds any DP profile
 * that was already on a paid/billing Stripe subscription BEFORE the cutover and
 * is therefore still being charged.
 *
 * It reads only our DB (DischargePlannerProfile). Stripe is the source of truth
 * for whether money is actually moving, so for each flagged row it prints the
 * stripeCustomerId + stripeSubscriptionId you need to find and CANCEL it in the
 * Stripe dashboard. This script writes NOTHING and never touches Stripe.
 *
 * "Still charged" = a stripeSubscriptionId is set AND subscriptionStatus is a
 * billing state (ACTIVE / TRIALING / PAST_DUE / PAUSED). CANCELED / INCOMPLETE /
 * INCOMPLETE_EXPIRED are already not billing and are reported as ✓ clear.
 *
 * Safe to run anytime. Run on Render (needs DATABASE_URL).
 *   npx tsx scripts/report-dp-subscriptions.ts            # summary + any chargeable rows
 *   npx tsx scripts/report-dp-subscriptions.ts --all      # also list cleared/never-billed rows
 *   npx tsx scripts/report-dp-subscriptions.ts --tsv      # tab-separated rows (chargeable only)
 */

import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// States where Stripe is (or imminently will be) charging the card.
const BILLING_STATES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.PAUSED,
];

async function main() {
  const tsv = process.argv.includes('--tsv');
  const all = process.argv.includes('--all');

  const profiles = await prisma.dischargePlannerProfile.findMany({
    select: {
      id: true,
      organization: true,
      title: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      currentPeriodEndsAt: true,
      trialEndsAt: true,
      createdAt: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows = profiles.map((p) => {
    const status = p.subscriptionStatus ?? null;
    const hasSub = !!p.stripeSubscriptionId;
    // Chargeable = a real subscription id + a billing-state status.
    const chargeable = hasSub && status !== null && BILLING_STATES.includes(status);
    return {
      email: p.user?.email ?? '(no email)',
      name: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' '),
      org: p.organization ?? '',
      status: status ?? '(none)',
      customer: p.stripeCustomerId ?? '',
      subscription: p.stripeSubscriptionId ?? '',
      periodEnds: p.currentPeriodEndsAt ? p.currentPeriodEndsAt.toISOString().slice(0, 10) : '',
      chargeable,
    };
  });

  const chargeable = rows.filter((r) => r.chargeable);

  if (tsv) {
    console.log(['email', 'name', 'org', 'status', 'stripeCustomerId', 'stripeSubscriptionId', 'periodEnds'].join('\t'));
    for (const r of chargeable) {
      console.log([r.email, r.name, r.org, r.status, r.customer, r.subscription, r.periodEnds].join('\t'));
    }
    return;
  }

  console.log('=== DP-billing safety report (DP access is FREE since #659) ===\n');
  console.log(`DP profiles total:        ${rows.length}`);
  console.log(`Still chargeable (FLAG):  ${chargeable.length}\n`);

  if (chargeable.length === 0) {
    console.log('✅ No discharge planner is on a billing Stripe subscription. Nothing to cancel.\n');
  } else {
    console.log('🔴 These DPs still have a BILLING Stripe subscription — CANCEL each in the Stripe dashboard:\n');
    for (const r of chargeable) {
      console.log(`  🔴 ${r.email}${r.org ? ` (${r.org})` : ''} — ${r.status}`);
      console.log(`       customer:     ${r.customer || '(none — check Stripe by email)'}`);
      console.log(`       subscription: ${r.subscription}`);
      if (r.periodEnds) console.log(`       period ends:  ${r.periodEnds}`);
      console.log('');
    }
    console.log('After canceling in Stripe, the webhook will sync subscriptionStatus → CANCELED.');
    console.log('Re-run this report to confirm it drops to 0.\n');
  }

  if (all) {
    const clear = rows.filter((r) => !r.chargeable);
    console.log(`Cleared / never-billed DP profiles (${clear.length}):`);
    for (const r of clear) {
      console.log(`  ✓ ${r.email}${r.org ? ` (${r.org})` : ''} — ${r.status}${r.subscription ? ` [sub ${r.subscription}]` : ''}`);
    }
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
