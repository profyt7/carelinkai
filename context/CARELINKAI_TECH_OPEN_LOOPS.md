# CareLinkAI Technical Open Loops
**Last Updated:** 2026-04-21
*Claude Code updates this at the end of each dev session.*

---

## Critical (blocking launch or revenue)
- [ ] Verify Sentry is actively capturing production errors
- [ ] Confirm Stripe is correctly wired - no payment flow tested end-to-end
- [ ] No staging environment - all changes go straight to production

---

## Important (Week 1-4 launch requirements)
- [ ] Set up Google Analytics (GA4) on carelinkai.com
- [ ] Connect Google Search Console + verify site ownership
- [ ] Add structured data / JSON-LD schema markup to facility listing pages
- [ ] Build /cleveland landing page (SEO cornerstone)
- [ ] Build 4 care-type landing pages (/cleveland/assisted-living, /cleveland/memory-care, /cleveland/independent-living, /cleveland/nursing-homes)
- [ ] Build 4 neighborhood pages (Shaker Heights, Beachwood, Westlake, Parma)
- [ ] Blog post system - CMS or markdown-based
- [ ] Calendly embed integration for demo booking flow

---

## Nice to Have (Weeks 5-8)
- [ ] Google My Business integration or structured data for local SEO
- [ ] XML sitemap auto-generation
- [ ] OpenGraph / social sharing meta tags on all pages
- [ ] Demo video embed on homepage and /demo page
- [ ] Email capture / waitlist form on landing pages

---

## Waiting on Human Input
- [ ] Render vs Vercel decision - stay on Render for now but needs explicit confirmation
- [ ] Stripe go-live - Chris needs to complete Stripe account activation before payment flow can be tested
- [ ] Blog content strategy - AI-generated vs manually written; workflow not decided

---

## Waiting on Credentials / Access
- [ ] GA4 Measurement ID - needed to add tracking script to site
- [ ] Google Search Console verification - needs DNS TXT record or HTML file
- [ ] Calendly account + embed code - needs Calendly set up first
- [ ] Mailchimp API key - for email capture integration

---

## Closed Loops
- [x] Dec 4, 2025: Build failures on Render (TypeScript errors) - fixed
- [x] Dec 8, 2025: Double-navigation regression (23 pages) - fixed
- [x] Jan 2026: Cloudinary API, Prisma migration, middleware, email verification issues - resolved
- [x] Feb 2026: Production deployment with SSH, WhatsApp, Tailscale - complete
