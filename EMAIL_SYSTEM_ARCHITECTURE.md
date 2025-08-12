# CareLinkAI • Email System Architecture  
_Last updated: July 2025_

## 1 — High-Level Flow

Client → React Hook **`useEmail()`** → **/api/email/send** (Next.js API Route) → **SendGrid Service** (`sendgrid.ts`) → SendGrid API → Recipient Inbox.

```
┌──────────────┐    fetch()    ┌────────────────────────┐
│ React UI     │ ───────────▶ │  API Route (AppRouter) │
│ (Admin page) │              │   /api/email/send       │
└──────────────┘               └─────────┬──────────────┘
                                         ▼
                                ┌─────────────────┐
                                │ sendgrid.ts     │
                                │  (service)      │
                                └─────────┬───────┘
                                          ▼
                                    SendGrid API
```

## 2 — File Organisation

```
src/
├─ app/
│  ├─ admin/
│  │   └─ tools/page.tsx       ← Email demo lives here (admin-only UI)
│  └─ api/email/send/route.ts  ← REST endpoint, auth & validation
├─ components/
│  └─ email/EmailDemo.tsx      ← Self-contained demo component
├─ hooks/useEmail.ts           ← Client-side helper
└─ lib/
   ├─ email/sendgrid.ts        ← Low-level SendGrid wrapper
   └─ logger.ts                ← Shared logger
```

## 3 — Access Control

1. **API Route**  
   • Requires authenticated `session`  
   • Bulk send restricted to `ADMIN` or `STAFF` roles  
   • Zod validation guards payload shape.

2. **Admin Tools Page** (`/admin/tools`)  
   • Route-level check: only `ADMIN` / `STAFF` may view  
   • Hidden navigation item unless user role passes filter.

3. **Navigation Visibility**  
   • `DashboardLayout` filters `navItems` by optional `roleRestriction`.  
   • “Admin Tools” shows in sidebar for privileged roles; never appears in mobile tab bar for general users.

## 4 — Runtime Behaviour

• **Templates removed** – Service now generates branded HTML + plain-text fallback, so no SendGrid template IDs are required.  
• **Error surfacing** – Helper `extractErrorMessage()` propagates SendGrid responses to UI; toasts display human-readable failures.  
• **Categories & analytics** – Each send sets `categories` for downstream analytics.  
• **Rate-limit scaffold** – Constants in API route ready for Redis throttling.

## 5 — Deployment Tips

1. Set `SENDGRID_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO` in `.env.local`.  
2. Domain-authenticate in SendGrid for best deliverability.  
3. Add real dynamic templates → re-insert `templateId` in `sendgrid.ts` when ready.

---

© 2025 CareLinkAI
