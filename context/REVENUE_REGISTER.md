# CareLinkAI Revenue Register

_Audit of `main` @ `b4fa357e` · 2026-10-24 · read-only, code-derived. No env values appear here._

**Production column caveat:** the auditing agent has no Render or Stripe access. "Prod" below is the last known state: the founder says `STRIPE_PRICE_AGENCY` and `ADMIN_NOTIFY_EMAIL` are set, and the vault (10/17) says `STRIPE_PRICE_*` are probably **test-mode** ids. Anything else is marked **?**. Two ways to confirm:
- `/admin/checkout-preflight` shows booleans for key mode (`sk_live`), `price_` shape, `whsec_` and the flag.
- `npx tsx scripts/stripe-golive-setup.ts` runs as a dry run by default and lists which live prices exist.

---

## 0. Fix before any live money (blocking, code)

| # | Issue | Where | Why it blocks |
|---|---|---|---|
| S1 | **Self-serve payouts accept a user-chosen amount.** Caregivers and operators POST any `amount`, and the route calls `stripe.transfers.create` to their own Connect account with no check against money owed. | `src/app/api/caregiver/payouts/request/route.ts`, `src/app/api/operator/payouts/request/route.ts` (UI `/settings/payouts`, `/settings/payouts/operator`) | Once there is a live balance and Connect is enabled, any onboarded user can drain the platform account. Disable these routes, or cap them at a computed ledger balance, **before switching to `sk_live`**. |
| S2 | **Timesheet pay sends platform funds out without charging the operator.** | `src/app/api/timesheets/[id]/pay` (UI `/timesheets`, not in nav) | The platform pays the caregiver from its own balance. Gate or remove it before going live. |
| S3 | **Affiliate commission ignores the fee flag.** `triggerAffiliateCommission` runs on every conversion that carries an `affiliateCode`. It creates a PENDING `AFFILIATE_COMMISSION` (20/25/30% of `PLACEMENT_FEE_CENTS`) even when `PLACEMENT_FEE_ENABLED` is off and the placement is in a free payer lane. | `src/lib/services/inquiry-conversion.ts` | This accrues payout liability with no matching revenue, and it is an AKS exposure on Medicaid/free-lane placements. Put it behind the same flag and lane gate as the placement fee. |
| S4 | ~~**One env var, two defaults.**~~ **Fixed (OL-187):** `MARKETPLACE_HIRE_FEE_CENTS` now has one default, 9900 ($99), read only in `src/lib/billing/fees.ts`. | `src/lib/billing/fees.ts` | Resolved. |

---

## 1. Register

Columns: **Payer** · **Amount as coded** · **UI route** · **Stripe env** · **Flag** · **Prod (last known)** · **Depends on** · **Legal gate** · **Blocker** · **Effort (S/M/L)**

| # | Path | Payer | Amount (coded) | UI route | Stripe env | Flag | Prod | Depends on | Legal | Blocker | Effort |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Family Concierge** (one-off Checkout) | Family | Whatever the Stripe price holds (intended $399); monthly cap `CONCIERGE_MONTHLY_CAP` default 4 | `/concierge` (SiteHeader/Footer). The form shows checkout, request or waitlist mode | `STRIPE_PRICE_FAMILY_CONCIERGE` | `CONCIERGE_CHECKOUT_ENABLED` | Flag **?**, price **?** (likely test). `ADMIN_NOTIFY_EMAIL` set | Webhook `checkout.session.completed/expired`, `charge.refunded`; preflight requires `sk_live` + `price_` + `whsec_` | None in code (the service is human-delivered advice) | Live price + flag + live key/webhook | **S** |
| 2 | **Operator subscriptions** Starter / Professional / Growth | Operator | $99 / $249 / $499 per month (from `stripe-golive-setup.ts`). 14-day trial, or 180 days with a founder code | `/operator/onboarding/[step]` → Checkout; `/operator/billing` (switch plan, portal) | `STRIPE_PRICE_STARTER`, `_PROFESSIONAL`, `_GROWTH` | None (always on if price is set) | **?** (likely test) | Webhook `customer.subscription.*`, `invoice.payment_*`; Stripe coupon `carelinkai_founder_20` + promo code `FOUNDER20` | None | Live prices + live key/webhook + live coupon/promo | **S** |
| 2a | Founder pricing (6 months free + 20% off forever) | — | Claim/register sets `Operator.freeAccessUntil = now + 6 months` and `clevelandFounder`. FOUNDER20 = 180-day trial + 20% coupon. `FOUNDERS49` is deprecated | same | coupon `carelinkai_founder_20` (`src/lib/billing/founder-code.ts`) | — | Coupon in live mode **?** | — | — | **No separate cohort-start field** (start = `freeAccessUntil` − 6 months). **Signup does not collect a card**; the card is collected only at Stripe Checkout. Nothing auto-converts a founder when `freeAccessUntil` lapses, so a nudge job is needed | **S–M** |
| 3 | **Agency tier** | Home-care agency (OperatorType) | $799/mo | `/operator/billing` | `STRIPE_PRICE_AGENCY` (**set**, per founder) | — | Set; test or live **?** | Webhook maps the price back to AGENCY via `planForPriceId` (**fixed, OL-187**) | — | Live price + live key/webhook | **S** |
| 4 | **Pro Caregiver** | Caregiver | Stripe price (intended $19/mo). Grants `isPro`/`proStatus` (badge and priority in search) | `/settings/billing` | `STRIPE_PRICE_PRO_CAREGIVER` | — | **?** | Webhook `customer.subscription.*` | — | Live price | **S** |
| 5 | ~~**CareLinkAI Plus**~~ — **RETIRED (OL-189, founder decision 10/24)** | — | — | none (`/settings/family/billing` redirects to `/settings`) | — (`STRIPE_PRICE_FAMILY_PLUS` removed) | — (`FAMILY_PLUS_ENABLED` removed) | n/a | — | — | Families are free. `Family.isPlus` / `plusStatus` / `plusPeriodEndsAt` are dead data (kept, no migration) | — |
| 6 | **Provider Marketplace Listing** | Provider | Stripe price (intended $99/mo). Sets `listingStatus = ACTIVE` | `/settings/provider/billing` | `STRIPE_PRICE_PROVIDER_LISTING` | — | **?** | same | — | Live price | **S** |
| 7 | **Featured listing** (one-off Checkout, or invoice item for ACTIVE plans — OL-190) | Operator | $79 per 30 days (`FEATURED_LISTING_FEE_CENTS` default 7900, `src/lib/billing/fees.ts`) | `/operator/homes/[id]/edit` | none (inline `price_data`) | `FEATURED_LISTING_ENABLED` (off) | Off | No-plan / trialing / past-due operators → Stripe Checkout, featured only after webhook `checkout.session.completed` (type `FEATURED_LISTING`, idempotent on session id). ACTIVE plan → invoice item + `invoice.payment_succeeded` | — | Placement is real once OL-191 merges: "Featured" badge on search/hub cards + listing page, and a bounded tie-break (first within its 5-point search score band / its hub freshness tier — never above a better match) | **S** (flag + live Stripe key) |
| 8 | **Marketplace hire fee** (invoice item) | Operator (non-paid plans) | $99 (`MARKETPLACE_HIRE_FEE_CENTS`, one default since OL-187) | DirectHireButton on caregiver profiles; marketplace applications | none | — | Code is active now | Same as #7 | — | #2 | **S** |
| 9 | **Placement fee** on inquiry Convert (invoice item) | Facility | **$2,500** (`PLACEMENT_FEE_CENTS` default 250000 since OL-187; founder sets the real value). Only the `FEE_ELIGIBLE` payer lane | Operator/admin inquiry Convert | none | `PLACEMENT_FEE_ENABLED` (1/true/yes/on) | Off (assumed; **?**) | Webhook `invoice.payment_succeeded`; operator Stripe customer, otherwise PENDING for manual collection (OL-014/OL-124) | **Attorney (Haran): AKS / referral-fee review** | Attorney sign-off + confirm `PLACEMENT_FEE_CENTS` + S3 | **S** after attorney |
| 10 | **Compliance kits** (one-off Checkout, inline `price_data`) | Operator | Ohio ALF Startup $199 · Annual Survey Prep $149 · Memory Care $149 | `/operator/compliance-kits` (DashboardLayout) | none needed (inline price) | — | **Live as soon as the key is `sk_live`** | Webhook `checkout.session.completed` + `purchaseId`; the kit content must actually exist and be delivered | Light: kit is informational, not legal advice (disclaimer) | Confirm deliverable content, then flip to the live key | **S** |
| 11 | **Rides / NEMT** (one-off Checkout) | Family or facility | Fare + **12% platform fee** (`calculateFare`, `src/lib/distance.ts`), all collected to the platform | `/rides`, RideRequestModal; `/admin/rides` shows platform fee MTD | none (inline) | — | Live with `sk_live` | Webhook `checkout.session.completed` type `RIDE_PAYMENT`; refunds via `/api/rides/[id]`. **No driver/provider payout code**, so the platform holds the provider's share | **Yes**: NEMT/Medicaid transport rules, money held for third parties | Provider payout path + legal review of holding fares | **L** |
| 12 | **Background checks** (PaymentIntent) | Family / operator | Basic $0 · Enhanced $19.99 · MVR $9.99 · Premium $39.99 (Checkr cost passes through, margin = price − Checkr cost) | `/background-checks`; `marketplace/providers/[id]` (BackgroundCheckOrderPanel) | `CHECKR_API_KEY`, `CHECKR_WEBHOOK_SECRET` | — | Checkr keys **?** | Checkr account + FCRA disclosure/consent flow | **FCRA** (permissible purpose, adverse action) | Checkr contract + FCRA review | **M** |
| 13 | **Care Wallet service fee** | Family | **2.5%** on pay-from-wallet (`WALLET_FEE_PCT`; client hard-codes 0.025) | Family BillingTab | none (wallet ledger); deposits via PaymentIntent (`/api/billing/deposit`; `/api/payments/deposit-intent` has no UI) | — | Live with `sk_live` | Webhook `payment_intent.succeeded` | **Yes**: platform holds customer funds (money-transmitter risk) | Legal review; recommend leaving it off | **L** |
| 14 | **Discharge Planner subscription** | — | — | None | None (DP price names removed from code and `.env.example`, OL-187) | — | n/a | — | — | **Removed (OL-187)**: both DP billing API routes, the webhook DP sync and the DP Stripe scripts are deleted; `/discharge-planner/billing` redirects to the free dashboard. Archive the two old prices in the Stripe dashboard if not done | — |
| 15 | **CareCredit** | — | $0 tracked | Link (`CARECREDIT_APPLY_URL`) | — | — | — | No affiliate parameter and no tracking | — | A plain link, not revenue. Would need an affiliate agreement | **S** if pursued |
| — | Stripe Connect payouts (caregiver/operator), timesheet pay | (outflow) | — | see S1/S2 | Connect | — | — | Webhook `transfer.*` | — | **Liability, not revenue**. Fix S1/S2 first | — |

### `STRIPE_PRICE_*` the code reads

| Env | Read by | Prod set? | Test or live? |
|---|---|---|---|
| `STRIPE_PRICE_FAMILY_CONCIERGE` | `src/lib/concierge/orders.ts`, `preflight.ts` | ? | ? (preflight checks the `price_` shape) |
| `STRIPE_PRICE_STARTER` / `_PROFESSIONAL` / `_GROWTH` | `src/lib/operator-plans.ts` (`priceIdForPlan`) + webhook plan map | ? (vault: probably set, test) | probably test |
| `STRIPE_PRICE_AGENCY` | `operator-plans.ts` (`priceIdForPlan` + `planForPriceId`, used by the webhook since OL-187) | **Yes** (founder) | ? |
| `STRIPE_PRICE_PRO_CAREGIVER` | `api/caregiver/billing/subscribe` | ? | ? |
| ~~`STRIPE_PRICE_FAMILY_PLUS`~~ | removed (OL-189) | n/a | archive the price in Stripe if one exists |
| `STRIPE_PRICE_PROVIDER_LISTING` | `api/provider/billing/subscribe` | ? | ? |
| `STRIPE_PRICE_DISCHARGE_PLANNER` / `_DEPT` | nothing (removed OL-187) | n/a | archive in dashboard |

A price id does not show test or live mode by itself. It only works with a secret key from the same mode, so **the mode of `STRIPE_SECRET_KEY` (`sk_test_` vs `sk_live_`) decides everything**. Every price id must be recreated in live mode: `scripts/stripe-golive-setup.ts` creates them by lookup key (starter 9900, professional 24900, growth 49900, agency 79900). Concierge, Pro, Plus and Provider are not in that script and must be created by hand.

### Webhook event coverage (`src/app/api/webhooks/stripe/route.ts`)

| Event | Paths |
|---|---|
| `checkout.session.completed` | Concierge (#1, handled first), Rides (#11), Compliance kits (#10) |
| `checkout.session.expired`, `charge.refunded` | Concierge (#1) |
| `customer.subscription.created/updated/deleted` | Operator tiers (#2, AGENCY #3), Pro (#4), Provider listing (#6); a family-customer event (retired Plus #5) is acknowledged and ignored |
| `invoice.payment_succeeded` | Subscriptions, plus marks PLACEMENT_FEE / MARKETPLACE_HIRE_FEE / FEATURED_LISTING_FEE paid (#7–9) |
| `invoice.payment_failed` | Subscriptions (dunning status) |
| `payment_intent.succeeded` | Wallet deposits (#13). Background-check PIs need verifying when #12 goes live |
| `transfer.*` | Connect payouts (S1/S2) |

In live mode, the webhook endpoint in the Stripe dashboard must subscribe to **all** of the above, and `STRIPE_WEBHOOK_SECRET` must be the live endpoint's `whsec_`.

### UI orphans (API alive, no entry point)
- `/api/discharge-planner/billing/*` deleted (OL-187).
- `/api/payments/deposit-intent` has no UI (`/api/billing/deposit` is the one in use).
- `/timesheets` (and its pay API, S2) is not in the nav, but the page and API are reachable by URL.
- Every other billing page above is linked from `DashboardLayout` or settings. Per-role rendering after the Oct pivot was **not** checked in a browser; check by logging in as each role.

---

## 2. Turn-on order (expected $ ÷ effort)

**Before anything: fix S1 + S2 (disable self-serve payouts and timesheet pay), then switch `STRIPE_SECRET_KEY` to `sk_live` and add the live webhook secret.** Effort S. Nothing below is safe to turn on before this.

**Live today:** if the prod key is still `sk_test` (the vault's assumption, not verified), nothing collects real money. Code is already active with no flag for #7 featured listing, #8 hire fee, #10 kits, #11 rides and #13 wallet fee. These will start charging the moment the key flips, so decide on #11 and #13 *before* you flip.

**Needs config only (env + live Stripe objects):**
1. **Operator subscriptions #2 + founder coupon #2a.** This is the core of MRR. Run `stripe-golive-setup.ts --live`, set the 3 live price ids, and create the `carelinkai_founder_20` coupon + `FOUNDER20` promo in live mode.
2. **Family Concierge #1.** $399 per order × cap 4/mo. Create the live price, set the env + `CONCIERGE_CHECKOUT_ENABLED`, and confirm `/admin/checkout-preflight` is all green.
3. **Compliance kits #10.** No env needed. Confirm the kit deliverables exist.
4. **Provider listing #6, Pro Caregiver #4.** Each needs one live price. (Plus #5 retired, OL-189.)
5. **Featured listing #7.** Rides on #2 automatically.

**Needs code (small):**
1. ~~Map `STRIPE_PRICE_AGENCY` in the webhook (#3)~~ and ~~one hire-fee default (S4)~~: done in OL-187.
3. Gate affiliate commission behind `PLACEMENT_FEE_ENABLED` + payer lane (S3).
4. Add a founder-expiry nudge or auto-convert (#2a), plus a `founderCohortStartedAt` field if you need it for reporting.

**Needs attorney:**
1. **Placement fee #9.** Highest $ per event. Get Haran's AKS sign-off, confirm `PLACEMENT_FEE_CENTS` (coded default $2,500 since OL-187), then set `PLACEMENT_FEE_ENABLED`.
2. **Background checks #12.** FCRA review + Checkr contract.
3. **Rides #11 and Wallet fee #13.** These hold third-party money. Get a money-transmitter/NEMT review, or keep them disabled. Effort L.

**Retire:** DP prices #14 (code removed in OL-187; archive the two prices in the Stripe dashboard). CareCredit #15 stays a non-revenue link unless an affiliate deal is signed.
