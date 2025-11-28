# Production Setup Guide (CareLinkAI)

This is the minimal, step-by-step checklist to bring CareLinkAI to production. Keep this alongside MVP_READINESS.md.

## 1) Required environment variables (Production)

Set these in your hosting provider (Render) for the production service:

- NEXTAUTH_URL = https://carelinkai.onrender.com
- NEXTAUTH_SECRET = a strong random string
- DATABASE_URL = postgres connection string
- SENTRY_DSN = your Sentry DSN (optional but recommended)
- NEXT_PUBLIC_SENTRY_DSN = same as SENTRY_DSN (optional)
- SENTRY_TRACES_SAMPLE_RATE = 0.1 (or as desired)
- NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = 0.1
- REDIS_URL = rediss://… if using rate limit/cache in prod (optional)
- EMAIL_FROM = noreply@carelinkai.com
- EMAIL_FROM_NAME = CareLinkAI
- EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_SECURE, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD (if enabling email)
- AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_ENDPOINT, AWS_S3_FORCE_PATH_STYLE (if enabling S3 uploads)
- STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET (if enabling billing)
- NEXT_PUBLIC_MARKETPLACE_ENABLED=true
- NEXT_PUBLIC_RESIDENTS_ENABLED=true
- ALLOW_DEV_ENDPOINTS=0

Tip: Refer to `.env.example` for the full list and descriptions.

## 2) Generate NEXTAUTH_SECRET

Pick one of the following:

- macOS/Linux: `openssl rand -base64 32`
- Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- PowerShell: `[Convert]::ToBase64String((New-Object byte[] 32 | %{ (Get-Random -Max 256) }))`

Copy the value into your Render service environment as `NEXTAUTH_SECRET`.

## 3) Operator credentials (for synthetic monitoring)

GitHub repository secrets already support optional operator checks:

- OP_EMAIL
- OP_PASSWORD

If these are set in GitHub Secrets, the “entry v4” / “ephemeral” synthetics workflows will exercise protected operator endpoints when possible.

Optional: set `SLACK_WEBHOOK_URL` (GitHub Secret) to receive success/failure notifications from synthetics.

## 4) Render service configuration

- Set the environment variables from step 1
- Ensure Health Check path is `/api/health`
- Set build command per `package.json` (uses increased Node heap)
- Disable dev-only endpoints in prod: `ALLOW_DEV_ENDPOINTS=0`

## 5) Final smoke tests

Once deployed:

- Visit `/api/health` → 200
- Confirm SSE ready event: `GET /api/sse?topics=system` should emit `event: ready`
- Sign in and verify basic user flows (family, residents, operator pages)
- Check Sentry ingest: trigger a handled error and confirm it appears in Sentry

## 6) Synthetics monitoring

Canonical workflow: `.github/workflows/post-deploy-synthetics-ephemeral.yml`

- Runs every 30 minutes via cron and on file changes
- Creates/updates GitHub Issues on failures; auto-closes after a succeeding run
- Optional Slack notifications via `SLACK_WEBHOOK_URL`

## 7) Optional clean-up of legacy workflows

We keep historical synthetics workflows for reference. The “ephemeral” workflow is the standard going forward. You may remove older `post-deploy-synthetics-*` workflows once you’re comfortable with the schedule and notifications.

## 8) Incident response

- On failure: review the linked Actions run; the workflow creates/updates a GitHub Issue
- Re-run the workflow dispatch or wait for the next cron
- Verify Render logs and Sentry traces for root cause

---

If you want me to set GitHub repository secrets for Slack or help generate `NEXTAUTH_SECRET`, just provide the values (or say “generate for me”), and I’ll configure them.
