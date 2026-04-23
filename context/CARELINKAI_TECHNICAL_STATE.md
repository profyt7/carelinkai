# CareLinkAI — Technical State
_Last updated: 2026-04-24_

## Active Branch
`claude/review-carelink-docs-49Ycv` (Stripe subscription billing — ready to merge to main)

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
56 Prisma models + 2 new enums (SubscriptionPlan, SubscriptionStatus). Covers: users/auth, families, operators, caregivers, residents, homes, inquiries/leads, marketplace, payments/wallet, documents, messaging, notifications, shifts/timesheets, tours, reports, audit logs, discharge planner, AI matching. Operator model now has subscription billing fields.

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
- Stripe: PaymentIntents, webhooks, wallet, Stripe Connect, SaaS subscriptions
- **Placement fee (Revenue Stream 2):** Auto-charges operator $500 on inquiry → resident conversion; non-blocking, PENDING/COMPLETED/FAILED payment trail
- Resend: verification + password reset emails
- Cloudinary: image uploads
- Sentry: error monitoring + session replay
- Analytics: GA4, GTM, FB Pixel, Clarity
- Anthropic Claude API: CareBot, inquiry responses, document classification, discharge planner search, match explanations, tour scheduling, home profile generation
- Operator subscription billing: Checkout (14-day trial), Customer Portal, webhook lifecycle handlers, feature gating utility

## Known Issues (as of 2026-04-24)
1. 274 TypeScript strict mode errors — CI type-check step is disabled (non-blocking at runtime)
2. 2 pre-existing test failures: `calendar.appointments.api` and `emergency.api`
3. CareBot outputs raw markdown (`**bold**`) in chat widget (OL-013) — needs plain text prompt fix, same as inquiry response generator fix applied 2026-04-23
4. Stripe Products/Prices not yet created in Stripe dashboard — subscription checkout will fail until `STRIPE_PRICE_*` env vars are set

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
- [ ] `STRIPE_PRICE_STARTER` ← **NEW — required for subscription checkout**
- [ ] `STRIPE_PRICE_PROFESSIONAL` ← **NEW — required for subscription checkout**
- [ ] `STRIPE_PRICE_GROWTH` ← **NEW — required for subscription checkout**
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
1. **Merge branch + apply migration + create Stripe Products** — activate subscription checkout (see Pending Deployment Actions above)
2. Fix CareBot markdown output in chat (OL-013) — plain text prompt, same fix applied to inquiry response generator
3. Revamp landing page to showcase all products/features by user type with "coming soon" sections
4. Fix TypeScript strict mode errors (274 remaining) (OL-005)
5. Wire placement fee auto-trigger on Convert to Resident (Revenue Stream 2)
