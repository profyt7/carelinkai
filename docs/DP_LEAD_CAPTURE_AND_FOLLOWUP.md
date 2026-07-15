# DP Lead-Capture + Automated Follow-Up (feat/dp-lead-capture)

Demand-first, founder-out lead capture for discharge-planner (DP) outreach. Anita
(a Fiverr contractor with **no app account/login/inbox**) calls discharge
planners, captures interest on one scoped web form, and the app runs a branded,
automated email follow-up sequence to the planner from our domain. Chris is never
the manual sender; Anita never sees app data. Replies collect at
`placements@getcarelinkai.com`.

## Surfaces

| Piece | Path |
|-------|------|
| Scoped no-auth form (Anita's only surface) | `/lead/new?k=<LEAD_CAPTURE_TOKEN>` |
| Form submit API | `POST /api/lead/dp` |
| Follow-up cron (daily) | `GET /api/cron/dp-followups` + `.github/workflows/dp-followups.yml` |
| Admin console (Chris) | `/admin/dp-leads` |
| Admin API | `GET /api/admin/dp-leads`, `PATCH /api/admin/dp-leads/[id]` |
| Data model | `DPLead` (migration `20260715000001_dp_leads`) |
| Sequence engine | `src/lib/dp-outreach/dp-followup.ts` |
| Copy (pure, testable) | `src/lib/dp-outreach/copy.ts` |
| Email sender | `sendDpFollowupEmail` in `src/lib/email.ts` |
| Form token gate | `src/lib/dp-outreach/lead-capture-token.ts` |

## Data model — `DPLead`

`name, email, hospital, department?, interestLevel(HOT|WARM), consent(bool),
notes?, source('anita_form'), status(active|replied|booked|patient_sent|stopped),
stoppedReason?, touchStep, createdAt, lastTouchAt?, nextTouchAt?`

**NO PHI.** Planner contact + interest only. Patient details never touch this
record — they flow through the separate concierge intake. `consent` = Anita's
attestation that the planner verbally agreed to be contacted (stored as evidence).

## The form

- Gated by a shared-secret token (`?k=…`, checked against `LEAD_CAPTURE_TOKEN`),
  validated **both** on page render and in the submit API (constant-time). Fails
  closed: if `LEAD_CAPTURE_TOKEN` is unset, no token is valid and the form is inert.
- Fields: planner name*, best work email*, hospital/system*, department (optional),
  interest level (Hot/Warm), notes, **required checkbox** "Planner verbally agreed
  to be contacted."
- Spam guards: shared-secret token + hidden honeypot field + light per-IP rate
  limit (10/min).
- On submit → creates `DPLead`, fires Touch 1, shows "Logged ✓". Anita sees nothing else.

## Follow-up sequence

- **Sender:** From `chris@getcarelinkai.com` (real person, already verified in
  Resend — no new sender/cost, reads more personal), display name
  "Chris Tolliver — CareLinkAI", **Reply-To** `placements@getcarelinkai.com` (the
  delegable alias). Light-branded, near-plain-text with a clean signature block —
  deliberately NOT the heavy operator HTML template.
- **Cadence (from lead creation):** Touch 1 = immediate (inline on submit),
  Touch 2 = +3d, Touch 3 = +7d, Touch 4 = +14d, then exhausted.
- **Founder video** (`FOUNDER_VIDEO_URL`) surfaced on Touch 1 and Touch 3.
  Default is the verified public HeyGen link.
- **Idempotent:** the cron advances a lead by at most one touch per run, and only
  touches `active` leads whose `nextTouchAt` is due. Never double-sends.
- **Email only.** No SMS anywhere in this lane (TCPA — out of scope until Haran's
  opinion + consent capture).

## Stop conditions (critical)

The sequence halts the moment `status` leaves `active`:
- Planner replies → Chris clicks **Mark replied** (`/admin/dp-leads`).
- **Mark patient sent** / **booked** → status set, sequence stops.
- Hard unsubscribe (one-click, CAN-SPAM) → `/api/outreach/unsubscribe` adds the
  address to the suppression list **and** flips any active `DPLead` for that email
  to `stopped`. The cron also re-checks suppression before every send.

Reactivate is available in admin if a lead was stopped in error — it reschedules
the next unsent touch.

## Compliance guardrails

- **Email only for now** (no SMS until TCPA opinion + consent capture).
- **Consent checkbox required** on the form; stored on the lead.
- **CAN-SPAM:** every sequence email carries a one-click unsubscribe link (honored
  → status `stopped`) and the company physical mailing address. `sendDpFollowupEmail`
  **refuses to send** without `COMPANY_POSTAL_ADDRESS` set.
- Free-tool framing only — no payment-for-referral language anywhere in the copy.
- `placements@` will receive health-adjacent info over time → confirm the email
  provider (Google Workspace / M365) has a **BAA** on file before routing real
  planner replies there.

## Deliverability (do first — gates everything)

- `getcarelinkai.com` + `placements@` verified in Resend (SPF/DKIM/DMARC) —
  already done for the domain.
- **Turn on open/click tracking** in the Resend dashboard (domain-level setting —
  not a code toggle). Historical operator-side bounce has been ~27–40%; DP emails
  are 1:1 so lower risk, but validate/suppress bad addresses.

## Go-live runbook (founder, Render env)

1. `LEAD_CAPTURE_TOKEN` = a long random string (this is the `?k=` for Anita's link).
2. Confirm `COMPANY_POSTAL_ADDRESS` is set (sends refuse without it).
3. `DP_FOLLOWUP_ENABLED=1` (master flag — off by default so a redeploy can never
   silently resume autonomous email, same discipline as the claim drip / OL-109).
4. (Optional) `FOUNDER_VIDEO_URL`, `DP_PLACEMENTS_PHONE`, and the `DP_LEAD_*`
   sender overrides — all have sensible defaults.
5. Turn on Resend open/click tracking + confirm the placements@ BAA.
6. Send Anita her link: `https://getcarelinkai.com/lead/new?k=<LEAD_CAPTURE_TOKEN>`.

The daily GHA (`dp-followups.yml`) is already scheduled; it's a no-op until
`DP_FOLLOWUP_ENABLED` is truthy, so once the flag flips, Touches 2–4 flow with no
further deploy.

## Acceptance test

Submit the form with a test planner → Touch 1 arrives from `chris@` (Reply-To
`placements@`) within a minute, the lead shows in `/admin/dp-leads`, the +3d
Touch 2 is scheduled (`nextTouchAt`), and **Mark replied** cancels the remaining
sequence.

## Out of scope (phase 2)

- SMS touches (TCPA-gated).
- Inbound reply auto-detection (start with the manual "Mark replied" toggle).
- Feeding the concierge/patient flow (separate handoff).
- Monthly "stay-in-touch" touch (phase 1.5).
