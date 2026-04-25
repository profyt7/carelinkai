# CareLinkAI — Tech Open Loops
_Last updated: 2026-04-25_

## Format
Each loop: what it is, why it matters, what done looks like.

---

## 🔴 Critical (Blocking Revenue / Demos)

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
- **Status:** 🔴 OPEN
- **What:** Migration `20260425200000_aide_reliability` creates CallOff, CaregiverPoints, PointTransaction, ShiftBid, ShiftNeed, CoverageAttempt tables + enums
- **Done when:** `npx prisma migrate deploy` runs clean in Render shell

### OL-017: Twilio webhook URLs not registered for On-Call AI
- **Status:** 🟡 OPEN
- **What:** On-Call AI dispatcher sends SMS/voice via Twilio but incoming replies go nowhere until webhooks are set
- **Done when:** Twilio console → Phone Number → set Messaging webhook to `https://getcarelinkai.com/api/webhooks/twilio/sms` and Voice webhook to `https://getcarelinkai.com/api/webhooks/twilio/voice`

### OL-018: Render cron not set up for On-Call AI wave dispatch
- **Status:** 🟡 OPEN
- **What:** Wave cooldowns are checked by `/api/cron/oncall-waves` but nothing calls it
- **Done when:** Render cron job created: POST `https://getcarelinkai.com/api/cron/oncall-waves` every 10 min with `x-cron-secret` header

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
- **Status:** ✅ CLOSED (2026-04-24) — 5 triggers live via SMSService
- Operator: new inquiry, tour booked, payment failed
- Family: inquiry response received, tour reminder 24hr (Render cron daily 9am)
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
