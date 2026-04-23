# CareLinkAI — Technical State
_Last updated: 2026-04-23_

## Active Branch
`main` (all session fixes merged and deployed)

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
| Payments | Stripe (configured, not yet live with real keys confirmed) |
| AI — All features | Anthropic Claude API (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) |

## Schema Summary
56 Prisma models covering: users/auth, families, operators, caregivers, residents, homes, inquiries/leads, marketplace, payments/wallet, documents, messaging, notifications, shifts/timesheets, tours, reports, audit logs, discharge planner, AI matching.

## User Roles
FAMILY, OPERATOR, CAREGIVER, ADMIN, STAFF, PROVIDER, AFFILIATE, DISCHARGE_PLANNER

## What Is Built and Working
- Authentication: NextAuth credentials, 2FA, RBAC, JWT sessions
- Operator portal: homes, caregivers, residents, shifts, tours, inquiry pipeline
- Family portal: search, inquiries, residents, documents, messaging, favorites
- Admin portal: user management, audit logs, impersonation, exports, broadcasts
- Marketplace: listings, applications, hires, favorites
- Discharge Planner: AI placement search, placement requests
- CareBot: floating AI chat widget (AbacusAI)
- Inquiry AI: GPT-4 response generation + email delivery
- Stripe: PaymentIntents, webhooks, wallet, Stripe Connect (operators/caregivers)
- Resend: verification + password reset emails
- Cloudinary: image uploads
- Sentry: error monitoring + session replay
- Analytics: GA4, GTM, FB Pixel, Clarity
- Anthropic Claude API: CareBot (Haiku 4.5 + prompt caching), inquiry responses, document classification, discharge planner search, match explanations, tour scheduling, home profile generation (all Sonnet 4.6)

## Known Issues (as of 2026-04-23)
1. ~~Email FROM address was `noreply@applyedge.co`~~ — **FIXED** (now `noreply@getcarelinkai.com`)
2. ~~Demo accounts not seeded~~ — **FIXED** — All 7 accounts active in production (see OL-001)
3. ~~OPENAI_API_KEY needed~~ — **MIGRATED TO ANTHROPIC** — `ANTHROPIC_API_KEY` set in Render (OL-002 ✅)
4. ~~ABACUSAI_API_KEY needed for CareBot~~ — **MIGRATED TO ANTHROPIC Claude Haiku 4.5**
5. 274 TypeScript strict mode errors — CI type-check step is disabled (non-blocking at runtime)
6. ~~`.env.example` was missing 12 required vars~~ — **FIXED**
7. ~~`context/` directory was missing from repo~~ — **FIXED**
8. 2 pre-existing test failures: `calendar.appointments.api` and `emergency.api` — unrelated to AI migration
9. ~~Cloudinary 403 on profile picture upload~~ — **FIXED** — `CLOUDINARY_URL` was missing `@dygtsnu8z` suffix in Render; corrected by Chris
10. ~~AI matching returning 500~~ — **FIXED** — was missing ANTHROPIC key (OL-002). Now returns 200 with empty array when no matching homes exist
11. ~~AI Response Generator blank preview box~~ — **FIXED** (2026-04-23) — hook was returning response wrapper instead of inner object
12. ~~Convert to Resident button missing from pipeline~~ — **FIXED** (2026-04-23) — wired ConvertInquiryModal into InquiryDetailModal
13. ~~Resident status set to INQUIRY after conversion~~ — **FIXED** (2026-04-23) — removed spurious status overwrite; now stays PENDING
14. CareBot outputs raw markdown (`**bold**`) in chat — same root cause as AI response generator; not yet fixed
15. "Archive button" placeholder text in resident profile — **FIXED** (2026-04-23) — wired real ArchiveButton component

## Environment Variables — Render Dashboard Checklist
These MUST be set on Render for production to work:
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL` = `https://getcarelinkai.com`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM` = `noreply@getcarelinkai.com`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `SENTRY_DSN`
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `ALLOW_DEV_ENDPOINTS` = NOT SET (must not exist in production)

## Deployment Notes
- Render auto-deploys on push to `main`
- Migration issues have occurred previously — after any schema change, verify `npx prisma migrate status` in Render shell
- Build warnings (missing STRIPE_KEY, OPENAI_KEY) are expected during build — they use dummy keys at build time and validate at runtime

## Revenue Model (WIP)
See `REVENUE_MODEL.md` for the full breakdown. Key streams being considered:
1. Operator SaaS subscription (monthly per-home fee)
2. Family placement fee (one-time on conversion)
3. Caregiver marketplace placement fee (per-hire)
4. Discharge Planner SaaS (per-seat hospital/facility subscription)

## Playwright E2E Test Suite
- Config: `playwright.config.ts` — auto-starts dev server, 1 worker, retries on failure
- Auth helpers: `tests/helpers/auth.ts` — login with 3-attempt retry, cookie consent pre-set
- Bug verification: `tests/bug-verification.spec.ts` — covers Bugs 1-3 (profile pic, AI match, settings)
- Operator onboarding: `tests/operator-onboarding.spec.ts` — 10 steps covering full operator journey
- Run: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright test --workers=1`
- **Local limitation:** Prisma binary engine in sandbox dies after ~7 tests due to thread limits. Steps 6-8 of operator-onboarding require fresh server or production testing. This is NOT a production issue.
- **Production ANTHROPIC_API_KEY required** for Step 6 (AI response generation) and all AI features

## Immediate Next Priorities
1. ~~Seed demo accounts in production Render shell~~ — **DONE** (OL-001 ✅)
2. ~~Set ANTHROPIC_API_KEY in Render~~ — **DONE** (OL-002 ✅)
3. ~~Verify full operator onboarding end-to-end~~ — **DONE** (OL-007 ✅) — all 10 steps verified in production
4. Wire Stripe subscription billing for operators (OL-008) — **next priority**
5. Fix CareBot markdown output in chat widget
6. Fix TypeScript strict mode errors (274 remaining) (OL-005)
