# CareLinkAI — Technical State
_Last updated: 2026-04-24_

## Active Branch
`main` (all features merged — Stripe billing fully verified end-to-end in test mode)

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
67 Prisma models + enums. New since 2026-04-25: CallOff, CaregiverPoints, PointTransaction, ShiftBid, ShiftNeed, CoverageAttempt. New enums: CallOffType, PointsTier, PointsEventType, BidStatus, ShiftNeedStatus, CoverageChannel, CoverageOutcome. New caregiver fields: homeLat/homeLng, reliabilityScore (now includes call-off weight). PaymentType enum: + MARKETPLACE_HIRE_FEE, FEATURED_LISTING_FEE, COMPLIANCE_KIT.

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
- **Operator onboarding wizard:** 3-step guided flow (company → first home → plan selection); new operators auto-redirected on first login
- **Caregiver marketplace hire fee:** $250 Stripe invoice item queued on shift claim; MARKETPLACE_HIRE_FEE PaymentType
- **Featured listings:** isFeatured/featuredUntil on homes; $79/mo billed as invoice item; search results sorted featured-first; operator toggle in home edit page
- **Discharge planner subscription:** DischargePlannerProfile model; $99/seat/mo Stripe checkout at /discharge-planner/billing; webhook handler synced
- **AI Shift Auto-fill:** POST /api/operator/shifts/autofill — Claude Haiku matches available caregivers to free-text shift description; ShiftAutoFill component
- **On-Call AI (active outreach):** Wave-based SMS/voice dispatch; ShiftNeed model; CoverageAttempt tracking; haversine distance ranking; Twilio SMS + IVR webhooks; Render cron `/api/cron/oncall-waves`; operator On-Call AI page at /operator/oncall
- **Caregiver reliability score:** 0-100 computed from reviews (30%) + shifts (25%) + BG check (20%) + call-offs (25%); updates on review create, timesheet approval, and call-off record
- **Aide gamification (points/tiers):** BRONZE/SILVER/GOLD/PLATINUM tiers; points auto-awarded on timesheet approval and reviews; penalized on call-off; PointsDashboard at /caregiver/points
- **Shift bidding:** Caregivers bid on open shifts; operators accept/decline; on accept: shift assigned + MarketplaceHire + hire fee triggered atomically
- **Waitlist management:** WaitlistEntry model; /api/operator/homes/[id]/waitlist + /api/family/waitlist
- **Education hub:** 15 long-form guides at /learn and /learn/guides/[slug] (SEO-optimized, no CMS needed; content.ts is single source of truth)
- **Care Concierge widget:** Replaces CareBot globally; family-facing AI chat (Claude Haiku) with home search + care term lookup tools; `/api/care-concierge` public endpoint
- **Family onboarding wizard:** /get-started 3-step wizard (role → need → timeline) routes families to the right destination
- **Financing CTAs:** CareCredit affiliate links on /learn and home listing pricing tab
- **Compliance document kits:** 3 Ohio ALF kits ($149-$199); one-time Stripe checkout; ComplianceKitPurchase model; /operator/compliance-kits

## Known Issues (as of 2026-04-25)
1. 2 pre-existing test failures RESOLVED — calendar and emergency tests both fixed
2. Demo accounts use test Stripe data — when switching to live Stripe, all operator `stripeCustomerId` fields must be cleared and operators re-subscribed
4. seed-demo.ts `update:{}` bug fixed for all 7 top-level user accounts; nested operator/caregiver/etc upserts still use `update:{}`

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
- [ ] `PLACEMENT_FEE_CENTS` = `50000` (default $500)
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

## Immediate Next Priorities
1. **Merge feature branch to main** — triggers Render auto-deploy for all family-facing features
2. **Verify on production:** /get-started wizard, /learn (15 articles), Care Concierge chat widget
3. **Text to Place (roadmap):** Twilio integration already exists; family texts to inquire about a home
4. **CareCredit affiliate account** — sign up at carecredit.com/partners to get a tracked affiliate link and earn commission on referrals
