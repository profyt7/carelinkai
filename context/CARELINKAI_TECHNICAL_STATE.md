# CareLinkAI — Technical State
_Last updated: 2026-06-25 — claim-nudge pilot SENT; directory deduped to 163; 61 contacts loaded_

## Active Branch (2026-06-25)
`main` — **operator-acquisition engine live; first claim-nudge pilot sent.** Five PRs (#615–#619): archived closed/dup rows + finished Medina Pointe (#615); loaded **61 outreach emails + 155 phones** from Cowork research into the nudge channel (#616); deduped 5 ACTIVE twins so no operator gets two invites (#617, directory 168→**163**); built the proactive batch claim-nudge sender — `src/lib/email.ts sendDirectoryClaimInviteEmail()` + `scripts/send-claim-nudges.ts`, reusing the signed 45-day claim token + 24h `claimNudgeLastSentAt` throttle, dry-run/tiered/HIGH-default (#618); claim-funnel tracker + 12 rebrand renames (#619, CI in flight). **Founder SENT the 13-home HIGH-confidence pilot on Render** — first proactive claim invites out via Resend. Key finding (Explore agent): no batch-sender existed before this — the nudge engine was purely inquiry-event-driven (`src/lib/claim-engine/inquiry-claim-notification.ts`). **Measure in ~3–5 days via `report-claim-funnel.ts`, then (after adding CAN-SPAM unsubscribe) scale to the 50 MEDIUM-tier contacts.** Prior entry below.

## Active Branch (2026-06-24 night)
`main` — **held DRAFT directory cohort taken LIVE (+22 ACTIVE).** Five PRs squash-merged: **#609** gates public phone to operator-claimed homes only (unclaimed listings show the inquiry path); **#610** codifies an AL/RCF-only publish policy in `publish-directory-homes.ts` (SNF-primary homes — no ASSISTED/MEMORY_CARE — stay DRAFT); **#611** `backfill-verified-addresses.ts` (NEW) wrote verified addresses to 11 OPEN held homes (two-source-verified, guarded, idempotent); **#612** `rebrand-and-address-batch-b.ts` (NEW) renamed + addressed 11 rebranded homes (display name + address, with a flag-only stale-description guard); **#613** `fix-stale-descriptions-batch-b.ts` (NEW) cleaned the one stale description it surfaced (Eliza at Chagrin Falls, fka Weils of Bainbridge). Founder ran each on Render (dry-run → `--force`), then `publish-directory-homes.ts --force`: **22 DRAFT→ACTIVE**, 4 held (missing address: Altercare [CLOSED 2019], Brookdale Medina North [address medium-confidence], Princeton Place, Montefiore), 2 skipped (SNF-only: Cedarwood Plaza, Gardens of Western Reserve). Script-only — no schema migration. **Production now serves 167 ACTIVE family-visible directory homes** (verified via `report-directory-homes.ts`: 183 rows = 167 ACTIVE + 15 held DRAFT + 1 INACTIVE). **Two cleanups open:** explicitly archive the closed Altercare (held only by missing address today); re-verify Brookdale Medina North → Medina Pointe address then publish. Prior entry below.

## Active Branch
`main` — **2026-06-24 OL-080 CLOSED: enrich now persists phone/contactEmail/tagline.** PR #607 (`5092c85`) adds the three columns (migration `20260624000001_home_public_contact_fields`), persists them in `autopopulate-cohort.ts` with AI provenance, exposes phone+tagline via `/api/homes/[id]`, renders them on the public listing (tagline + clickable `tel:`), and makes `report-directory-homes.ts` emit phone. Backfilled on Render (re-enrich, $8.46): **82 homes now have a phone, 74 a tagline, 8 a contactEmail.** `capacity` deliberately not auto-written (DOH-vs-site conflicts → OL-059 manual verify). Facility runway now: OL-059 (verify capacity-flagged homes) → publish held DRAFTs → OL-084 (JS-rendered homes, deferred). Prior day below.

## Active Branch (2026-06-23 late evening)
`main` — **directory photos imported + AVIF fix.** Photo pipeline run on Render (`autopopulate-cohort.ts --photos-only --force`) → **417 Cloudinary-hosted photos** across ~74 of 93 homes ($1.43/run). **OL-086 (#604 `8c6088f`):** `photo-rehost.ts` now detects ISO-BMFF AVIF/HEIF and transcodes to JPEG via sharp before Cloudinary upload (size cap 4MB→12MB) — recovered East Park + Merriman (Webflow/AVIF, were 0 photos) and the oversized Rockynol/Nason JPEGs. **OL-085 photos = DONE; OL-086 = DONE.** **OL-084 (headless scrape for ~13 JS-rendered homes) = DEFERRED** (founder call): prod container has no Chromium (Playwright is dev-only) + the "never write to prod from CI" scar make it a larger infra task; recommended future path is a gated `workflow_dispatch` Action (see OL-084). Earlier same day below.

## Active Branch (earlier 2026-06-23)
`main` — **directory "richer listings" Step 2 shipped: URL hygiene + text-enrich.** `verify-directory-websites.ts` (#601 `86aad9f`) re-verified stored website URLs via Places with a **city-token-removed name match** (rejects rebrand cross-matches); founder ran it on Render → 12 nulled, 11 refreshed, 95 kept (+ 2 name-collision nulls by hand: Princeton Place→LA, Vista Springs Macedonia→Ravinia). Then `autopopulate-cohort.ts --from-db --include-unpopulated --include-active --force` enriched **90/105 homes (HIGH/MEDIUM), 13 sparse, 2 blocked, $8.47, TEXT ONLY (no photos)**. **Sparse-write guard #602 (`50c720d`):** skip the DB write when `extractionConfidence==='LOW'` (empty/JS-rendered pages emit a truthy `"<UNKNOWN>"` description that otherwise overwrites the listing + stamps `autoPopulatedAt`). ⚠️ **Incident:** the live enrich ran on **un-patched** code because the **Render shell has no git remote** (`git checkout` of the #602 branch silently failed) — 9 homes got `"<UNKNOWN>"` (7 ACTIVE) + Brookdale Willoughby got wrong-page generic content; all repaired via inline Prisma (seed-fallback descriptions; `description` is NOT NULL so a string, not null). **Earlier same day:** OL-083 CLOSED — Greater-Cleveland directory LIVE (128 ACTIVE, 6 counties): publish-wide rollout (#588–#593) + metro seed (#595) + #597/#598/#599. Migration on main: `20260623000001_inquiry_nullable_family`. ⚠️ `claude/inspiring-mayer-rvgyys` is a stale graveyard branch — do not push onto it. ⚠️ **Render production shell cannot `git pull`** — use inline `npx tsx -e` for ad-hoc DB ops, or wait for main auto-deploy to land script changes.

## How-To Guides (Education Hub) — content pipeline
The `/learn` How-To section renders from `src/app/learn/howto/content.ts` (`HOWTO_GUIDES`), role-gated by `src/lib/howto/access.ts` (audience→role; getting-started + family visible to all). That file is **auto-generated** — do not hand-edit. Source content is authored in the ChrisOS vault (`04_CareLinkAI/howto/`), cleaned into an app bundle (`manifest.json` + `content/<role>/*.md`), and transformed by `scripts/generate-howto-content.ts` (`npx tsx scripts/generate-howto-content.ts`). Guide screenshots live under `public/howto/`; the renderer shows only files that exist (build-time `AVAILABLE_HOWTO_IMAGES`), so missing captures are text-first with no 404s. The 71 expected screenshot filenames are checklisted in `public/howto/README.md` (OL-071). **IA (2026-06-16):** `/learn` is split into two tabs via the `?tab=` query param — **How-To & Tutorials** (default) and **Senior Care Guides** (the `GUIDES` articles in `src/app/learn/guides/content.ts`) — so How-To stays one click from the top as the article library grows.

## Production URL
https://carelinkai.onrender.com (also: https://getcarelinkai.com)

## Hosting
- **Platform:** Render.com
- **Build:** Docker container, auto-deploy from `main` branch
- **Database:** PostgreSQL on Render
- **Image storage (HIPAA Phase 1):** PHI → S3 (bucket carelinkai-prod-phi, us-east-2, SSE-S3, AWS BAA signed 2026-05-13). PUBLIC/PII → Cloudinary.
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
67+ Prisma models + enums. **2026-06-05 (PR #545, merged):** `AssistedLivingHome` adds 6 AI auto-population fields: `websiteUrl String?`, `autoPopulatedAt DateTime?`, `autoPopulatedFromUrl String?`, `autoPopulatedVersion Int? @default(0)`, `preFilledFields Json?`, `aiPopulationConfidence String?`. Migration: `20260605000001_home_auto_populate_fields`. **2026-06-04 (PR #542, merged):** `Operator` adds `seededHomeId String?` (tracks admin-seeded home assigned via Cleveland founder claim token). Migration: `20260602000001_operator_seeded_home`. **2026-05-16 (Phase 3 PR B, pending merge):** `Operator` adds 8 nullable BAA/DPA acceptance fields; `AuditAction` enum adds `LEGAL_ACCEPTANCE`. Migration: `20260516000001_add_operator_baa_dpa_acceptance`. **2026-05-14 (Phase 2, on main):** `Document` adds `classification DataClassification @default(PHI)` + `storage String?`. **Earlier:** `DischargePlannerLicenseType`, `AffiliateReferralType`, `CommissionTier` enums; provider/caregiver subscription fields; `BackgroundCheckInvitation`, `ProviderBackgroundCheckOrder` models. ⚠️ Migrations 20260505000001/2/3 + 20260506000001 pending deploy on Render DB.

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
- **Operator onboarding wizard:** 4-step guided flow (company → first home → Cleveland founder claim → plan selection); new operators auto-redirected from `/operator` via AcceptanceGate; wizard detects seeded home and pre-populates Step 2 for founders; Step 4 shows free founder card or 4 paid tiers (Starter/Professional/Growth/Agency)
- **AI Auto-Population Pipeline:** `src/lib/operator-profile-scraper.ts` (robots.txt-respecting, 30s timeout, file-based cache, SPA detection) + `extractProfileFromWebsite()` in `home-profile-generator.ts` (Claude Sonnet 4.6, forced tool use for structured JSON, SAFETY CONSTRAINTS in system prompt) + `scripts/autopopulate-cohort.ts` (CSV batch runner: `--dry-run`/`--force`/`--resume`/`--facility`). Onboarding Step 2 shows `ProvenanceBadge` (AI vs SEED vs OPERATOR) and pre-populated UX when `autoPopulatedAt` is set. Admin home detail page shows AI panel (date, source URL, confidence, version). **Production state: 15/15 first-batch Cleveland facilities auto-populated, $1.44 total Anthropic spend, 12 HIGH + 3 MEDIUM confidence.**
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
- **Household Shift Scheduling (Option B):** `HouseholdShift` model — linked to `MarketplaceHire` + `User(familyUserId)`; status String (SCHEDULED/COMPLETED/CANCELLED). Migration: `20260507000001_household_shifts`. API: GET/POST `/api/family/household` (list hires+shifts, create shift with ownership + date validation); PATCH/DELETE `/api/family/household/shifts/[id]` (update status, delete). UI: `/dashboard/household` — care team grid + schedule form + shift history with mark-complete/cancel/delete. DashboardLayout: "My Household" nav for FAMILY role. Landing page: Feature 9 card + families benefit bullet. Future: timesheet approval + Stripe Connect direct payout.

## Provider Listing + Pro Caregiver Billing (as of 2026-05-03)
- **Provider Marketplace Listing ($99/mo):** Stripe Checkout + Customer Portal at `/settings/provider/billing`. Webhook syncs `listingStatus`. CANCELED/PAST_DUE/INCOMPLETE providers hidden from marketplace. Null = grace period. Requires `STRIPE_PRICE_PROVIDER_LISTING` env var. ✅ Billing nav link added to DashboardLayout.
- **Pro Caregiver ($19/mo):** Stripe Checkout + Customer Portal at `/settings/billing`. `isPro=true` on ACTIVE/TRIALING. Pro caregivers rank first in all searches (`isPro: desc` orderBy). ★ Pro badge on CaregiverCard. `applicationCount` **fully enforced** — basic caregivers blocked at 10 apps/month with upsell banner; Pro caregivers uncapped. Monthly reset cron live (`0 0 1 * *`). Requires `STRIPE_PRICE_PRO_CAREGIVER` env var. ✅ Billing nav link added to DashboardLayout.
- **Background check markup:** ENHANCED $34.99, MVR $19.99, PREMIUM $59.99.
- **Admin MRR dashboard:** `/admin/page.tsx` now shows 5-tile Revenue Overview: Total MRR + per-stream breakdown (Operators, Providers, Pro Caregivers, Discharge Planners) with live counts.

## Transport — Phase 4: NEMT Anti-Fraud + Reliability Score (as of 2026-05-05)
- **Trip verification:** `actualPickupAt` / `actualDropoffAt` set server-side on status transitions (`/api/rides/[id]/start` + `/complete`). Driver cannot edit. Supports Medicaid claim data.
- **No-show accountability:** `noShowCausedBy` on Ride (PROVIDER/RIDER/FACILITY/WEATHER/OTHER). Cancel modal collects cause when status is IN_PROGRESS. Stored via PATCH `/api/rides/[id]`.
- **Recurring ride auto-scheduler:** Cron `GET /api/cron/recurring-rides` (`0 7 * * *`). Finds all seed rides (`isRecurring=true, recurringRootId=null`), spawns children 14 days ahead. Respects `recurringEndDate`. Return trip offset preserved.
- **Provider reliability score:** `src/lib/rideStats.ts` — transport-only gate, weighted 60% completion + 40% on-time. `scoreLabel()` returns Excellent/Very Good/Good/Fair/Needs Work with color classes. Provider dashboard: 4th tile + Ride Dispatch quick action (PROVIDER+transport only). Marketplace detail: progress bars in Transport Capabilities block. API: `rideStats` field in `/api/marketplace/providers/[id]` response.

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

## HIPAA Phase 1 Status (as of 2026-05-13)
- **AWS S3 foundation:** Live — bucket `carelinkai-prod-phi`, us-east-2, SSE-S3, versioning on. IAM user `carelinkai-app-prod` with policy `carelinkai-prod-phi-rw`. Render env vars set: `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_S3_ACCESS_KEY_ID`, `AWS_S3_SECRET_ACCESS_KEY`. AWS BAA signed 2026-05-13.
- **3 PRs pushed, awaiting merge:**
  - PR 1 `claude/hipaa-phase1-schema-2026-05-13`: DataClassification enum + columns on 4 tables
  - PR 2 `claude/hipaa-phase1-routing-2026-05-13`: storage router, S3 rewrite, all env vars unified, route refactors, 6 unit tests
  - PR 3 `claude/hipaa-phase1-purge-2026-05-13`: purge script (26 seed Cloudinary files from PHI tables)
- **MERGE ORDER:** PR 1 → PR 2 → PR 3. PR 2 depends on Prisma client generated from PR 1.
- **Phase 2 remaining:** `documents/upload/route.ts` (generic Document model, PHI-linked), `upload/route.ts`, `residents/[id]/photo/route.ts` (local FS) — all flagged with HIPAA-TODO Phase 2 comments.

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
- [ ] `STRIPE_PRICE_AGENCY` ← **NEW — required for Agency tier Stripe Checkout**
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
3. Update `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_AGENCY` in Render
4. Re-register webhook endpoint in new Stripe account
Zero code changes required.

## Deployment Notes
- Render auto-deploys on push to `main`
- After any schema change, verify `npx prisma migrate status` in Render shell
- Build warnings (missing STRIPE_KEY) are expected during build — dummy keys at build time, real keys at runtime

## Revenue Model
See `REVENUE_MODEL.md` for the full breakdown. 12 streams finalized:
1. **Operator SaaS subscription** (PRIMARY) — $99/$249/$499/$799/mo — **checkout now wired**
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

## Provider Credentialing + Compliance (as of 2026-05-05)
- **Provider credentials CRUD:** `ProviderCredential` model (already in schema). `GET/POST /api/provider/credentials`, `DELETE /api/provider/credentials/[id]`. Status lifecycle: PENDING → VERIFIED / REJECTED / EXPIRED. Providers can upload background check, drug test, CPR cert, vehicle inspection, insurance, driver's license, NEMT license, other.
- **Provider credentials UI:** `/settings/provider/credentials` — status tabs, add form, expiry date, doc URL, notes. Certified banner when 3+ VERIFIED. CareLinkAI Certified badge on ProviderCard + provider detail page when verifiedCredentialCount >= 3.
- **Admin credentials queue:** `GET /api/admin/provider-credentials?status=PENDING&limit=100` — list endpoint across all providers. `/admin/credentials` — queue UI with status tabs (PENDING/VERIFIED/REJECTED/EXPIRED/ALL), one-click Verify, Reject with optional reason prompt. Links to `/admin/providers/[id]`. Quick-action card added to admin dashboard.
- **Credential expiry cron:** `GET /api/cron/credential-expiry` — marks EXPIRED, deactivates providers with critical expired types (BG check, insurance, vehicle inspection, NEMT license), sends 30-day warning emails via Resend. Chris registered Render cron `0 6 * * *`.
- **Provider onboarding welcome email:** Fires after PROVIDER registration (fire-and-forget). 3 steps: complete profile → upload credentials → activate listing. Links corrected to `/settings/provider`, `/settings/provider/credentials`, `/settings/provider/billing`.
- **Provider profile completeness checklist:** 8-step progress widget on provider dashboard. Shows % complete + progress bar + per-item checklist with direct CTAs. Disappears when all 8 steps done. Credentials quick-action tile added (shows X/3 verified).

## Recent Technical Decisions (2026-06-21 — batch-2 cleanup)
- **Guarded data-ops via hardcoded-id script, not ad-hoc SQL** — `scripts/cleanup-batch2.ts` (PR #580) is dry-run by default; only deletes/retires a home when it is `status=DRAFT` AND zero-activity across all child relations (inquiries, residents, bookings, tours, placements, waitlist, shifts, reviews, favorites, matches), with a per-target name check so a wrong id can't hit the wrong listing. Anything else is skipped + flagged. Reusable pattern for future cohort cleanups.
- **INACTIVE is the soft-delete** — no `deletedAt` column on `AssistedLivingHome`; Villa Serena was retired via `status=INACTIVE` (reversible) rather than a hard delete, since it's a real facility just out of AL outreach scope (HUD 202 independent-living).
- **Address backfill is Places-only and write-additive** — `autopopulate-cohort.ts --addresses-only` uses Google Places (no scrape/AI/photos, $0 Anthropic) and only fills a missing street/zip from a HIGH-confidence match (OL-066 guard rejects wrong-location/low matches); it does not set `autoPopulatedAt`, so backfilled homes stay `enriched=no` until a full enrich.
- **Stale graveyard branch confirmed** — `claude/inspiring-mayer-rvgyys` carries How-To/discharge-planner work that was independently merged to main via PRs; merging main into it throws 7 conflicts incl. code files. Session-wraps and new work go on fresh branches off main (CLAUDE.md branching discipline), not onto it.

## Recent Technical Decisions (2026-06-05)
- **Claim token expiry raised to 7 days (168h)** — 48h was too short for founders to act on email; NEXTAUTH_SECRET rotation is now the only invalidation path
- **Inline robots.txt parser** — no external dependency; avoids npm dep for a small parsing task
- **SPA detection heuristic** — if HTML >1000 chars but visible text <200 chars → PERMANENT/JS_ONLY; prevents garbage AI extraction on JS-rendered sites
- **Claude tool_choice: forced** — `{ type: 'tool', name: 'extract_profile' }` guarantees structured JSON output; no text fallback path needed
- **preFilledFields JSON map** — `{ fieldName: 'AI' | 'SEED' | 'OPERATOR' }` for per-field provenance; ProvenanceBadge reads this to render AI vs DOH badge
- **Timeout classified as PERMANENT not TRANSIENT** — a site that times out consistently is not going to succeed on retry; skip it
- **CLAUDE.md branching discipline extended** — explicit API/GraphQL bypass loophole added; all write paths to main require PR regardless of mechanism (PR #543)
- **Claim token applied at signup time** (not post-signIn) — register API handles it atomically; avoids the PENDING-user signIn block that was dropping the token
- **seededHomeId on Operator** — single field tracks the admin-seeded home; cleared to null after operator claims it via `POST /api/operator/homes/[id]/claim`
- **AGENCY tier added at $799/mo** — shown in wizard Step 4 alongside Starter/Professional/Growth; `STRIPE_PRICE_AGENCY` env var needed

## Immediate Next Priorities
0. **Batch-2 punch list (2026-06-21)** — (a) fix Windsor Heights `websiteUrl` (still points to the wrong Sunshine/Beachwood Retirement site), then full-enrich the 3 address-only homes (Windsor Heights, Bickford, Rocky River Village) once working non-SPA URLs exist; (b) reconcile rebrand names — Bickford of Rocky River → "Bloom of Rocky River" and Rocky River Village → "Meadow Falls of Rocky River" (addresses confirm same buildings; mirror the Anthology→Ashton rename); (c) optional `--addresses-only` pass on The Ashton (shows `city=(pending)` despite enriched=yes). See OL-081.
1. **Merge non-Cleveland demo homes cleanup** — branch `chore/remove-non-cleveland-demo-data`: create PR, dry-run, then `--force` to delete Golden Years (Chicago), Lakeside Rehab (Seattle), Harbor View (Miami).
2. **Set `STRIPE_PRICE_AGENCY` in Render (OL-055)** — create $799/mo Agency product in Stripe dashboard, set env var. Agency Stripe Checkout fails without it.
3. **Cleveland founder end-to-end smoke test (OL-056)** — seed a home, generate claim link, register new operator with claimToken, complete wizard Steps 1-4, verify free access granted, no Stripe redirect.
4. **Second batch Cleveland facilities auto-population** — queue next set of facilities, create CSV, run `autopopulate-cohort.ts --dry-run` then `--force`.
5. **Merge HIPAA Phase 1 PRs** — in order: PR 1 (schema) → PR 2 (routing) → PR 3 (purge). Monitor Render deploy + migration apply.
6. **Switch Stripe to live mode** — swap all `STRIPE_*` env vars to live keys in Render. Runbook: `context/STRIPE_SETUP_RUNBOOK.md`.
