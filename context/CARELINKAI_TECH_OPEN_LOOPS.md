# CareLinkAI — Tech Open Loops
_Last updated: 2026-05-05_

## Format
Each loop: what it is, why it matters, what done looks like.

---

## 🔴 Critical (Blocking Revenue / Demos)

### OL-027: Provider listing fee ($99/mo)
- **Status:** ✅ CLOSED (2026-05-02)
- Schema fields + migration, Stripe Checkout + Customer Portal APIs, webhook handler, visibility gate in marketplace API, billing UI at `/settings/provider/billing`. Requires `STRIPE_PRICE_PROVIDER_LISTING` env var in Render.

### OL-028: Pro Caregiver tier ($19/mo)
- **Status:** ✅ CLOSED (2026-05-02)
- Schema fields + migration, Stripe Checkout + Customer Portal APIs, webhook handler, `isPro: desc` search boost in all sort orders, ★ Pro badge on CaregiverCard, billing UI at `/settings/billing`. `applicationCount` tracked — enforcement (block/reset cron) still pending. Requires `STRIPE_PRICE_PRO_CAREGIVER` env var in Render.

### OL-029: Background check markup
- **Status:** ✅ CLOSED (2026-05-02)
- BackgroundCheckOrderPanel: ENHANCED $34.99, MVR $19.99, PREMIUM $59.99. Basic remains $0 (lead magnet).

### OL-030: Raise placement fee — update PLACEMENT_FEE_CENTS to $1,500 in Render
- **Status:** ✅ CLOSED (2026-05-02) — Chris updated `PLACEMENT_FEE_CENTS` to `150000` in Render dashboard. Placement fee is now $1,500.

### OL-031: Application cap enforcement for basic caregivers
- **Status:** ✅ CLOSED (2026-05-03)
- POST route blocks at 10 apps with 403 + `upgradeRequired: true`; `applicationCount` incremented on every submit; monthly reset cron at `/api/cron/reset-application-counts` (Render cron `0 0 1 * *` created); `ListingActions.tsx` shows Pro upsell banner with CTA to `/settings/billing`.

### OL-036: Marketplace filter slug alignment for existing providers
- **Status:** 🟡 OPEN — requires production action
- **What:** Provider settings service type slugs changed from underscore to hyphen format (2026-05-04). Existing providers in production DB have old `personal_care`, `home_care` etc. stored. They need to re-save their settings page to update. Also: run `npx prisma db seed` in Render shell to populate new marketplace categories.
- **Done when:** Demo provider re-saves settings, all new categories appear in marketplace filter.

### OL-032: Family subscription tier ($19/mo "CareLinkAI Plus")
- **Status:** ✅ CLOSED (prior session — exact date unknown)
- `plusStatus` + `isPlus` on Family model; `POST /api/family/billing/subscribe` (Stripe Checkout); `POST /api/family/billing/portal`; webhook syncs `plusStatus` on subscription events; billing UI at `/settings/family/billing` with feature list ($19/mo, 14-day trial); Plus nav item in sidebar with amber highlight; admin MRR tile shows `familyPlusMRR`. Requires `STRIPE_PRICE_FAMILY_PLUS` env var.

### OL-042: Operator transport bundle / subscription pricing
- **Status:** 🟡 ROADMAP — build after 2-3 operators are running 15+ rides/month
- **What:** Optional "Transport Pass" add-on to operator SaaS subscription. Facility pays $X/month for Y rides; CareLinkAI fulfills at provider rates and pockets the margin. Requires knowing real usage patterns before pricing correctly.
- **Why not now:** Need provider supply depth to guarantee fulfillment before selling bundles. Current transactional model is correct for families and early-stage operators.
- **Done when:** 2-3 operators actively using transport → price a pilot bundle → build billing UI + ride quota tracking.

### OL-043: Provider compliance-as-a-service
- **Status:** 🟡 ROADMAP — needed before payer/Medicaid contracts
- **What:** Providers upload driver credentials (background check, drug test, CPR cert, vehicle inspection, insurance). System tracks expiration dates, auto-flags approaching expiry, auto-deactivates on expiry. "CareLinkAI Certified" badge on marketplace listing.
- **Why it matters:** Contract eligibility for Medicaid brokers (MTM, Modivcare) requires proof of credentialing. Positions CareLinkAI as the gatekeeper/compliance layer.
- **Done when:** Provider can upload + track expiry on 5+ credential types; expired providers hidden from marketplace.

### OL-044: Guaranteed Ride SLA
- **Status:** 🟡 ROADMAP — positioning differentiator, needs supply depth first
- **What:** "If we miss a ride, it's free + $50 credit." Requires: fallback provider network, SLA breach detection (cron checks rides 30 min before scheduled time with no driver confirmed), automatic credit issuance.
- **Why it matters:** Nobody in NEMT confidently offers this. Becomes a no-brainer for facilities choosing between CareLinkAI and legacy brokers.
- **Done when:** Fallback network exists (3+ providers in market) + SLA breach cron + credit logic built.

### OL-045: SMS text-to-book dispatch
- **Status:** 🟡 ROADMAP — requires Twilio + NLP integration
- **What:** Staff texts "Ride for Margaret tomorrow 2pm to Cleveland Clinic dialysis" → system parses and books. No app required. Removes last barrier for non-tech staff at facilities.
- **Done when:** Twilio webhook parses inbound SMS → confirms booking → replies with confirmation text.

### OL-046: Medicaid / payer billing architecture
- **Status:** 🟡 ROADMAP — design now, build when first payer contract is in hand
- **What:** Trip verification data (actualPickupAt, actualDropoffAt, GPS) formatted for Medicaid claim submission. Prior authorization workflow. Eligibility verification before booking. EDI 837 claim format or broker API (Modivcare, MTM).
- **Why:** This is where the real scale is — $16B NEMT market runs through payer contracts, not consumer credit cards. Current schema (trip verification, ride classification, no-show cause) is designed to support this.
- **Done when:** First payer/broker contract signed → build claims pipeline.

### OL-047: Health outcomes data layer
- **Status:** 🟡 ROADMAP — long-term strategic asset
- **What:** Aggregate: missed appointment rate, ride frequency, no-show patterns. Generate report: "CareLinkAI reduced missed appointments by 18% for [Facility]." Sell this story to Medicare Advantage plans as a readmission-reduction tool.
- **Done when:** 6+ months of ride data + reporting dashboard built for facility admins.

### OL-033: Corporate elder care B2B (employee benefit)
- **Status:** 🟡 ROADMAP — requires sales conversations before build
- Pitch HR departments: $X/employee/month. One mid-size company = $5K-20K/year MRR spike.

### OL-034: Caregiver CE training / certification courses
- **Status:** 🟡 ROADMAP — partnership-dependent
- $15-30/course for CE credits. Partner with accredited CE provider.

### OL-035: Insurance/benefits navigation service
- **Status:** 🟡 ROADMAP — needs human process designed first
- Flat-fee ($99-199) for Medicaid waiver, VA Aid & Attendance, LTC insurance claims navigation.

### OL-039: Add Render cron for recurring rides
- **Status:** ✅ CLOSED (2026-05-04) — Chris registered cron in Render dashboard: `0 7 * * *` → `/api/cron/recurring-rides`. Endpoint live.

### OL-040: Transport migration 20260504000006 deploy
- **Status:** ✅ CLOSED (2026-05-04) — PR #512 squash-merged to main. Migration auto-runs via `start` script (`npm run migrate:deploy && node .next/standalone/server.js`). No manual Render shell step needed.

### OL-041: Provider reliability score dashboard
- **Status:** ✅ CLOSED (2026-05-04) — Built in full: `src/lib/rideStats.ts` (transport-only gate, weighted score 60% completion + 40% on-time), provider dashboard 4th tile + Ride Dispatch quick action, marketplace provider detail reliability section with progress bars, API route returns `rideStats`. PR #512 merged.

### OL-038: Transport migration 20260504000005 deploy
- **Status:** ✅ CLOSED (2026-05-04) — PR #512 squash-merged to main. Migration auto-runs via `start` script. `vehicleCapacity` and shared ride fields live in production.

### OL-037: Provider real-time new booking notification
- **Status:** 🟡 IN PROGRESS — building polling-based toast notification for new REQUESTED rides
- **What:** 30-second poll on `/rides` page; compares `latestRequestedRideId` from API; shows toast when new REQUESTED ride arrives. No new infra required.
- **Done when:** Provider sees a toast/notification within 30 seconds of a family booking without refreshing.

### OL-026: Transport Phase 2 — ride booking + dispatch
- **Status:** ✅ CLOSED (2026-05-04)
- Full end-to-end ride booking live: REQUESTED→CONFIRMED→PAID→IN_PROGRESS→COMPLETED→CANCELED lifecycle. Stripe Checkout payment, 12% platform commission, Stripe refund on PAID cancellation, 5 email triggers, day-of reminder cron, operator resident booking, admin MRR tile, landing page updated. Ride model with 2 migrations deployed.

### OL-023: Checkr API not yet configured
- **Status:** 🟡 OPEN — system uses mock fallback until keys are set
- **What:** Set `CHECKR_API_KEY` and `CHECKR_WEBHOOK_SECRET` in Render env vars; register webhook at `https://getcarelinkai.com/api/webhooks/checkr`
- **Done when:** Real background checks process end-to-end in production.

### OL-022: STRIPE_PRICE_AGENCY and STRIPE_PRICE_DISCHARGE_PLANNER_DEPT not set
- **Status:** ✅ FIXED (2026-04-27) — Chris confirmed both env vars already set in Render dashboard.



### OL-001: Demo accounts not seeded in production
- **Status:** ✅ FIXED (2026-04-22)
- **All 7 accounts active in production (Password: DemoUser123!):**
  - demo.family@carelinkai.test (FAMILY)
  - demo.operator@carelinkai.test (OPERATOR)
  - demo.aide@carelinkai.test (CAREGIVER)
  - demo.provider@carelinkai.test (PROVIDER)
  - demo.admin@carelinkai.test (ADMIN)
  - demo.healthcare@carelinkai.test (DISCHARGE_PLANNER)
  - demo.affiliate@carelinkai.test (AFFILIATE)

### OL-002: ANTHROPIC_API_KEY not set in Render
- **Status:** ✅ FIXED (2026-04-22) — Chris confirmed key is set in Render dashboard
- **Done:** CareBot, inquiry AI, document classification, discharge planner, match explainer all live

### OL-004: Revenue model not finalized / Stripe billing not wired
- **Status:** ✅ FULLY VERIFIED END-TO-END (2026-04-25)
- Operator checkout → trial → portal → plan switching → webhook → DB all confirmed working in test mode
- In-app plan switching built (upgrade/downgrade without Stripe portal redirect)
- Admin revenue dashboard live: MRR, placement fees, affiliate commissions, recent payments, subscription breakdown
- **Remaining before live revenue:** Switch to live Stripe account (runbook: `context/STRIPE_SETUP_RUNBOOK.md`)

### OL-007: Full end-to-end operator onboarding never verified
- **Status:** ✅ CLOSED (2026-04-23) — all 10 steps verified in production
- All steps passing in production on getcarelinkai.com

### OL-008: Stripe subscription billing not wired (operators)
- **Status:** ✅ CODE COMPLETE (2026-04-24) — merged into OL-004 above
- See OL-004 for remaining deployment steps

---

### OL-016: Aide reliability migration not yet deployed to production
- **Status:** ✅ CLOSED (2026-04-26) — Chris confirmed migration deployed to production

### OL-017: Twilio webhook URLs not registered for On-Call AI
- **Status:** ✅ CLOSED (2026-04-26) — Twilio webhooks registered in console

### OL-018: Render cron not set up for On-Call AI wave dispatch
- **Status:** ✅ CLOSED (2026-04-26) — Render cron job created

### OL-019: Demo caregiver employment not linked in production DB
- **Status:** ✅ CLOSED (2026-04-26) — Admin clicked fix in /admin/tools

### OL-020: Landing page (src/app/page.tsx) still has legacy color tokens
- **Status:** ✅ CLOSED (2026-04-26) — All raw hex Tailwind classes replaced with design tokens. TypeScript 0 errors confirmed.

---

## 🟡 Important (Quality / Stability)

### OL-005: TypeScript strict mode errors
- **Status:** ✅ CLOSED (2026-04-24) — 0 errors, `npm run type-check` passes clean

### OL-006: CI quality workflow type-check step disabled
- **Status:** ✅ CLOSED (2026-04-24) — type-check step re-enabled in `.github/workflows/quality.yml`

---

## 🟢 Low Priority / Future

### OL-013: CareBot outputs raw markdown in chat
- **Status:** ✅ CLOSED (2026-04-24) — added plain text instruction to SYSTEM_PROMPT in `src/app/api/carebot/chat/route.ts`

### OL-009: SMS (Twilio) not implemented
- **Status:** ✅ CLOSED (2026-04-24; extended 2026-05-01) — 7 triggers live via SMSService
- Operator: new inquiry, tour booked, payment failed
- Family: inquiry response received, tour reminder 24hr (Render cron daily 9am)
- Marketplace: listing owner on new application, caregiver on status change (invite/interview/offer/hire/reject)
- All calls non-blocking; gracefully no-ops if Twilio not configured

### OL-010: Invoice model missing from schema
- **Status:** ✅ CLOSED (2026-04-25) — `Invoice` model added; webhook upserts on payment_succeeded/failed; `GET /api/operator/billing/invoices` live; invoice history table in SubscriptionManager UI

### OL-011: Playwright tests configured for localhost only
- **Status:** ✅ CLOSED (2026-04-25) — `playwright.production.config.ts` + `tests/smoke.spec.ts` added; run with `npm run test:e2e:prod`

### OL-012: context/ files were not in repo
- **Status:** ✅ FIXED (2026-04-21)

### OL-014: Placement fee not auto-triggered on Convert to Resident
- **Status:** ✅ CLOSED + IMPROVED (2026-04-24) — switched from PaymentIntent (blocks if card fails) to Stripe invoice item (collected on next billing cycle); never blocks conversion
- Payment status: PENDING → PROCESSING (invoice queued) → COMPLETED (invoice paid via webhook)
- Defaults to $500 (`PLACEMENT_FEE_CENTS=50000`); configurable per Render env var

### OL-015: Landing page does not showcase all products by user type
- **Status:** ✅ CLOSED (2026-04-24) — full landing page revamp with 6-tab user-type sections, pricing cards, roadmap

---

## ✅ Closed Loops

| Loop | Description | Closed |
|------|-------------|--------|
| Operator Caregiver Reviews page | `/operator/reviews` built — hire list, star ratings, breakdown, Leave Review modal | 2026-04-26 |
| Caregiver rating dashboard tile | Avg star + review count tile + My Reviews section on `/caregiver` | 2026-04-26 |
| App status notifications missing link | Notification now includes `link: /caregiver/applications` + email sent | 2026-04-26 |
| Caregiver sidebar nav missing My Applications | Added to DashboardLayout Listings section (CAREGIVER only) | 2026-04-26 |
| Caregiver My Applications | `GET /api/caregiver/applications` + `/caregiver/applications` page built | 2026-04-26 |
| Wallet deposit gap (false alarm) | `/api/billing/wallet` + `DepositModal.tsx` already exist | 2026-04-26 |
| On-Call AI gap (false alarm) | `/api/scheduling/needs/{id}/start` and `cancel` routes already exist | 2026-04-26 |
| Email FROM domain | Was `noreply@applyedge.co` | 2026-04-21 |
| .env.example missing 12 vars | Added all required vars | 2026-04-21 |
| context/ directory missing | Created all state files | 2026-04-21 |
| /api/dev/ security | Confirmed gated behind ALLOW_DEV_ENDPOINTS | 2026-04-21 |
| OpenAI build failure | Fixed Dec 19 — dummy key pattern | 2025-12-19 |
| Migration failure (20251218) | Resolved with resolve script | 2025-12-19 |
| CareBot implementation | Built and deployed | 2025-12-30 |
| AI provider consolidation | Migrated all AI from OpenAI+AbacusAI → Anthropic Claude API | 2026-04-21 |
| OL-002: ANTHROPIC_API_KEY | Set in Render dashboard by Chris | 2026-04-22 |
| OL-001: Demo accounts | All 7 accounts seeded in production | 2026-04-22 |
| Profile picture upload (Bug 1) | Fixed CLOUDINARY_URL missing @dygtsnu8z in Render | 2026-04-22 |
| AI matching error (Bug 2) | Was missing OpenAI key — resolved with Anthropic migration | 2026-04-22 |
| Settings routing (Bug 3) | Not a bug — /settings index page works correctly | 2026-04-22 |
| OL-007: Full operator onboarding | All 10 steps verified in production | 2026-04-23 |
| AI Response Generator blank preview | Fixed response wrapper unwrapping in hook | 2026-04-23 |
| Convert to Resident button missing | Wired ConvertInquiryModal into InquiryDetailModal | 2026-04-23 |
| Resident INQUIRY status after convert | Removed spurious status overwrite in conversion service | 2026-04-23 |
| Archive button placeholder text | Wired real ArchiveButton component | 2026-04-23 |
| OL-008: Stripe subscription billing | Code complete — checkout, portal, webhooks, feature gating built | 2026-04-24 |
| OL-009: SMS / Twilio | 5 triggers wired: new inquiry, tour booked, payment failed, response received, 24h tour reminder cron | 2026-04-24 |
| Care Wallet spending | Families pay care costs from wallet; 2.5% fee; atomic deduction; payment trail | 2026-04-24 |
| Affiliate commission auto-trigger | affiliateCode on Inquiry; commission recorded on conversion; affiliate dashboard built | 2026-04-24 |
| FOUNDERS49 promo | Stripe coupon $50/mo off forever (max 50); banner in billing UI | 2026-04-24 |
| Placement fee billing switch | Switched from PaymentIntent → invoice item; collected on next billing cycle | 2026-04-24 |
| OL-005: TypeScript strict mode errors | 147 errors fixed across 73 files; `npm run type-check` passes 0 errors | 2026-04-24 |
| OL-006: CI type-check step disabled | Re-enabled in `.github/workflows/quality.yml` | 2026-04-24 |
| OL-010: Invoice model missing | Invoice model + migration + webhook upsert + billing API + UI table | 2026-04-25 |
| OL-011: Playwright localhost-only | playwright.production.config.ts + tests/smoke.spec.ts; `npm run test:e2e:prod` | 2026-04-25 |
| Caregiver hire fee not charging | triggerMarketplaceHireFee() on shift claim; MARKETPLACE_HIRE_FEE PaymentType | 2026-04-25 |
| Featured listings not built | isFeatured/featuredUntil on schema; search boost; operator toggle UI; $79/mo billing | 2026-04-25 |
| Discharge planner not monetized | DischargePlannerProfile model; Stripe checkout; billing UI; webhook handler | 2026-04-25 |
| AI Shift Auto-fill missing | Claude Haiku matches available caregivers to shift descriptions; /api/operator/shifts/autofill | 2026-04-25 |
| Caregiver reliability score missing | reliabilityScore field; computed on review + timesheet approval; 0-100 scale | 2026-04-25 |
| Aide ghosting/no-show problem | Call-off tracking + gamification points + shift bidding + On-Call AI outreach all built | 2026-04-25 |
| Waitlist management missing | WaitlistEntry model; operator + family API routes | 2026-04-25 |
| Education hub missing | 7 long-form guides at /learn and /learn/guides/[slug] | 2026-04-25 |
| Education hub at 7 articles | Expanded to 15 articles in content.ts; learn/page.tsx now imports from content.ts | 2026-04-25 |
| Family-facing chat widget | Care Concierge replaces CareBot globally; public /api/care-concierge + home search tools | 2026-04-25 |
| Family onboarding missing | /get-started 3-step wizard routes by role + need + timeline | 2026-04-25 |
| Financing CTA missing | CareCredit affiliate banners on /learn and home listing pricing tab | 2026-04-25 |
| Compliance document kits not built | ComplianceKitPurchase model; 3 Ohio kits at $149-$199; Stripe one-time checkout | 2026-04-25 |
| Build failure (content.ts premature array close) | Premature `];` at line 259 removed; all 15 guides now inside GUIDES array | 2026-04-25 |
| Map tile error (OSM Referer policy) | Switched SimpleMap.tsx to CARTO voyager tiles — no Referer restriction | 2026-04-25 |
| Admin portal gaps (affiliates/operators/discharge-planners) | Three new admin pages built with full data tables and stat cards | 2026-04-25 |
| Sidebar nav cutoff (can't scroll to Admin Tools/Help) | Sidebar refactored to flex column; nav section independently scrolls | 2026-04-25 |
| UI/UX brand token fragmentation | Unified: Inter + DM Serif Display fonts; primary-*/neutral-*/error-*/success-* tokens throughout button.tsx, card.tsx, login page; CSS vars fixed to match Tailwind config | 2026-04-25 |
| Login page using wrong brand colors | Complete redesign: gradient panel primary-600→secondary-600, DM Serif hero headline, all tokens corrected | 2026-04-25 |
| Bulk token unification across codebase | 259 files bulk-updated via sed: red→error, green→success, blue→primary, gray→neutral, yellow/orange→warning, purple→secondary. TypeScript 0 errors. 0 old tokens remain (except src/app/page.tsx deferred). | 2026-04-25 |
| Component design polish pass | StatCard left-border accent + trend prop; skeleton shimmer animation + HomeCardSkeleton; search card hover lift; tabs fixed; error/not-found redesigned; operator dashboard token fixes | 2026-04-25 |
| OL-016: Aide reliability migration | `npx prisma migrate deploy` run in Render shell — confirmed deployed | 2026-04-26 |
| OL-017: Twilio webhooks for On-Call AI | Webhooks registered in Twilio console | 2026-04-26 |
| OL-018: Render cron for On-Call AI | Cron job created in Render dashboard | 2026-04-26 |
| OL-019: Demo caregiver employment | Admin clicked fix in /admin/tools | 2026-04-26 |
| OL-020: Landing page legacy tokens | All raw hex Tailwind classes in page.tsx replaced with design tokens | 2026-04-26 |
| Direction B design system applied | Dark sidebar (neutral-950), border-t-4 stat cards, shimmer skeletons, design preview page | 2026-04-26 |
| OL-022: Stripe price env vars | STRIPE_PRICE_AGENCY + STRIPE_PRICE_DISCHARGE_PLANNER_DEPT confirmed set in Render | 2026-04-27 |
| Landing page benefits/FAQ overhaul | Operators/Caregivers/Healthcare/Affiliates tabs updated; On-Call AI, Direct Hire, Points, tiered commissions, licensing tiers added; FAQ 5/6 updated, 2 new FAQs added | 2026-04-27 |
| Playwright demo verification suite | 13 tests across 3 roles; DISCHARGE_PLANNER added to TEST_USERS; replaces manual post-deploy checklist | 2026-04-27 |
| Marketplace Create Listing form | /marketplace/listings/new with full form + pill toggles for care types/services/specialties | 2026-04-26 |
| Hire fee confirmation UI | HIRE action in ApplicationActions shows $250 fee modal before submitting; API queues Stripe invoice item | 2026-04-26 |
| Message Caregiver on application page | "Message Caregiver" button links to /messages?with={userId} on application detail page | 2026-04-26 |
| Revenue model expansion (5 streams) | On-Call/Autofill gates, DP dept license, family referral track, tiered commissions, AGENCY plan | 2026-04-27 |
| Operator direct hire from caregiver profile | DirectHireButton + /api/operator/caregivers/[id]/hire; plan-aware modal; replaces family-only CTA for operators | 2026-04-27 |
| Caregiver dashboard showing wrong page | /dashboard now redirects CAREGIVER → /caregiver, DISCHARGE_PLANNER → /discharge-planner | 2026-04-27 |
| Discharge planner double nav | Removed erroneous layout.tsx; billing page now has its own DashboardLayout wrapper | 2026-04-27 |
| Demo operator on Starter plan | seed-demo.ts forces PROFESSIONAL plan on upsert + explicit update; re-seeded on Render | 2026-04-27 |
| OL-021: Prisma migrations | All migrations deployed — confirmed "No pending migrations" in Render shell 2026-05-02 | 2026-05-02 |
| OL-024: BackgroundCheckOrderPanel Stripe Elements | Real Stripe Elements wired — Elements/PaymentForm inline; POST→clientSecret→confirmPayment→PUT confirm | 2026-05-02 |
| OL-025: HomeCompareModal wired | compareIds state + toggleCompare + compare bar + modal render in search/page.tsx | 2026-05-02 |
| ProviderReview migration | migration.sql created and auto-deployed on build | 2026-05-02 |
| Residents page server-to-self HTTP fetch | Replaced with direct Prisma via requirePermission + getUserScope | 2026-05-02 |
| /help double nav | Removed duplicate DashboardLayout wrapper from help/page.tsx | 2026-05-02 |
| Landing page auth wall | Added alwaysPublic paths in middleware authorized callback | 2026-05-02 |
| PDFKit Helvetica.afm ENOENT in standalone | Added serverExternalPackages: ['pdfkit'] to next.config.js | 2026-05-02 |
| ReportGenerator homes 404 | Changed /api/homes to /api/operator/homes in fetchHomes() | 2026-05-02 |
| Provider dashboard routing | /dashboard switch missing PROVIDER case — fell through to family UI; fixed | 2026-05-03 |
| Billing nav missing for PROVIDER + CAREGIVER | Added "Listing & Billing" + "Pro Membership" nav entries to DashboardLayout | 2026-05-03 |
| Provider dashboard design | Full rewrite with stat tiles, smart banners, quick actions, inquiries table | 2026-05-03 |
| Landing page freemium inaccuracy | Updated 5 "always free" references to reflect free-to-join + Pro $19/mo optional model | 2026-05-03 |
| Admin MRR visibility | Admin dashboard now shows 5-tile MRR breakdown across all 4 revenue streams | 2026-05-03 |
| OL-031: Application cap enforcement | Full enforcement built: block at 10, increment on submit, reset cron, upsell banner | 2026-05-03 |
| OL-038: Transport migration 20260504000005 | Auto-deployed via PR #512 merge → Render start script | 2026-05-04 |
| OL-039: Recurring rides cron | Chris registered Render cron `0 7 * * *` → `/api/cron/recurring-rides` | 2026-05-04 |
| OL-040: Transport migration 20260504000006 | Auto-deployed via PR #512 merge → Render start script | 2026-05-04 |
| OL-041: Provider reliability score | `rideStats.ts` + dashboard tile + marketplace section + API; transport-only gate | 2026-05-04 |
