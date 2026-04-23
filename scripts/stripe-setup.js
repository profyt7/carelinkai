#!/usr/bin/env node
/**
 * CareLinkAI — One-time Stripe setup script
 *
 * Run this once from the Render shell (or locally with a real STRIPE_SECRET_KEY):
 *   node scripts/stripe-setup.js
 *
 * What it does:
 *   1. Creates Stripe Products for each operator subscription tier
 *   2. Creates recurring monthly Prices for each Product
 *   3. Registers the webhook endpoint with all required subscription events
 *   4. Configures the Stripe Customer Portal
 *
 * After running, copy the Price IDs printed at the end into Render env vars:
 *   STRIPE_PRICE_STARTER
 *   STRIPE_PRICE_PROFESSIONAL
 *   STRIPE_PRICE_GROWTH
 *
 * Safe to re-run — it checks for existing products/prices by lookup_key
 * and skips creation if they already exist.
 */

const Stripe = require('stripe');

const key = process.env.STRIPE_SECRET_KEY;
if (!key || key.startsWith('sk_test_dummy')) {
  console.error('\n❌  STRIPE_SECRET_KEY is not set or is the dummy key.');
  console.error('    Set it in your environment before running this script.\n');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getcarelinkai.com';

const PLANS = [
  {
    key: 'starter',
    name: 'CareLinkAI Starter',
    description: 'Inquiry pipeline, resident management, 1 home, email support',
    amount: 9900, // $99.00 in cents
    lookup_key: 'carelinkai_starter_monthly',
    env_var: 'STRIPE_PRICE_STARTER',
  },
  {
    key: 'professional',
    name: 'CareLinkAI Professional',
    description: 'Everything in Starter + AI responses, caregiver management, tour scheduling, analytics, up to 3 homes',
    amount: 24900, // $249.00 in cents
    lookup_key: 'carelinkai_professional_monthly',
    env_var: 'STRIPE_PRICE_PROFESSIONAL',
  },
  {
    key: 'growth',
    name: 'CareLinkAI Growth',
    description: 'Everything in Professional + discharge planner integration, advanced analytics, priority support, up to 10 homes',
    amount: 49900, // $499.00 in cents
    lookup_key: 'carelinkai_growth_monthly',
    env_var: 'STRIPE_PRICE_GROWTH',
  },
];

const WEBHOOK_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'payment_intent.succeeded',
  'transfer.paid',
  'transfer.failed',
];

async function getOrCreatePrice(plan) {
  // Check if price already exists by lookup_key
  try {
    const existing = await stripe.prices.list({ lookup_keys: [plan.lookup_key], limit: 1 });
    if (existing.data.length > 0) {
      console.log(`  ✓ Price already exists for ${plan.name}: ${existing.data[0].id}`);
      return existing.data[0].id;
    }
  } catch (e) {
    // lookup_keys filter not available in all API versions — fall through to create
  }

  // Create Product
  console.log(`  Creating product: ${plan.name}`);
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { plan_key: plan.key },
  });

  // Create Price
  console.log(`  Creating price: $${plan.amount / 100}/mo`);
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: plan.lookup_key,
    metadata: { plan_key: plan.key },
  });

  return price.id;
}

async function getOrCreateWebhook() {
  const webhookUrl = `${APP_URL}/api/webhooks/stripe`;

  // Check if webhook already exists
  const existing = await stripe.webhookEndpoints.list({ limit: 20 });
  const match = existing.data.find((w) => w.url === webhookUrl);
  if (match) {
    console.log(`  ✓ Webhook already registered: ${webhookUrl}`);
    console.log(`    Endpoint ID: ${match.id}`);
    console.log(`    Note: retrieve the signing secret from the Stripe dashboard if not already set in Render.`);
    return;
  }

  console.log(`  Registering webhook: ${webhookUrl}`);
  const webhook = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: 'CareLinkAI main webhook — subscription lifecycle + payments',
  });

  console.log(`  ✅ Webhook registered!`);
  console.log(`     Endpoint ID: ${webhook.id}`);
  console.log(`\n  ⚠️  IMPORTANT: Copy the webhook signing secret below into Render as STRIPE_WEBHOOK_SECRET:`);
  console.log(`     ${webhook.secret}`);
}

async function configureCustomerPortal() {
  console.log('  Configuring Stripe Customer Portal...');
  try {
    await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your CareLinkAI subscription',
        privacy_policy_url: `${APP_URL}/privacy`,
        terms_of_service_url: `${APP_URL}/terms`,
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'address'],
        },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
          },
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'create_prorations',
          products: [], // Will be populated with product IDs after we have them
        },
      },
    });
    console.log('  ✅ Customer Portal configured.');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('  ✓ Customer Portal already configured.');
    } else {
      console.warn(`  ⚠️  Customer Portal config failed: ${err.message}`);
      console.warn('     Configure manually in Stripe dashboard → Billing → Customer Portal');
    }
  }
}

async function main() {
  console.log('\n🚀 CareLinkAI Stripe Setup\n');
  console.log(`   Stripe account: ${key.startsWith('sk_live') ? '🟢 LIVE' : '🟡 TEST'}`);
  console.log(`   App URL: ${APP_URL}\n`);

  const results = {};

  console.log('📦 Step 1: Creating Products & Prices\n');
  for (const plan of PLANS) {
    const priceId = await getOrCreatePrice(plan);
    results[plan.env_var] = priceId;
    console.log('');
  }

  console.log('🔗 Step 2: Registering Webhook Endpoint\n');
  await getOrCreateWebhook();
  console.log('');

  console.log('⚙️  Step 3: Configuring Customer Portal\n');
  await configureCustomerPortal();
  console.log('');

  console.log('='.repeat(60));
  console.log('✅  SETUP COMPLETE\n');
  console.log('Copy these values into Render dashboard → Environment:\n');
  for (const [envVar, priceId] of Object.entries(results)) {
    console.log(`  ${envVar}=${priceId}`);
  }
  console.log('\nThen redeploy on Render (or env var changes trigger auto-redeploy).');
  console.log('='.repeat(60));
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
