#!/usr/bin/env npx tsx
/**
 * scripts/stripe-golive-setup.ts — Stripe go-live preparation (S2-1)
 *
 * Idempotent audit + setup of everything CareLinkAI needs in a Stripe account
 * (test OR live — run once per account/mode). Supersedes scripts/stripe-setup.js
 * (kept for reference; this adds AGENCY, FOUNDER_20, the missing
 * checkout.session.completed webhook event, and FOUNDERS49 deprecation).
 *
 * What it manages:
 *   1. Products + recurring monthly Prices for ALL FOUR operator tiers
 *      (Starter $99 / Professional $249 / Growth $499 / Agency $799)
 *   2. Webhook endpoint with the full event set the handler actually consumes
 *      (incl. checkout.session.completed — missing from the old script/runbook)
 *   3. Customer Portal configuration
 *   4. FOUNDER_20 framework (ratified 2026-06-02): ONE coupon
 *      `carelinkai_founder_20` (20% off forever) + phase-1 promotion code
 *      FOUNDER20 (max 50 redemptions, metadata cohort=CLE-OPS-50). The 6 free
 *      months are a 180-day trial applied by the subscribe route when a valid
 *      code is redeemed. Later cohorts = new promo codes on the SAME coupon.
 *   5. FOUNDERS49 deprecation: deactivates the legacy promotion code so no NEW
 *      redemptions happen; existing subscriptions keep their discount
 *      (grandfathered — Stripe never strips applied coupons).
 *
 * Safety:
 *   - DRY-RUN by default: reports what exists vs. what would be created/changed.
 *   - --force applies changes.
 *   - Refuses to touch a LIVE-mode key (sk_live_...) unless --live is ALSO
 *     passed — accidental live mutation is impossible with a copy-pasted cmd.
 *
 * Usage (Render shell or locally with STRIPE_SECRET_KEY set):
 *   npx tsx scripts/stripe-golive-setup.ts                # dry-run audit
 *   npx tsx scripts/stripe-golive-setup.ts --force        # apply (test mode)
 *   npx tsx scripts/stripe-golive-setup.ts --force --live # apply (live mode)
 *
 * After a live run, copy the printed Price IDs + webhook secret into Render —
 * see docs/STRIPE_GOLIVE_CHECKLIST.md for the full flip sequence.
 */

import Stripe from 'stripe';
import {
  FOUNDER_COUPON_ID,
  FOUNDER_PHASE1_PROMO_CODE,
} from '../src/lib/billing/founder-code';

const key = process.env.STRIPE_SECRET_KEY;
if (!key || key.includes('dummy')) {
  console.error('\n❌  STRIPE_SECRET_KEY is not set (or is the dummy build key). Set it and re-run.\n');
  process.exit(1);
}

const FORCE = process.argv.includes('--force');
const LIVE_ACK = process.argv.includes('--live');
const isLiveKey = key.startsWith('sk_live_') || key.startsWith('rk_live_');

if (isLiveKey && !LIVE_ACK) {
  console.error('\n🛑  LIVE-mode key detected but --live was not passed.');
  console.error('    Re-run with BOTH --force and --live to modify the live account.\n');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2023-10-16' });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getcarelinkai.com';

const PLANS = [
  { key: 'starter',      name: 'CareLinkAI Starter',      amount: 9900,  env: 'STRIPE_PRICE_STARTER',      lookup: 'carelinkai_starter_monthly',      description: 'Inquiry pipeline, resident management, 1 home, email support' },
  { key: 'professional', name: 'CareLinkAI Professional', amount: 24900, env: 'STRIPE_PRICE_PROFESSIONAL', lookup: 'carelinkai_professional_monthly', description: 'Everything in Starter + AI responses, caregiver management, tour scheduling, analytics, up to 3 homes' },
  { key: 'growth',       name: 'CareLinkAI Growth',       amount: 49900, env: 'STRIPE_PRICE_GROWTH',       lookup: 'carelinkai_growth_monthly',       description: 'Everything in Professional + discharge planner integration, advanced analytics, priority support, up to 10 homes' },
  { key: 'agency',       name: 'CareLinkAI Agency',       amount: 79900, env: 'STRIPE_PRICE_AGENCY',       lookup: 'carelinkai_agency_monthly',       description: 'Everything in Growth + unlimited homes, white-label options, dedicated support' },
] as const;

// The full set the handler at src/app/api/webhooks/stripe/route.ts consumes.
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'checkout.session.completed',
  'payment_intent.succeeded',
  'transfer.paid',
  'transfer.failed',
];

const act = (msg: string) => console.log(`  ${FORCE ? '▶' : '[dry-run] would'} ${msg}`);

async function ensurePlans(): Promise<Record<string, string>> {
  console.log('\n1️⃣  Products & prices (4 operator tiers)');
  const envLines: Record<string, string> = {};
  for (const plan of PLANS) {
    const existing = await stripe.prices.list({ lookup_keys: [plan.lookup], limit: 1 });
    if (existing.data.length > 0) {
      console.log(`  ✓ ${plan.name}: price exists (${existing.data[0].id})`);
      envLines[plan.env] = existing.data[0].id;
      continue;
    }
    act(`create product+price ${plan.name} @ $${plan.amount / 100}/mo (lookup ${plan.lookup})`);
    if (FORCE) {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { plan_key: plan.key },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: 'usd',
        recurring: { interval: 'month' },
        lookup_key: plan.lookup,
        metadata: { plan_key: plan.key },
      });
      envLines[plan.env] = price.id;
    }
  }
  return envLines;
}

async function ensureWebhook(): Promise<string | null> {
  console.log('\n2️⃣  Webhook endpoint');
  const webhookUrl = `${APP_URL}/api/webhooks/stripe`;
  const existing = await stripe.webhookEndpoints.list({ limit: 20 });
  const match = existing.data.find((w) => w.url === webhookUrl);
  if (match) {
    const missing = WEBHOOK_EVENTS.filter((e) => !match.enabled_events.includes(e) && !match.enabled_events.includes('*'));
    if (missing.length === 0) {
      console.log(`  ✓ Webhook registered with all ${WEBHOOK_EVENTS.length} required events`);
    } else {
      act(`update webhook ${match.id}: add missing events ${missing.join(', ')}`);
      if (FORCE) {
        const merged = Array.from(new Set([...match.enabled_events, ...missing])) as Stripe.WebhookEndpointUpdateParams.EnabledEvent[];
        await stripe.webhookEndpoints.update(match.id, { enabled_events: merged });
      }
    }
    console.log('    (signing secret unchanged — Render STRIPE_WEBHOOK_SECRET stays valid)');
    return null;
  }
  act(`register webhook ${webhookUrl} with ${WEBHOOK_EVENTS.length} events`);
  if (FORCE) {
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: WEBHOOK_EVENTS,
      description: 'CareLinkAI main webhook — subscription lifecycle + payments',
    });
    return webhook.secret ?? null;
  }
  return null;
}

async function ensurePortal(): Promise<void> {
  console.log('\n3️⃣  Customer Portal');
  const configs = await stripe.billingPortal.configurations.list({ limit: 5 });
  if (configs.data.some((c) => c.active)) {
    console.log('  ✓ An active portal configuration exists');
    return;
  }
  act('create portal configuration (cancel + payment-method + invoice history)');
  if (FORCE) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'CareLinkAI — manage your subscription' },
      features: {
        customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
      },
    });
  }
}

async function ensureFounder20(): Promise<void> {
  console.log('\n4️⃣  FOUNDER_20 (ratified 2026-06-02: 6 mo free + 20% off forever, single coupon)');
  let couponExists = false;
  try {
    const c = await stripe.coupons.retrieve(FOUNDER_COUPON_ID);
    couponExists = Boolean(c && c.valid !== false);
    console.log(`  ✓ Coupon ${FOUNDER_COUPON_ID} exists (${c.percent_off}% off, duration=${c.duration})`);
  } catch {
    act(`create coupon ${FOUNDER_COUPON_ID}: 20% off, duration=forever`);
    if (FORCE) {
      await stripe.coupons.create({
        id: FOUNDER_COUPON_ID,
        percent_off: 20,
        duration: 'forever',
        name: 'CareLinkAI Founder — 20% off forever',
      });
      couponExists = true;
    }
  }

  const codes = await stripe.promotionCodes.list({ code: FOUNDER_PHASE1_PROMO_CODE, limit: 1 });
  if (codes.data.length > 0) {
    console.log(`  ✓ Phase-1 promo code ${FOUNDER_PHASE1_PROMO_CODE} exists (active=${codes.data[0].active}, redeemed ${codes.data[0].times_redeemed}/${codes.data[0].max_redemptions ?? '∞'})`);
  } else {
    act(`create promotion code ${FOUNDER_PHASE1_PROMO_CODE} (max 50 — Cleveland Ops-50, phase 1)`);
    if (FORCE && couponExists) {
      await stripe.promotionCodes.create({
        coupon: FOUNDER_COUPON_ID,
        code: FOUNDER_PHASE1_PROMO_CODE,
        max_redemptions: 50,
        metadata: { cohort: 'CLE-OPS-50', phase: '1', framework: 'FOUNDER_20' },
      });
    } else if (FORCE) {
      console.log('  ⚠️  Coupon missing — re-run to create the promo code after the coupon exists.');
    }
  }
  console.log('  ℹ️  The 6 free months are a 180-day trial applied by /api/operator/billing/subscribe when a valid code is entered.');
}

async function deprecateFounders49(): Promise<void> {
  console.log('\n5️⃣  FOUNDERS49 deprecation (legacy — grandfather existing, stop new redemptions)');
  const codes = await stripe.promotionCodes.list({ code: 'FOUNDERS49', limit: 1 });
  const promo = codes.data[0];
  if (!promo) {
    console.log('  ✓ No FOUNDERS49 promotion code in this account — nothing to deprecate.');
    return;
  }
  if (!promo.active) {
    console.log(`  ✓ FOUNDERS49 already deactivated (was redeemed ${promo.times_redeemed}×; existing discounts remain grandfathered).`);
    return;
  }
  act(`deactivate promotion code FOUNDERS49 (${promo.id}; redeemed ${promo.times_redeemed}×). Existing subscription discounts are NOT affected.`);
  if (FORCE) {
    await stripe.promotionCodes.update(promo.id, { active: false });
  }
}

async function main() {
  console.log('=== CareLinkAI Stripe go-live setup ===');
  console.log(`Mode: ${isLiveKey ? '🔴 LIVE' : '🧪 TEST'} account · ${FORCE ? 'APPLY (--force)' : 'DRY-RUN (default)'}\n`);

  const envLines = await ensurePlans();
  const webhookSecret = await ensureWebhook();
  await ensurePortal();
  await ensureFounder20();
  await deprecateFounders49();

  console.log('\n--- Render env vars ---');
  for (const [k, v] of Object.entries(envLines)) console.log(`${k}=${v}`);
  if (webhookSecret) console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}   ← shown ONCE, copy now`);
  console.log('\nNext: docs/STRIPE_GOLIVE_CHECKLIST.md for the full test→live flip sequence.');
  if (!FORCE) console.log('Dry-run complete. Re-run with --force to apply.');
}

main().catch((err) => {
  console.error('\nSetup failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
