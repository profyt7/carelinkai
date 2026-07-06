# Stripe Go-Live Checklist (S2-1, feat/stripe-golive-prep)

_The complete test→live flip. **Chris flips the keys** — nothing in code or CI
switches modes. Every step is reversible until Step 5._

## Current state (audited 2026-07-05)

| Piece | State |
|---|---|
| Keys in Render | TEST-mode (`sk_test_…`); app code is env-var-only, zero code changes to flip |
| Products/prices | 3 tiers created by old `stripe-setup.js`; **AGENCY missing** → new script adds it |
| Webhook endpoint | Registered, but the old event list **omitted `checkout.session.completed`** (the handler consumes it — plan changes/one-time flows could be missed) → new script fixes |
| Coupon | Legacy FOUNDERS49 ($50 off forever, max 50) — **deprecated by this PR** (see below) |
| Checkout | 14-day trial default; promo codes were disabled entirely (`allow_promotion_codes: false`) — FOUNDERS49 was never actually redeemable at checkout |
| Portal | Configured per old runbook |

## FOUNDERS49 → FOUNDER_20 migration

- **FOUNDER_20 (ratified 2026-06-02):** 6 months free + 20% off forever, ONE
  coupon (`carelinkai_founder_20`), first cohort per paid role per metro.
  Phase 1 = **Cleveland Ops-50**: promotion code `FOUNDER20`, max 50
  redemptions. Later cohorts = new promo codes on the same coupon.
- **Mechanics:** coupon carries the 20%-forever; the 6 free months are a
  180-day trial applied server-side by `/api/operator/billing/subscribe` when
  a valid founder code is submitted (validated against Stripe before checkout
  is created — a typo'd code 400s, never a silent full-price session).
- **FOUNDERS49 (legacy):** the setup script deactivates its promotion code —
  no new redemptions. Any subscription that already carries the FOUNDERS49
  discount keeps it forever (Stripe never strips an applied coupon) —
  **grandfathered, no action needed**. If zero redemptions exist in the live
  account (likely — promo codes were disabled at checkout), this is a no-op.

## Step-by-step flip (run top to bottom)

### 1. Verify in TEST mode first
```bash
# Render shell (test keys still set):
npx tsx scripts/stripe-golive-setup.ts            # dry-run audit
npx tsx scripts/stripe-golive-setup.ts --force    # apply to TEST account
```
Then run the webhook verification matrix below against the test account.

### 2. Create the LIVE account objects
```bash
# With the LIVE secret key exported (not yet in Render):
STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/stripe-golive-setup.ts --force --live
```
Copy the printed Price IDs + webhook signing secret.

### 3. Flip Render env vars (the only real "switch")
| Var | Change |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` → `sk_live_…` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` → `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | test `whsec_…` → the live one printed in Step 2 |
| `STRIPE_PRICE_STARTER` | live `price_…` from Step 2 |
| `STRIPE_PRICE_PROFESSIONAL` | live `price_…` from Step 2 |
| `STRIPE_PRICE_GROWTH` | live `price_…` from Step 2 |
| `STRIPE_PRICE_AGENCY` | live `price_…` from Step 2 (tier auto-hides if unset — safe) |

Unchanged: `PLACEMENT_FEE_CENTS`, `WALLET_FEE_PCT`, and the
provider/caregiver/family price vars until those streams go live (their tiers
auto-hide while unset in live mode).

### 4. Clear test-mode Stripe customer IDs (Known Issue #1)
Demo/test operators carry `stripeCustomerId` values from the TEST account;
live-mode API calls with them would 404. In the Render shell:
```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.operator.updateMany({ where: { stripeCustomerId: { startsWith: 'cus_' } }, data: { stripeCustomerId: null, stripeSubscriptionId: null } })
 .then(r => console.log('cleared', r.count, 'operators')).finally(() => p.\$disconnect());
"
```
⚠️ Run this ONLY at the moment of the flip (it clears test subscriptions), and
only if no real live customers exist yet — true today.

### 5. Redeploy + smoke test with a real card
1. Redeploy (env var change triggers it on Render).
2. Register/log in as a real operator account → `/operator/billing`.
3. Subscribe to Starter **with the `FOUNDER20` code** → confirm checkout shows
   *20% off forever* + *6-month trial*, complete with a real card.
4. Confirm the webhook fired: operator row gains `stripeSubscriptionId`,
   status TRIALING; admin MRR tile updates.
5. Cancel via the Customer Portal → confirm status syncs to CANCELED at period end.
6. (Optional) refund/void anything created during the smoke test from the
   Stripe dashboard.

## Webhook verification matrix (test events)

With the **Stripe CLI** against the test account
(`stripe listen --forward-to localhost:3000/api/webhooks/stripe` locally, or
`--forward-to https://carelinkai.onrender.com/api/webhooks/stripe`):

| Trigger | Expected handler behavior (`src/app/api/webhooks/stripe/route.ts`) |
|---|---|
| `stripe trigger customer.subscription.created` | Operator row: `stripeSubscriptionId` + plan + status persisted |
| `stripe trigger customer.subscription.updated` | Status/plan/period-end synced |
| `stripe trigger customer.subscription.deleted` | Status → CANCELED; feature gate closes |
| `stripe trigger invoice.payment_succeeded` | Payment recorded; placement-fee invoice items marked COMPLETED |
| `stripe trigger invoice.payment_failed` | Status → PAST_DUE; operator SMS/email alert path |
| `stripe trigger checkout.session.completed` | Session metadata routed (ride payments, kit purchases) |
| `stripe trigger payment_intent.succeeded` | Payment record path (wallet/rides) |
| Bad signature (curl with wrong `Stripe-Signature`) | 400, nothing persisted |

All handlers return 200 on ignored/irrelevant events (Stripe stops retrying).

## Explicitly NOT in this PR
- No live-mode switch (Chris flips keys per this checklist).
- No changes to placement-fee, wallet, provider/caregiver/family billing.
- Founder code entry is wired on `/operator/billing` (SubscriptionManager);
  the onboarding wizard Step 4 still uses the standard checkout — add the code
  input there when the Ops-50 outreach actually sends wizard links (follow-up).
