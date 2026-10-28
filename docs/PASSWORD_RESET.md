# Password Reset System Guide

The Password Reset System lets users securely regain access to their CareLinkAI accounts without contacting support.  
It consists of three API endpoints, secure token storage, email delivery, and detailed audit logging.

---

## 1. Architecture Overview

1. **POST `/api/auth/forgot-password`**  
   • Accepts an e-mail address, generates a single-use token (64-char hex) valid for **1 hour**, stores it in the `User` record, and sends a reset e-mail.

2. **POST `/api/auth/validate-reset-token`** *(or GET with `?token=`)*  
   • Validates that the token exists and is not expired.  
   • Returns `{ valid: true | false }` – no other user data is leaked.

3. **POST `/api/auth/reset-password`**  
   • Accepts `{ token, password, confirmPassword }`, verifies token, hashes the new password with bcrypt (12 salt rounds), clears token fields, and activates the account.

All steps write **AuditLog** entries for HIPAA / SOC2 traceability.

---

## 2. Database Fields

Added to `prisma/schema.prisma` / `User` model:

| Field | Type | Purpose |
|-------|------|---------|
| `resetPasswordToken` | String? | Stores 64-hex token |
| `resetPasswordTokenExpiry` | DateTime? | Expiration timestamp |
| Index | `@@index([resetPasswordToken])` | Fast lookup |

---

## 3. API Reference

### 3.1 Request Password Reset

`POST /api/auth/forgot-password`

```json
{
  "email": "user@example.com"
}
```

Response (always 200 to prevent enumeration):

```json
{
  "success": true,
  "message": "If your email is registered, you will receive password reset instructions shortly."
}
```

• Rate-limit on IP / email in a reverse proxy (e.g., 5 req / hr).

---

### 3.2 Validate Reset Token

`POST /api/auth/validate-reset-token`

```json
{ "token": "a1b2...f0" }
```

Or `GET /api/auth/validate-reset-token?token=a1b2...f0`

Successful:

```json
{ "success": true, "valid": true, "message": "Token is valid" }
```

Failure → HTTP 400.

---

### 3.3 Reset Password

`POST /api/auth/reset-password`

```json
{
  "token": "a1b2...f0",
  "password": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

Rules:
* ≥ 8 chars
* ≥ 1 uppercase, 1 lowercase, 1 number, 1 special (`@$!%*?&`)

Successful:

```json
{ "success": true, "message": "Your password has been reset successfully." }
```

Token is deleted immediately after use.

---

## 4. Email Template

File: handled inline by Nodemailer with **Ethereal** in dev, or real SMTP / SendGrid in prod (`src/lib/email-service.ts`).

Variables:
* `{{firstName}}`
* `{{resetLink}}`  → `https://{APP}/auth/reset-password?token={{token}}`
* Link expires after 1 h.

---

## 5. Security Considerations

| Measure | Detail |
|---------|--------|
| Token entropy | 256 bits (`crypto.randomBytes(32)`) |
| TTL | 1 hour (`resetPasswordTokenExpiry`) |
| One-time use | Token cleared after successful reset |
| Constant response | Forgot-password endpoint never reveals if e-mail exists |
| Strong passwords | Regex enforced + bcrypt 12 rounds |
| Audit logs | `AuditLog` rows for create / validate / reset |
| HTTPS | Mandatory in production |
| Rate-limiting | Recommended at reverse proxy / middleware |

---

## 6. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXTAUTH_URL` | `http://localhost:5002` | Base URL for links |
| `EMAIL_FROM`, `SENDGRID_API_KEY`, `SMTP_*` | – | Same variables used by Email Service |

No new variables are required exclusively for password reset.

---

## 7. Manual Testing

1. Register a user (or pick existing).  
2. `curl -X POST http://localhost:5002/api/auth/forgot-password -H "Content-Type: application/json" -d '{"email":"user@example.com"}'`  
3. Check server logs → preview URL (Ethereal) or inbox.  
4. Visit reset link; frontend should hit validate endpoint.  
5. Submit new password; expect success message.  
6. Login with new password.

---

## 8. Automated Test Script

Run:

```bash
node test-password-reset.js
```

The script performs full E2E flow, plus negative-case checks (token reuse, weak password, mismatched confirmation).

---

## 9. Troubleshooting

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| No e-mail received | SMTP / SendGrid not configured | See `docs/EMAIL_SETUP.md` |
| 400 “invalid token” | Token expired (1 h) or already used | Request a new reset |
| 500 error on reset | DB unreachable or invalid bcrypt salt rounds | Check `DATABASE_URL`, rebuild containers |
| Weak-password error | Regex failed | Use strong pass (“Pass123!” won’t pass) |
| Token appears in DB but email shows null | Email send executed **before** token persisted | Ensure `createResetToken` completes before `sendResetEmail` |

---

## 10. FAQ

**Q: Why not return 404 if e-mail not found?**  
A: That leaks user enumeration information. Always respond with 200.

**Q: Can I change token TTL?**  
Set `TOKEN_EXPIRY_HOURS` constant in `forgot-password` route.

**Q: Where are tokens stored?**  
Directly on the `User` row; no separate table needed, simplifies cleanup.

---

Happy debugging & stay secure! 🛡️
