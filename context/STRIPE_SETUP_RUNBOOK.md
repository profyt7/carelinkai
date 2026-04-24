# CareLinkAI — Stripe Account Setup Runbook
_Run this any time a new Stripe account is connected to CareLinkAI._
_Designed for CoWork browser automation + Render env var updates._

---

## Overview

CareLinkAI uses Stripe for:
- Operator SaaS subscriptions (Starter $99/mo, Professional $249/mo, Growth $499/mo)
- Placement fee invoice items ($500 per inquiry→resident conversion, collected on next billing cycle)
- Stripe Customer Portal (operators manage their own subscription)
- FOUNDERS49 early-adopter promo ($50/mo off forever, max 50 redemptions)

All Stripe configuration is **env-var-only** — zero code changes when swapping accounts.

---

## Step 1 — Create Products & Prices in Stripe Dashboard

URL: https://dashboard.stripe.com/products

Create three products with **recurring monthly** prices:

| Product Name   | Monthly Price | Env Var to Set          |
|----------------|---------------|-------------------------|
| Starter        | $99.00 USD    | `STRIPE_PRICE_STARTER`  |
| Professional   | $249.00 USD   | `STRIPE_PRICE_PROFESSIONAL` |
| Growth         | $499.00 USD   | `STRIPE_PRICE_GROWTH`   |

For each product:
1. Click "Add product"
2. Enter the product name
3. Set pricing: Recurring, Monthly, enter the dollar amount
4. Click "Save product"
5. Copy the **Price ID** (format: `price_xxxxxxxxxxxxxxxxxxxxxxxx`)

---

## Step 2 — Register Webhook Endpoint

URL: https://dashboard.stripe.com/webhooks

1. Click "Add endpoint"
2. Endpoint URL: `https://getcarelinkai.com/api/webhooks/stripe`
3. Select **exactly** these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click "Add endpoint"
5. Copy the **Signing secret** (format: `whsec_xxxxxxxxxxxxxxxxxxxxxxxx`)
   - This is shown once on the endpoint detail page under "Signing secret"

---

## Step 3 — Configure Customer Portal

URL: https://dashboard.stripe.com/settings/billing/portal

Enable the following:
- ✅ Allow customers to cancel subscriptions
- ✅ Allow customers to update payment methods
- ✅ Allow customers to update billing information (name, email, address)

Click "Save".

---

## Step 4 — Create FOUNDERS49 Promo Code

Run this script from the project root (requires `STRIPE_SECRET_KEY` set in shell):

```bash
node scripts/stripe-setup.js
```

This script creates:
- Coupon: `carelinkai_founders_rate` — $50/mo off, repeating forever
- Promo code: `FOUNDERS49` — max 50 redemptions

The script is idempotent — safe to run again if the coupon already exists.

Alternatively, CoWork can do it manually:
1. Go to https://dashboard.stripe.com/coupons
2. Create coupon: Amount off = $50.00, Duration = Forever, Redemption limit = 50
3. Click "Add promotion code", set code = `FOUNDERS49`

---

## Step 5 — Update Env Vars in Render

URL: https://dashboard.render.com → carelinkai web service → Environment

Update these 7 variables:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → API Keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Copied in Step 2 |
| `STRIPE_PRICE_STARTER` | `price_...` | Copied in Step 1 |
| `STRIPE_PRICE_PROFESSIONAL` | `price_...` | Copied in Step 1 |
| `STRIPE_PRICE_GROWTH` | `price_...` | Copied in Step 1 |

Click "Save Changes" — Render will redeploy automatically (~2 min).

> Note: `STRIPE_PUBLISHABLE_KEY` is only used if you add a client-side Stripe.js element.
> The webhook secret and price IDs are the critical ones for billing to function.

---

## Step 6 — Verify Everything Works

1. **Webhook active**: Go to https://dashboard.stripe.com/webhooks — endpoint should show status "Enabled"
2. **Test checkout**: Log in as `demo.operator@carelinkai.test` → Billing → click a plan → should open Stripe Checkout with 14-day trial
3. **Test portal**: After subscribing, "Manage Subscription" button should open Stripe Customer Portal
4. **Promo code**: During checkout, enter `FOUNDERS49` — should apply $50/mo discount

---

## Env Vars That Do NOT Change When Swapping Accounts

These are set once and stay the same regardless of which Stripe account is active:

```
PLACEMENT_FEE_CENTS=50000       # $500 placement fee per conversion
WALLET_FEE_PCT=2.5              # 2.5% Care Wallet transaction fee
DEFAULT_AFFILIATE_COMMISSION_PCT=20  # 20% affiliate commission on placement fee
```

---

## Quick Reference — All Stripe-Related Env Vars

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_GROWTH=price_...
PLACEMENT_FEE_CENTS=50000
```
