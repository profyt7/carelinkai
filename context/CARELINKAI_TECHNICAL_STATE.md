# CareLinkAI Technical State
**Last Updated:** 2026-04-21
*Update after every dev session or deployment. Claude Code updates this automatically at end of each session.*

---

## Current Status
- **Repo:** https://github.com/profyt7/carelinkai (private)
- **Primary branch:** main (auto-deploys to Render)
- **Live URL:** https://carelinkai.onrender.com
- **Current hosting:** Render.com (Docker, PostgreSQL)
- **Staging hosting:** None yet
- **Last known stable build:** Feb 3, 2026 (Cleveland Launch ZIP)
- **Last reviewed:** 2026-04-21

---

## Architecture Overview
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (91.7%), JavaScript (6.7%) |
| ORM | Prisma |
| Database | PostgreSQL (hosted on Render) |
| Auth | NextAuth.js |
| Images | Cloudinary |
| Email | Resend |
| Error monitoring | Sentry |
| Styling | Tailwind CSS |
| Real-time | SSE (Server-Sent Events) |
| Payments | Stripe (configured, not yet live) |
| Hosting | Render.com (Docker, auto-deploy from main) |

---

## App Route Structure (src/app/)
| Route | What it is |
|-------|-----------|
| / | Homepage / landing page |
| /search | Facility search with filters |
| /homes/[id] | Individual facility listing |
| /homes/match | AI match engine |
| /operator/* | Full operator dashboard |
| /operator/homes | Manage facility listings |
| /operator/leads | Lead pipeline |
| /operator/inquiries | Inquiry management + pipeline |
| /operator/analytics | Occupancy + performance analytics |
| /operator/caregivers | Caregiver management |
| /operator/residents | Resident management |
| /operator/tours | Tour scheduling |
| /operator/shifts | Shift calendar |
| /operator/compliance | Licensing/compliance tracking |
| /operator/billing | Subscription billing |
| /operator/documents | Document management |
| /family/* | Family portal |
| /family/residents | Resident profiles |
| /family/notifications | Alerts & updates |
| /family/emergency | Emergency contacts |
| /marketplace/* | Caregiver marketplace |
| /marketplace/caregivers/[id] | Caregiver profile |
| /marketplace/caregivers/favorites | Saved caregivers |
| /provider/* | Provider directory dashboard |
| /caregiver/* | Caregiver profile page |
| /demo | Demo page |
| /admin | Admin panel |
| /cleveland | Cleveland landing page (not yet built - Week 2 priority) |

---

## Environment and Deployment
- **Build command:** ./render-build.sh
- **Start command:** Standard Next.js (next start)
- **Migration command:** prisma migrate deploy
- **Production deployment:** Push to main -> Render auto-deploys
- **Preview/staging flow:** Not yet established

### Required Environment Variables
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
RESEND_API_KEY
SENTRY_DSN

---

## Key Infrastructure Files
- src/middleware.ts - Auth + route protection
- src/instrumentation.ts - Sentry setup
- prisma/schema.prisma - Full database schema
- render-build.sh - Build script for Render

---

## Pricing (configured in app)
| Plan | Price | Features |
|------|-------|---------|
| Basic | $49/mo | 1 listing, basic analytics |
| Professional | $99/mo | 3 listings, full analytics, leads |
| Enterprise | $299/mo | Unlimited, API access, white-label |

---

## Known Technical Issues
- Sentry configured but not verified active in production
- Stripe configured but not live - no payment flow tested end-to-end yet
- No Cleveland-specific landing page (/cleveland) - needed for SEO Week 1

---

## Recent Technical Decisions
- 2026-02-03: Stay on Render (Docker-based handles backend + SSE + cron). Vercel deferred.
- 2026-02-xx: Production deployment complete with SSH, WhatsApp integration, Tailscale.

---

## Issue History
- Dec 4, 2025: Build failures on Render (TypeScript errors) - fixed via build-fix.patch
- Dec 8, 2025: Double-navigation regression on 23 pages - fixed
- Jan 2026: Cloudinary API, Prisma migration, middleware, email verification issues - resolved
- Feb 2026: Production deployment complete with SSH, WhatsApp integration, Tailscale

---

## Current Priorities
1. Verify Sentry is actively capturing errors in production
2. Set up Google Analytics (GA4) on carelinkai.com
3. Connect Google Search Console + verify site
4. Add structured data / schema markup to facility listings
5. Create Cleveland-specific landing page (/cleveland)
6. 4 care-type landing pages (/cleveland/assisted-living, etc.)
7. 4 neighborhood pages (Shaker Heights, Beachwood, Westlake, Parma)
8. Blog post system + first 4 Cleveland guides
9. Calendly integration for demo bookings
10. Email sequences in Mailchimp

---

## Recommended Next Step
Verify Sentry is live, then build the /cleveland landing page as the first SEO asset.
