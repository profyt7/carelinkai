# CareLinkAI — Technical State
_Last updated: 2026-05-04_

## Active Branch
`main` — all Transport Phase 2 work + landing page updates committed directly to main (auto-deploys to Render)

## Production URL
https://carelinkai.onrender.com (also: https://getcarelinkai.com)

## Hosting
- **Platform:** Render.com
- **Build:** Docker container, auto-deploy from `main` branch
- **Database:** PostgreSQL on Render
- **Image storage:** Cloudinary
- **Email:** Resend

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Render) |
| Auth | NextAuth.js (credentials + 2FA) |
| Images | Cloudinary |
| Email | Resend (primary), SendGrid (legacy fallback) |
| Error monitoring | Sentry |
| Styling | Tailwind CSS |
| Real-time | SSE (Server-Sent Events) |
| Payments | Stripe (subscriptions now wired; test keys active) |
| AI — All features | Anthropic Claude API (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) |

## Schema Summary
67+ Prisma models + enums. New since 2026-04-27: `DischargePlannerLicenseType` enum (INDIVIDUAL/DEPARTMENT), `AffiliateReferralType` enum (OPERATOR/FAMILY), `CommissionTier` enum (STANDARD/SILVER/GOLD). New fields: `DischargePlannerProfile.licenseType + seatCount`, `Family.referredByCode`, `AffiliateReferral.referralType`, `Affiliate.commissionTier`. `SubscriptionPlan` enum: +AGENCY. Migration: `20260427000000_revenue_model_expansion`. **2026-05-02:** `Provider` adds `stripeCustomerId`, `stripeSubscriptionId`, `listingStatus`, `listingPeriodEndsAt`; `Caregiver` adds `isPro`, `proStripeCustomerId`, `proStripeSubscriptionId`, `proStatus`, `proPeriodEndsAt`, `applicationCount`, `applicationCountResetAt`. Migration: `20260502000003_add_provider_listing_and_pro_caregiver`.

## User Roles
FAMILY, OPERATOR, CAREGIVER, ADMIN, STAFF, PROVIDER, AFFILIATE, DISCHARGE_PLANNER

## What Is Built and Working
- Authentication: NextAuth credentials, 2FA, RBAC, JWT sessions
- Operator portal: homes, caregivers, residents, shifts, tours, inquiry pipeline
- Family portal: search, inquiries, residents, documents, messaging, favorites
- Admin portal: user management, audit logs, impersonation, exports, broadcasts
- Marketplace: listings, applications, hires, favorites
- Discharge Planner: AI placement search, placement requests
- CareBot: floating AI chat widget (Claude Haiku 4.5 + prompt caching)
- Inquiry AI: Claude Sonnet 4.6 response generation + email delivery
- Stripe: invoice items, webhooks, wallet, Stripe Connect, SaaS subscriptions
- **Placement fee (Revenue Stream 2):** Queued as Stripe invoice item on conversion; collected on next billing cycle; PENDING→PROCESSING→COMPLETED trail
- **Care Wallet spending (Revenue Stream 6):** Families pay monthly fee + deposit from wallet balance; 2.5% CareLinkAI fee; atomic balance deduction + Payment record
- **Affiliate commission (Revenue Stream 8):** affiliateCode captured on Inquiry at creation; commission auto-recorded on conversion; affiliate dashboard with referral link, stats, payout history
- **SMS notifications (Twilio):** operator: new inquiry, tour booked, payment failed; family: inquiry response received; cron: 24h tour reminders
- **FOUNDERS49 promo code:** Stripe coupon $50/mo off forever, max 50 redemptions; banner in billing UI
- Resend: verification + password reset emails
- Cloudinary: image uploads
- Sentry: error monitoring + session replay
- Analytics: GA4, GTM, FB Pixel, Clarity
- Anthropic Claude API: CareBot, inquiry responses, document classification, discharge planner search, match explanations, tour scheduling, home profile generation
- Operator subscription billing: Checkout (14-day trial), Customer Portal, webhook lifecycle handlers, feature gating utility
- **Admin revenue dashboard:** MRR, placement fees collected/pending, affiliate commissions owed, recent payments table, subscription breakdown by plan
- **Admin portal — Affiliates page:** `/admin/affiliates` — stat cards, affiliates table with earned/unpaid/conversions, all-referrals detail table
- **Admin portal — Operators page:** `/admin/operators` — 9-column table, MRR by plan tier, bed occupancy, past-due highlights
- **Admin portal — Discharge Planners page:** `/admin/discharge-planners` — active planners table, MRR at $99/seat
- **Fix Demo Caregiver Employment:** `/api/admin/fix-demo-employment` POST endpoint + Admin Tools UI button; auto-creates `CaregiverEmployment` records for demo operator's caregivers
- **Operator onboarding wizard:** 3-step guided flow (company → first home → plan selection); new operators auto-redirected on first login
- **Caregiver marketplace hire fee:** $250 Stripe invoice item queued on shift claim; MARKETPLACE_HIRE_FEE PaymentType
- **Featured listings:** isFeatured/featuredUntil on homes; $79/mo billed as invoice item; search results sorted featured-first; operator toggle in home edit page
- **Discharge planner subscription:** DischargePlannerProfile model; $99/seat/mo Stripe checkout at /discharge-planner/billing; webhook handler synced
- **AI Shift Auto-fill:** POST /api/operator/shifts/autofill — Claude Haiku matches available caregivers to free-text shift description; ShiftAutoFill component
- **On-Call AI (active outreach):** Wave-based SMS/voice dispatch; ShiftNeed model; CoverageAttempt tracking; haversine distance ranking; Twilio SMS + IVR webhooks; Render cron `/api/cron/oncall-waves`; operator On-Call AI page at /operator/oncall
- **Caregiver reliability score:** 0-100 computed from reviews (30%) + shifts (25%) + BG check (20%) + call-offs (25%); updates on review create, timesheet approval, and call-off record
- **Aide gamification (points/tiers):** BRONZE/SILVER/GOLD/PLATINUM tiers; points auto-awarded on timesheet approval and reviews; penalized on call-off; PointsDashboard at /caregiver/points
- **Caregiver My Applications:** `GET /api/caregiver/applications` + `/caregiver/applications` page — lists all job applications with status badges, listing details, rate, location, applied-ago; Quick Action card + sidebar nav link
- **Application status notifications:** In-app notification + email + SMS (if Twilio configured) to caregiver on every status change; listing owner gets email + SMS on new application
- **Provider reviews:** `ProviderReview` Prisma model; `GET/POST /api/reviews/providers`; `ProviderReviewsListClient` component; wired into provider detail page — full star rating, write-a-review form, duplicate prevention
- **Operator Caregiver Reviews (`/operator/reviews`):** Lists all marketplace-hired caregivers with aggregate stars, rating breakdown bars, latest reviews inline, Leave Review modal, sidebar nav link
- **Caregiver rating dashboard:** 4th stat tile on `/caregiver` shows avg star rating + review count; "My Reviews" section shows 3 most recent reviews
- **Shift bidding:** Caregivers bid on open shifts; operators accept/decline; on accept: shift assigned + MarketplaceHire + hire fee triggered atomically
- **Waitlist management:** WaitlistEntry model; /api/operator/homes/[id]/waitlist + /api/family/waitlist
- **Education hub:** 15 long-form guides at /learn and /learn/guides/[slug] (SEO-optimized, no CMS needed; content.ts is single source of truth)
- **Care Concierge widget:** Replaces CareBot globally; family-facing AI chat (Claude Haiku) with home search + care term lookup tools; `/api/care-concierge` public endpoint
- **Family onboarding wizard:** /get-started 3-step wizard (role → need → timeline) routes families to the right destination
- **Financing CTAs:** CareCredit affiliate links on /learn and home listing pricing tab
- **Compliance document kits:** 3 Ohio ALF kits ($149-$199); one-time Stripe checkout; ComplianceKitPurchase model; /operator/compliance-kits
- **CareLinkAI Plus ($19/mo):** `plusStatus` + `isPlus` on Family model; Stripe Checkout + Customer Portal at `/settings/family/billing`; webhook syncs status; Plus nav item with amber highlight in sidebar; features: priority matching, unlimited saves, Care Concierge priority, advanced filters, early access; admin MRR tile tracks familyPlusMRR. `STRIPE_PRICE_FAMILY_PLUS` env var confirmed set.

## Provider Listing + Pro Caregiver Billing (as of 2026-05-03)
- **Provider Marketplace Listing ($99/mo):** Stripe Checkout + Customer Portal at `/settings/provider/billing`. Webhook syncs `listingStatus`. CANCELED/PAST_DUE/INCOMPLETE providers hidden from marketplace. Null = grace period. Requires `STRIPE_PRICE_PROVIDER_LISTING` env var. ✅ Billing nav link added to DashboardLayout.
- **Pro Caregiver ($19/mo):** Stripe Checkout + Customer Portal at `/settings/billing`. `isPro=true` on ACTIVE/TRIALING. Pro caregivers rank first in all searches (`isPro: desc` orderBy). ★ Pro badge on CaregiverCard. `applicationCount` **fully enforced** — basic caregivers blocked at 10 apps/month with upsell banner; Pro caregivers uncapped. Monthly reset cron live (`0 0 1 * *`). Requires `STRIPE_PRICE_PRO_CAREGIVER` env var. ✅ Billing nav link added to DashboardLayout.
- **Background check markup:** ENHANCED $34.99, MVR $19.99, PREMIUM $59.99.
- **Admin MRR dashboard:** `/admin/page.tsx` now shows 5-tile Revenue Overview: Total MRR + per-stream breakdown (Operators, Providers, Pro Caregivers, Discharge Planners) with live counts.

## Transport — Phase 3: Manifest, Shared Rides, Capacity (as of 2026-05-04)
- **Provider manifest view:** `/rides` page redesigned for PROVIDER role — day-grouped cards showing time, passenger name, route, status badge, collapsible detail (contact, purpose, return/recurring, fare). PassengerNeedsRow shows NEMT tags (mobility level, door level, O₂, companion, cognition, service animal, wait time). Day-level CapacityBar (green→amber→red) vs `vehicleCapacity`.
- **Batch opportunity detection:** Client-side — rides within 90 min of each other going to same destination flagged with amber "Batch possible" banner at the day level and gold star on individual cards.
- **Shared rides:** `isSharedRide Boolean` + `sharedRideGroupId String?` on Ride model. Family can opt in at booking (step 2 of RideRequestModal). Provider can toggle per card in manifest. `PATCH /api/rides/[id]/shared` endpoint. Migration: `20260504000005`.
- **Vehicle capacity:** `vehicleCapacity Int @default(4)` on Provider. Editable in `/settings/provider` (Vehicle & Capacity section). Returned by `GET /api/rides` for PROVIDER role. Used by CapacityBar in manifest.

## Transport — Full End-to-End Booking (Phase 2 — as of 2026-05-04)
- **Phase 1 (complete):** Provider transport fields (`rideTypes[]`, `wheelchairAccessible`, `acceptsMedicaid`, `serviceRadius`), marketplace filters, inquiry form trip details, provider detail transport section.
- **Ride model:** `Ride` table with full lifecycle enum `REQUESTED → CONFIRMED → PAID → IN_PROGRESS → COMPLETED → CANCELED`. Fields: `familyId?`, `operatorId?`, `providerId`, `residentName?`, `bookedByRole` (FAMILY/OPERATOR), `baseFare`, `platformFeePercent` (default 12%), `platformFee`, `totalAmount`, `stripePaymentIntentId`, `stripeCheckoutSessionId`, `canceledBy`, `cancelReason`. Migrations: `20260504000001` (Ride model) + `20260504000002` (operator fields, nullable familyId).
- **API routes:** `POST/GET /api/rides` (book + list, role-scoped), `GET/PATCH /api/rides/[id]` (view + cancel + Stripe refund if PAID), `POST /api/rides/[id]/confirm` (provider sets fare), `POST /api/rides/[id]/pay` (Stripe Checkout), `POST /api/rides/[id]/start` (PAID→IN_PROGRESS), `POST /api/rides/[id]/complete` (IN_PROGRESS→COMPLETED).
- **Stripe integration:** Checkout Session with `metadata.type="RIDE_PAYMENT"`; webhook handler in `/api/webhooks/stripe` sets status→PAID + stores `stripePaymentIntentId`; PAID cancellations trigger `stripe.refunds.create()`.
- **Email notifications:** Provider notified on new booking; family notified when confirmed (with payment link); provider notified when ride paid; booker (family or operator) notified on completion; cancellation emails to opposing party.
- **Cron:** `GET /api/cron/ride-reminders` — sends reminder emails to booker + provider for rides within 23–25h window. Protected by `CRON_SECRET`. Render cron added by Chris.
- **UI:** `/rides` management page with role-adaptive views (provider: Confirm/Decline/Start/Complete; family/operator: Pay/Cancel); `RideRequestModal` with resident name field for operators; `BookTransportButton` on resident detail page; "Book Ride for Resident" button on provider detail page.
- **Nav:** "My Rides" sidebar nav item added for FAMILY + PROVIDER roles.
- **Admin:** Transport commissions (12% platform fee × completed rides MTD) in 7th MRR tile on admin dashboard.

## Known Issues (as of 2026-05-02)
1. Demo accounts use test Stripe data — when switching to live Stripe, all operator `stripeCustomerId` fields must be cleared and operators re-subscribed
2. seed-demo.ts `update:{}` bug fixed for all 7 top-level user accounts; nested operator/caregiver/etc upserts still use `update:{}`
3. **One-time production action needed:** Admin must click "Fix Demo Caregiver Employment" in Admin Tools (`/admin/tools`) on production to link demo caregivers to the demo operator in the production DB — otherwise Operator caregiver tab shows blank
4. Landing page still uses some raw hex literals (`#3978FC`, `#7253B7`) in inline styles — cosmetic only
5. `NEXT_PUBLIC_SOCKET_URL` console warning — SSE works fine, no WebSocket server configured (not blocking anything)

## Pending Deployment Actions (before subscription billing goes live)
1. **Merge branch to main** — triggers Render auto-deploy
2. **Apply migration** — run `npx prisma migrate deploy` in Render shell (or verify auto-migration on deploy). Migration: `20260424000000_add_operator_subscription_fields`
3. **Create Stripe Products** — in Stripe dashboard, create recurring monthly prices: Starter ($99), Professional ($249), Growth ($499)
4. **Set env vars in Render:**
   - `STRIPE_PRICE_STARTER` = price_xxx (from Stripe dashboard)
   - `STRIPE_PRICE_PROFESSIONAL` = price_xxx
   - `STRIPE_PRICE_GROWTH` = price_xxx
5. **Register Stripe webhook** — in Stripe dashboard, add endpoint: `https://getcarelinkai.com/api/webhooks/stripe` with events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
6. **Configure Customer Portal** — in Stripe dashboard under Billing > Customer Portal: enable cancel subscription, update payment method, update billing info

## Environment Variables — Render Dashboard Checklist
These MUST be set on Render for production to work:
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL` = `https://getcarelinkai.com`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_STARTER` ← required for subscription checkout
- [ ] `STRIPE_PRICE_PROFESSIONAL` ← required for subscription checkout
- [ ] `STRIPE_PRICE_GROWTH` ← required for subscription checkout
- [x] `PLACEMENT_FEE_CENTS` = `150000` ✅ updated 2026-05-02 — placement fee now $1,500
- [x] `STRIPE_PRICE_PROVIDER_LISTING` ✅ set 2026-05-02 — $99/mo provider listing
- [x] `STRIPE_PRICE_PRO_CAREGIVER` ✅ set 2026-05-02 — $19/mo pro caregiver
- [x] `STRIPE_PRICE_FAMILY_PLUS` ✅ set — $19/mo CareLinkAI Plus family subscription
- [ ] `WALLET_FEE_PCT` = `2.5` ← **NEW — Care Wallet service fee**
- [ ] `DEFAULT_AFFILIATE_COMMISSION_PCT` = `20` ← **NEW — affiliate commission %**
- [ ] `TWILIO_ACCOUNT_SID` ← **NEW — SMS notifications**
- [ ] `TWILIO_AUTH_TOKEN` ← **NEW — SMS notifications**
- [ ] `TWILIO_PHONE_NUMBER` ← **NEW — SMS notifications**
- [ ] `CRON_SECRET` ← **NEW — secures tour-reminders cron endpoint**
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM` = `noreply@getcarelinkai.com`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `SENTRY_DSN`
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `ALLOW_DEV_ENDPOINTS` = NOT SET (must not exist in production)

## Stripe Key Swappability
Architecture is env-var-only. When the current test Stripe account is replaced:
1. Update `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in Render
2. Re-create Products/Prices in the new Stripe account
3. Update `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_GROWTH` in Render
4. Re-register webhook endpoint in new Stripe account
Zero code changes required.

## Deployment Notes
- Render auto-deploys on push to `main`
- After any schema change, verify `npx prisma migrate status` in Render shell
- Build warnings (missing STRIPE_KEY) are expected during build — dummy keys at build time, real keys at runtime

## Revenue Model
See `REVENUE_MODEL.md` for the full breakdown. 12 streams finalized:
1. **Operator SaaS subscription** (PRIMARY) — $99/$249/$499/mo — **checkout now wired**
2. Family placement/referral fee — one-time on conversion
3. Caregiver marketplace placement fee — per-hire
4. Discharge Planner SaaS — per-seat hospital subscription
5. Featured listings — $49-$99/mo add-on
6. Care Wallet transaction fee — 2-3% on care bill payments (highest long-term potential)
7-12. (Providers marketplace, Affiliate, Assessments, Document AI, Data/Analytics, API)

## Playwright E2E Test Suite
- Config: `playwright.config.ts` — auto-starts dev server, 1 worker, retries on failure
- Auth helpers: `tests/helpers/auth.ts` — login with 3-attempt retry, cookie consent pre-set
- Bug verification: `tests/bug-verification.spec.ts` — covers Bugs 1-3
- Operator onboarding: `tests/operator-onboarding.spec.ts` — 10 steps covering full operator journey
- Run: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright test --workers=1`
- Local limitation: Prisma binary engine in sandbox dies after ~7 tests due to thread limits. NOT a production issue.

## Design System (as of 2026-04-25)
- **Fonts:** Inter (sans/display/heading via `--font-inter`), DM Serif Display (serif/hero via `--font-dm-serif`)
- **Color tokens:** Fully unified across all 259 source files. Design system tokens only: `primary-*`, `neutral-*`, `error-*`, `success-*`, `warning-*`, `secondary-*`. No raw `red-*`/`green-*`/`blue-*`/`gray-*`/`purple-*` in any component (except `src/app/page.tsx` landing page, intentionally deferred).
- **Components polished:** StatCard (left-border accent + trend), skeleton-loader (shimmer + HomeCardSkeleton), tabs (real tokens), breadcrumbs, confirm-dialog, error, not-found, login page, search page.

## Immediate Next Priorities
1. **Switch Stripe to live mode** — swap all `STRIPE_*` env vars to live keys in Render, re-register webhook at live endpoint, create new Products/Prices in live Stripe dashboard, update `STRIPE_PRICE_*` vars. Runbook: `context/STRIPE_SETUP_RUNBOOK.md`.
2. **Set Checkr live keys** — set `CHECKR_API_KEY` + `CHECKR_WEBHOOK_SECRET` in Render once account approval received (OL-023).
3. **Test ride booking end-to-end** — Use `demo.provider@carelinkai.test` + `demo.family@carelinkai.test` to verify full REQUESTED→CONFIRMED→PAID→COMPLETED flow including Stripe Checkout and email notifications.
4. **Verify ride-reminders cron** — confirm Render cron is firing and emails are delivered for PAID rides within 23–25h window.
4. **Run Playwright smoke tests** across all 7 demo roles: `npm run test:e2e:prod`
5. **Switch Stripe to live mode** when ready — follow runbook in `context/STRIPE_SETUP_RUNBOOK.md`
6. **Set Checkr API keys** in Render: `CHECKR_API_KEY`, `CHECKR_WEBHOOK_SECRET`; register webhook at `https://getcarelinkai.com/api/webhooks/checkr` (OL-023, unblocked once account review completes)
