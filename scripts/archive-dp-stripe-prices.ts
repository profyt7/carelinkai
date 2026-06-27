#!/usr/bin/env npx tsx
/**
 * scripts/archive-dp-stripe-prices.ts
 *
 * DP-FREE CLEANUP. Discharge-planner access went free on 2026-06-27 (#659).
 * The old paid-DP Stripe Prices must be archived so they can never back a new
 * subscription again:
 *   - STRIPE_PRICE_DISCHARGE_PLANNER       (Individual — $99/seat/mo)
 *   - STRIPE_PRICE_DISCHARGE_PLANNER_DEPT  (Department — $499/mo)
 *
 * This sets `active: false` on each price in Stripe. By price IDs from env by
 * default; pass --price-id <id> (repeatable) to target prices explicitly (handy
 * if you've already removed the env vars from Render).
 *
 * IMPORTANT: archiving a price only blocks NEW subscriptions — it does NOT cancel
 * existing ones. Run scripts/report-dp-subscriptions.ts first and cancel any live
 * DP subscription in the Stripe dashboard. Order of operations on Render:
 *   1. npx tsx scripts/report-dp-subscriptions.ts   → cancel any sub it flags
 *   2. npx tsx scripts/archive-dp-stripe-prices.ts --force   → archive the prices
 *   3. Remove STRIPE_PRICE_DISCHARGE_PLANNER[_DEPT] env vars from Render
 *
 * Dry-run by default. Run on Render (needs STRIPE_SECRET_KEY).
 *   npx tsx scripts/archive-dp-stripe-prices.ts                    # DRY RUN (from env)
 *   npx tsx scripts/archive-dp-stripe-prices.ts --force            # apply
 *   npx tsx scripts/archive-dp-stripe-prices.ts --price-id price_X --force
 */

import Stripe from 'stripe';

function argValues(flag: string): string[] {
  const out: string[] = [];
  const argv = process.argv;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && argv[i + 1]) out.push(argv[i + 1]);
  }
  return out;
}

async function main() {
  const secret = process.env['STRIPE_SECRET_KEY'];
  if (!secret) {
    console.error('⛔ STRIPE_SECRET_KEY not set. Run on Render.');
    process.exit(1);
  }
  const force = process.argv.includes('--force');
  const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });

  // Targets: explicit --price-id args win; otherwise the two DP env vars.
  const explicit = argValues('--price-id');
  const fromEnv = [
    process.env['STRIPE_PRICE_DISCHARGE_PLANNER'],
    process.env['STRIPE_PRICE_DISCHARGE_PLANNER_DEPT'],
  ].filter((v): v is string => !!v);
  const targets = Array.from(new Set(explicit.length ? explicit : fromEnv));

  console.log(`\n=== Archive DP Stripe prices — ${force ? 'LIVE (--force)' : 'DRY RUN'} ===\n`);
  if (targets.length === 0) {
    console.log('✓ No DP price IDs found (env vars unset and no --price-id given). Nothing to archive — likely already cleaned up.');
    return;
  }

  for (const priceId of targets) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      const amount = typeof price.unit_amount === 'number' ? `$${(price.unit_amount / 100).toFixed(2)}` : '—';
      const interval = price.recurring?.interval ?? 'one-time';
      const label = price.nickname || (typeof price.product === 'string' ? price.product : price.product?.id) || priceId;
      console.log(`• ${priceId} — ${label} (${amount}/${interval}) — currently ${price.active ? 'ACTIVE' : 'already archived'}`);

      if (!price.active) {
        console.log('   ✓ already archived — skipping.\n');
        continue;
      }
      if (force) {
        await stripe.prices.update(priceId, { active: false });
        console.log('   ✓ archived (active: false).\n');
      } else {
        console.log('   DRY RUN — would set active: false.\n');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`   ⚠ could not retrieve/update ${priceId}: ${msg}\n`);
    }
  }

  console.log('Reminder: archiving does NOT cancel existing subscriptions.');
  console.log('Run scripts/report-dp-subscriptions.ts and cancel any live DP sub in Stripe first.\n');
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
