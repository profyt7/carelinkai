# Resend Bounce-Rate Fix — Suppression, Webhook & Validation

Goal: get outreach bounce rate from ~27% → <3% and keep it there. Tracking
(open/click, `links.getcarelinkai.com`) is already fixed; this is only about bounces.

Root cause: invalid/guessed addresses in scraped operator + DP lists, and
re-sending to addresses that already hard-bounced. Fix = never send to a known-bad
address (enforced at send time), auto-learn new bad addresses (webhook), and
reject undeliverable addresses before they enter the queue (validation).

## What shipped

| Piece | File | Role |
|-------|------|------|
| Suppression list (single source of truth) | `src/lib/email/suppression.ts` (on the existing `EmailSuppression` table) | `filterSuppressed`, `addSuppressions`, `isEmailSuppressed`, `suppressedCount` |
| **Send-time enforcement** | `guardedResendSend` in `src/lib/email.ts` | every send helper routes through it; suppressed recipients are dropped, fully-suppressed sends are skipped |
| **Bounce/complaint webhook** | `src/app/api/webhooks/resend/route.ts` | `email.bounced`/`email.complained` → auto-suppress; Svix-verified |
| **Pre-send validation gate** | `src/lib/email/validate.ts` | syntax + MX (free; no paid API) |
| **History import** | `scripts/import-resend-suppressions.ts` | backfill suppression from a Resend dashboard export (file-first) |
| **List scrub** | `scripts/scrub-contact-emails.ts` | validate the scraped contact tables, quarantine undeliverables |

**No migration** — `EmailSuppression` already exists; its `reason` string carries
every cause: `bounce`, `complaint`, `unsubscribe`, `invalid_syntax`, `no_mx`, `manual`.

## How enforcement works

`EmailSuppression` is the one exclusion list. `guardedResendSend` (the only path
the `email.ts` helpers use to reach Resend) calls `filterSuppressed(to)` before
every send:
- suppressed addresses are removed from the recipient list;
- if nothing deliverable remains, the send is skipped (no bounce);
- it **fails open** — a suppression-lookup DB error lets the mail through rather
  than silently killing all outbound email (the webhook keeps the list fresh, so
  a transient miss is low-risk).

Because the scrub and import scripts write invalids/bounces into the *same*
`EmailSuppression` table, quarantined addresses are automatically excluded from
every future broadcast — no per-contact `emailStatus` column needed.

> Scope note: the enforcement covers every send in `src/lib/email.ts` (all
> outreach lanes + transactional). A handful of transactional sends live outside
> that module (ride notifications, some cron/register routes, `inquiry-email-service.ts`)
> and still call Resend directly — they go to user-typed addresses (low bounce
> risk). Routing them through `guardedResendSend` too is a clean follow-up.

## Founder go-live runbook (Render)

**1. One-time cleanup — import existing bounces + scrub the lists**

- In the Resend dashboard, export your bounced + complained emails (Emails → filter
  by status → export CSV, or the JSON events export). Save the file.
- Import it into the suppression list (dry-run first — it reports how polluted the
  list is and whether one scraped batch dominates):
  ```
  npx tsx scripts/import-resend-suppressions.ts --input bounces.csv          # DRY RUN
  npx tsx scripts/import-resend-suppressions.ts --input bounces.csv --force   # WRITE
  ```
- Scrub the scraped contact tables (operator `outreachEmail`/`contactEmail` + `DPLead.email`)
  for syntax/MX-dead addresses:
  ```
  npx tsx scripts/scrub-contact-emails.ts            # DRY RUN (per-source pollution report)
  npx tsx scripts/scrub-contact-emails.ts --force    # quarantine undeliverables
  ```
- Report back the "Suppression list size" the import prints — that's how polluted
  the list was — and the per-source "% bad" from the scrub (tells us which scraped
  source to stop trusting).

**2. Wire the webhook (keeps it fixed going forward)**

- Resend dashboard → Webhooks → add endpoint `https://getcarelinkai.com/api/webhooks/resend`,
  events **`email.bounced`** and **`email.complained`**.
- Copy the signing secret into Render as `RESEND_WEBHOOK_SECRET` (`whsec_…`).
- The route rejects unsigned posts in production (fail-closed), so set the secret
  before enabling the endpoint.

**3. Auth + monitoring**

- SPF/DKIM are already aligned (domain verified). Add a **DMARC** DNS TXT record if
  absent — start at `p=none`:
  `_dmarc.getcarelinkai.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@getcarelinkai.com"`
- The webhook logs every suppression; broadcast-level bounce-rate alerting
  (flag a send >5%) is a follow-up.

## Cost flag (per CLAUDE.md)

This uses **no paid service** — MX checks are free DNS, suppression is a DB table,
the webhook is free. A per-address verification API (NeverBounce / ZeroBounce /
Bouncer) bills ~$0.003–0.008/check. A one-time cleanup of the current list would be
a few dollars; wiring one as a **recurring per-send** step would add recurring cost
and must be flagged before adding (CLAUDE.md: anything >$20/mo). It is intentionally
**not** wired here — the free syntax+MX gate + webhook feedback loop should reach
<3% on their own.

## Reputation recovery (segmentation)

After the cleanup, protect the recovering reputation:
- Send to an **engaged** segment first (addresses that have opened/clicked/replied).
- Drip the remaining cold scraped list in small, warmed batches rather than one blast.
- Watch the bounce rate per batch; if a batch exceeds ~5%, stop and re-scrub its source.

## Acceptance criteria status

- ✅ Suppression enforced on every `email.ts` send; hard-bounced addresses are never re-sent.
- ✅ Bounce/complaint webhook live and auto-suppressing (once the secret is set + endpoint added).
- ✅ Pre-send syntax/MX validation gate in place (used by the scrub + available for imports).
- ⏳ Existing lists scrubbed — founder runs the two scripts on Render (step 1).
- ✅ No new recurring cost.
