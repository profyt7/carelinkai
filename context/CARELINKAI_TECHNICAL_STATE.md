# CareLinkAI — Technical State
_Last updated: 2026-04-21_

## Active Branch
`claude/review-carelink-docs-49Ycv` (feature/fix branch — merge to main when ready)

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

## Known Issues (as of 2026-04-21)
1. ~~Email FROM address was `noreply@applyedge.co`~~ — **FIXED** (now `noreply@getcarelinkai.com`)
2. Demo accounts not seeded in production — run `npm run seed:demo` in Render shell
3. ~~OPENAI_API_KEY needed~~ — **MIGRATED TO ANTHROPIC** — set `ANTHROPIC_API_KEY` in Render
4. ~~ABACUSAI_API_KEY needed for CareBot~~ — **MIGRATED TO ANTHROPIC Claude Haiku 4.5**
5. 274 TypeScript strict mode errors — CI type-check step is disabled (non-blocking at runtime)
6. `.env.example` was missing 12 required vars — **FIXED**
7. `context/` directory was missing from repo — **FIXED**
8. 2 pre-existing test failures: `calendar.appointments.api` and `emergency.api` — unrelated to AI migration

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

## Immediate Next Priorities
1. Seed demo accounts in production Render shell
2. Verify all env vars are set in Render dashboard (especially OPENAI_API_KEY)
3. Walk the full operator onboarding loop end-to-end as a real user
4. Fix TypeScript strict mode errors (274 remaining)
5. Build out and validate revenue model
