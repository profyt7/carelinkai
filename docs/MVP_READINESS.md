# MVP Readiness Checklist

Use this checklist to validate production readiness. None of these steps expose secrets; values are stored in your hosting and repo settings.

## 1) Core Secrets (Production)
- NEXTAUTH_URL (https://carelinkai.onrender.com)
- NEXTAUTH_SECRET (random 32+ char)
- DATABASE_URL (Render Postgres URL)

## 2) Observability
- SENTRY_DSN set (and optional NEXT_PUBLIC_SENTRY_DSN)
- SENTRY_TRACES_SAMPLE_RATE (e.g. 0.1)

## 3) Notifications (optional but recommended)
- SLACK_WEBHOOK_URL added in GitHub → Settings → Secrets and variables → Actions → Repository secrets

## 4) Billing (optional for MVP if no payments at launch)
- STRIPE_SECRET_KEY (live or test)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET (point Stripe webhook to https://carelinkai.onrender.com/api/webhooks/stripe)

## 5) Email (recommended)
- SENDGRID_API_KEY or SMTP_* variables
- EMAIL_FROM and EMAIL_FROM_NAME

## 6) Storage (optional)
- AWS_* and S3 bucket if enabling file uploads in prod

## 7) Security
- Ensure ALLOW_DEV_ENDPOINTS=0 in production
- Ensure ALLOW_INSECURE_AUTH_COOKIE=0 in production

## 8) Health & Synthetics
- /api/health returns 200 and db=ok
- Post-deploy synthetics (ephemeral) cron schedule every 30 minutes
  - On failure: creates/updates GitHub Issue and (optionally) posts to Slack
  - On success: auto-closes failure issue(s) and (optionally) posts Slack success

## 9) Rollback & Runbook
- Render deployment “Deploy to Render (env-aware)” is green
- Rollback plan documented in Render (keep previous build)

## 10) Final Smoke
- Sign in, core flows work (Residents, Marketplace, Messaging, SSE ready)
- No errors in browser console; Sentry captures a test error

This file is maintained by automation. [Droid-assisted]
