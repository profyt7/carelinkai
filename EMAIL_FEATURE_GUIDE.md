# CareLinkAI Email Feature Guide

**File:** `carelinkai/EMAIL_FEATURE_GUIDE.md`  
**Last updated:** July 2025  

---

## 1. Overview

CareLinkAI now ships with a fully-functional, type-safe email notification system powered by **SendGrid**.

Highlights  
• Server-side utility for sending templated or custom emails  
• REST API route (`POST /api/email/send`) with validation & auth  
• React hook (`useEmail`) for effortless client-side access  
• Demo UI (`<EmailDemo />`) embedded in the dashboard  
• Extensible template registry for future campaigns  

---

## 2. Features & Capabilities

| Capability | Details |
|------------|---------|
| **Templated Emails** | Welcome, password-reset, notification, appointment confirmation, document-shared |
| **Custom HTML** | Send arbitrary HTML (plaintext fallback auto-generated) |
| **Bulk Send** | Up to 100 emails in one request (admins/staff only) |
| **Type-safe API** | `zod` schemas validate every payload |
| **Rate-limit scaffolding** | Constants ready for throttling (tune as needed) |
| **Category tags** | All sends include SendGrid categories for analytics |
| **Attachment Support** | Attach or inline files via `attachments[]` |
| **Global Toasts** | Success / error notifications via `react-hot-toast` |
| **Logging** | Unified `logger` utility outputs to Node and browser consoles |

---

## 3. SendGrid Setup

1. **Create an API key**  
   • Dashboard → Settings → API Keys → “Create API Key” (Full Access or Mail Send)  
   • Copy the key (starts with `SG.`)

2. **Add environment variables** in `.env.local` or hosting dashboard:
   ```
   SENDGRID_API_KEY=SG.***************************
   EMAIL_FROM=noreply@carelinkai.com
   EMAIL_FROM_NAME=CareLinkAI
   EMAIL_REPLY_TO=support@carelinkai.com
   ```

3. **Dynamic Templates (recommended)**  
   • Marketing → Templates → Transactional → New Template  
   • Create versions, note the **Template ID** (begins `d-...`)  
   • Replace placeholders in `src/lib/email/sendgrid.ts`’s `EmailTemplates` map.

4. **Restart** the dev server / redeploy so Next.js picks up the new vars.

---

## 4. How to Use the Email System

### 4.1 Server-to-server (REST)

```bash
curl -X POST http://localhost:5000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT/session cookie>" \
  -d '{
    "type": "welcome",
    "to": "jane@example.com",
    "subject": "Welcome!",
    "templateData": {
      "firstName": "Jane",
      "verificationUrl": "https://app.carelinkai.com/verify?token=abc"
    }
}'
```

### 4.2 From React components

```tsx
import { useEmail } from "@/hooks/useEmail";
const { sendWelcomeEmail } = useEmail();

await sendWelcomeEmail(
  "jane@example.com",
  "Jane",
  { verificationUrl: "https://..." }
);
```

### 4.3 Bulk send

```jsonc
POST /api/email/send
{
  "emails": [
    { "type": "notification", "to": "user1@example.com", ... },
    { "type": "notification", "to": "user2@example.com", ... }
  ]
}
```

*Only `admin` or `staff` roles are permitted.*

---

## 5. Code Structure & Architecture

```
src/
 └─ lib/
     ├─ email/
     │   └─ sendgrid.ts        # Core service (API wrapper, helpers)
     ├─ logger.ts              # Universal logger
 └─ hooks/
     └─ useEmail.ts            # React Hook (client)
 └─ app/
     └─ api/
         └─ email/
             └─ send/
                 └─ route.ts   # REST endpoint (App Router)
 └─ components/
     └─ email/
         └─ EmailDemo.tsx      # Dashboard demo UI
```

Interaction flow:

1. **Client** calls `useEmail()` → fetch `/api/email/send`  
2. **API route** validates payload (`zod`), checks session → delegates to service  
3. **sendgrid.ts** builds message → `@sendgrid/mail.send()`  
4. **SendGrid** delivers email → stats visible in their dashboard.  

---

## 6. Testing Instructions

1. Add a **verified recipient** in SendGrid (if sandboxed account).  
2. Sign in to CareLinkAI (any role) and open **Dashboard ▸ Email Notification Demo**.  
3. Use each tab to submit a test email; watch toast feedback.  
4. Confirm receipt in your inbox _and_ in SendGrid Activity.  
5. For server tests, run:

```bash
npm run test:emails   # hypothetical Jest tests
```

(Future work: implement automated unit tests around `sendgrid.ts` with mocked client.)

---

## 7. Next Steps & Enhancements

• **Complete template IDs** once designs are final  
• **Scheduler / CRON** for digest emails & reminders  
• **Webhook listener** (`/api/email/events`) to record bounces & opens  
• **Rate limiting middleware** (Redis) to enforce quotas  
• **Multilingual templates** (i18n)  
• **In-app notification bridge** – mirror important mails to UI alerts  
• **Audit logs** – store each send in DB for compliance  

---

## 8. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `Missing required email configuration variables` | ENV not set | Add `SENDGRID_API_KEY` & restart |
| 401 “Authentication required” | No session/JWT sent | Sign-in first or include auth cookie |
| 403 “Insufficient permissions for bulk email” | Non-admin tries bulk | Restrict to admin/staff |
| 400 validation errors | Payload shape wrong | Follow schema in section 4 |
| Email “processed” but not delivered | SendGrid suppression/bounce | Check Activity → Suppressions |
| HTML shows raw handlebars braces (`{{var}}`) | Wrong template version | Use dynamic template type |
| `SELF_SIGNED_CERT_IN_CHAIN` (local) | Node 19+ strict TLS | `NODE_TLS_REJECT_UNAUTHORIZED=0` (dev only) |

---

Happy emailing!  
_Questions? Ping `#dev-notifications` on Slack._  
