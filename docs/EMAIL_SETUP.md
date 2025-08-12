# Email Service Setup Guide

This document explains how to configure **CareLinkAI’s** production–ready email layer (`src/lib/email-service.ts`).  
The service supports three delivery methods out-of-the-box:

| Provider | Typical Use-case | Notes |
|----------|-----------------|-------|
| **SendGrid API** | Recommended for production | Fast, reliable, free tier, easy DKIM |
| **Gmail SMTP**   | Lightweight deployments, staging | Requires Google **App Password** |
| **Custom SMTP**  | Any other ESP or on-prem server | Works with Office 365, Postfix, etc. |
| **Ethereal**     | Automatic fallback for dev | Generates fake inbox & preview URLs |

---

## 1. Prerequisites

1. **Verify outgoing port access** (587 / 465 or HTTPS for SendGrid).  
2. Add SPF + DKIM records for your domain to prevent spam filtering.  
3. Copy `.env.example` ➜ `.env` and fill the variables described below.

---

## 2. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EMAIL_FROM` | Default sender address | `noreply@carelinkai.com` |
| `EMAIL_FROM_NAME` | Sender display name | `CareLinkAI` |

### SendGrid

| Variable | Value |
|----------|-------|
| `SENDGRID_API_KEY` | **Required** – create in SendGrid dashboard |

### Gmail / Google Workspace SMTP

| Variable | Value |
|----------|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your gmail address |
| `SMTP_PASSWORD` | **App Password** (not normal password) |
| `SMTP_SECURE` | `false` |

> ⚠️ Google blocks less-secure SMTP. Create a **16-character App Password** from `myaccount.google.com/security`.

### Custom SMTP / Office 365

| Variable | Notes |
|----------|-------|
| `SMTP_HOST` – e.g. `smtp.office365.com` |
| `SMTP_PORT` – `587` (STARTTLS) **or** `465` (SSL) |
| `SMTP_USER` – full mailbox login |
| `SMTP_PASSWORD` – mailbox password / client secret |
| `SMTP_SECURE` – `true` for 465, `false` for 587 |

---

## 3. How Provider Selection Works

```
if NODE_ENV === 'production':
    Prefer SendGrid → else SMTP → else Ethereal
else:
    Use Ethereal (logs preview URL)
```

You can override by instantiating `new EmailService('smtp')`, but the singleton exported from `src/lib/email-service.ts` follows the logic above.

---

## 4. Step-by-Step Configuration

### 4.1 SendGrid (Recommended)

1. Create an account at https://sendgrid.com.  
2. Navigate _Settings ▸ API Keys_ → “Create API Key” (`Full Access` or `Mail Send`).  
3. Add the key to `.env`:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=CareLinkAI
```

4. (Optional) Verify your domain in **SendGrid ▸ Sender Authentication** to enable DKIM.  
5. **Restart** the Next.js server – the email service will now use SendGrid.

### 4.2 Gmail / Google Workspace

1. Enable **2-Factor Authentication** on the Gmail account.  
2. Generate an **App Password** (`Other ▸ CareLinkAI`).  
3. Update `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=myaddress@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_SECURE=false
EMAIL_FROM=myaddress@gmail.com
EMAIL_FROM_NAME=CareLinkAI
```

> Tip: Gmail’s daily send limit is ~500 for free accounts.

### 4.3 Custom SMTP

1. Obtain SMTP host, port, username & password from your provider.  
2. Decide whether to use SSL (port 465) or STARTTLS (587).  
3. Update `.env`:

```
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourcompany.com
SMTP_PASSWORD=strongpassword
```

4. Ensure the server allows relay from your application host IP.

---

## 5. Local Development (Ethereal)

When neither SendGrid nor SMTP env-vars exist **and** `NODE_ENV !== 'production'`, the service creates an **Ethereal** account automatically.

Console output example:

```
📧 Email Service: Ethereal (dev) provider initialized
📧 Verification email sent:
  Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
```

Open the preview URL to see the rendered email.

---

## 6. Verifying Configuration

1. Register a new user at `http://localhost:5002/auth/register`.  
2. Check:
   * **SendGrid** – Activity Feed shows the email.  
   * **SMTP** – Inbox receives the email.  
   * **Ethereal** – Console logs preview URL.  
3. Click the verification link; account status should change to **ACTIVE**.

---

## 7. Troubleshooting

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| `Invalid login` in logs | Wrong `SMTP_USER` / `SMTP_PASSWORD` | Regenerate credentials |
| `ETIMEDOUT` | Firewall blocking port | Allow outbound 465/587 |
| Email in Spam | Missing SPF/DKIM/DMARC | Add DNS records |
| `sendgrid/mail` 401 | Bad API key | Re-create key & redeploy |

---

## 8. Security & Compliance

- **HIPAA**: Emails must not contain Protected Health Information (PHI).  
- **Encryption**: TLS enforced by SendGrid & modern SMTP (ports 465/587).  
- **Rate Limiting**: `email-service.ts` does not throttle; configure at provider level.  
- **Audit Logs**: All sends are logged via `AuditLog` for compliance.

---

## 9. Quick Reference

```
# SendGrid
SENDGRID_API_KEY=

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false

# Custom SMTP
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=

EMAIL_FROM=
EMAIL_FROM_NAME=
```

**After editing `.env`, always restart the Next.js server** so changes take effect.

Happy emailing! 📧
