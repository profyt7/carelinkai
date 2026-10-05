# CareLinkAI — Tech Open Loops
_Last updated: 2026-10-05 — **rebuilt from the repo** (sprint W2 item 7). Sources: the 56 open PRs on GitHub, `grep TODO|FIXME` over `src/`, every `test.skip`/`fixme` in `__tests__/`, `tests/`, `e2e/`, the CI workflows, and the previous version of this file (all 115 prior OL ids carried forward below with their last known status). Each entry: **OL id · one-line status · file path**. Triage: **SHIP NOW** = this week, **LATER** = backlog, **FOUNDER** = needs Chris (settings, money, legal), **CLOSED** = verified done (kept for id continuity)._

_Sprint W2 batch (2026-10-05) PRs — all open for review, none merged: **#714** public routes · **#715** memory restarts · **#716** payer-source audit · **#717** isDemo filter · **#718** Sentry 401 noise · **#719** Prisma cold start · **#720** this file._

---

## 🔴 SHIP NOW (this week)

### OL-122: Committed `.env` contains live secrets (credential exposure) — **founder, first**
- **Status:** 🔴 OPEN — rotation + history scrub is Chris's (explicitly reserved). Nothing in sprint W2 touched `.env` or history.
- **Path:** `.env` (tracked), `.gitignore`, `.github/workflows/*.yml` (`SENTRY_DSN: ""` overrides depend on this staying as-is until rotated)

### OL-124: Placement-fee invoice path is LIVE on inquiry→resident conversion and ignores the payer lane (AKS)
- **Status:** 🔴 OPEN — **decision needed.** `triggerPlacementFee()` runs after every conversion: creates a `PLACEMENT_FEE` Payment (`PLACEMENT_FEE_CENTS`, **$1,500 in Render per OL-030**, $500 default) and queues a Stripe invoice item when the operator has a `stripeCustomerId`; never reads `payerSource`/`deriveFeeLane()`. Built as OL-014 (April) before the AKS firewall (OL-114) and the OL-102 "do NOT build" parking existed — the two decisions contradict and this is the live one. Audit + tripwire test on PR #716. Proposed fix: `PLACEMENT_FEE_ENABLED` flag (default off) + `FEE_ELIGIBLE`-only gate.
- **Path:** `src/lib/services/inquiry-conversion.ts` (`triggerPlacementFee`), `src/app/api/operator/inquiries/[id]/convert/route.ts`, `docs/audits/OL-114_PAYER_SOURCE_AUDIT_2026-10-05.md`, `__tests__/payer-lane.audit.test.ts`

### OL-125: `/cleveland/*` landing pages were auth-gated; unknown paths bounced to login
- **Status:** 🟢 FIXED-PENDING-MERGE — PR **#714**. `/cleveland` added to the public list; first-segment-unknown paths now 404 via `/_not-found` before `withAuth`; `/monitoring` (Sentry tunnel) un-gated. Unit + e2e (`e2e/public-routes.spec.ts`, in the `e2e-concierge` job).
- **Path:** `src/middleware.ts`, `src/lib/routing/public-routes.ts`

### OL-126: Render memory restarts (10/5 04:05 UTC, 9/13 15:40 UTC)
- **Status:** 🟢 FIXED-PENDING-MERGE — PR **#715** + two founder settings (OL-138). Finding: 71 `PrismaClient` instances with per-request `$disconnect()`, a 4 GB heap cap on a smaller instance (922 MB RSS observed), and the health check rendering `/` (~40K traced `GET /` a day). Fix: one client per process, `NODE_HEAP_MB` heap cap (default 1024), `GET/HEAD /api/ping`, `tracesSampler` dropping pollers/bots.
- **Path:** `src/lib/prisma.ts`, `src/lib/sentry/trace-sampling.ts`, `src/app/api/ping/route.ts`, `package.json` (`start`), `docs/MEMORY_RESTARTS_2026-10-05.md`

### OL-127: Sentry CARELINK-AI-19 — 401s reported as errors
- **Status:** 🟢 FIXED-PENDING-MERGE — PR **#718**. `captureError()` drops `UnauthenticatedError`/`UnauthorizedError`; pipeline/convert/status routes short-circuit to `handleAuthError()`; client fetchers redirect to login on 401 (the stale-tab SWR poll was the logged-out caller).
- **Path:** `src/lib/sentry.ts`, `src/app/api/operator/inquiries/pipeline/route.ts`, `src/hooks/useInquiries.ts`, `__tests__/pipeline.auth-401.api.test.ts`

### OL-128: Prisma cold start — `prisma:client:detect_platform` p95 8.9 s
- **Status:** 🟢 FIXED-PENDING-MERGE — PR **#719** (most effective after #715). `binaryTargets` was already pinned; Prisma always runs the probe once per client, so the fix is one client + a boot-time `warmPrisma()` from `instrumentation.ts`. Confirm in Sentry after deploy: span gone from request traces.
- **Path:** `src/lib/prisma-warmup.ts`, `src/instrumentation.ts`, `docs/PRISMA_COLD_START_2026-10-05.md`

### OL-129: `isDemo` gaps in the public directory APIs (OL-112 follow-through)
- **Status:** 🟢 FIXED-PENDING-MERGE — PR **#717**. `/api/search` already filtered; `/api/homes/search` did not; `/api/homes/[id]` served demo homes logged-out. Jest + e2e (`e2e/search-demo-filter.spec.ts`). **Residual:** live Cleveland listing count still to be read by Chris (`curl 'https://getcarelinkai.com/api/search?location=Cleveland&limit=1' | jq .pagination.totalResults`) — agent env cannot reach prod.
- **Path:** `src/app/api/homes/search/route.ts`, `src/app/api/homes/[id]/route.ts`, `src/app/api/dev/upsert-operator/route.ts`

### OL-138: Render health-check path + heap env (founder settings for #715)
- **Status:** 🔴 FOUNDER — Render → Settings → Health Check Path: **`/api/ping`** (any uptime monitor too); set **`NODE_HEAP_MB`** per plan (Starter 256 · Standard 1024 default · Pro 2560). `render.yaml` still says `healthCheckPath: /` — update it in the same move (left untouched per "no Render settings changes").
- **Path:** `render.yaml`, Render dashboard

### OL-076: Next 15 async `params`/`searchParams` migration — 9 residents e2e specs still CI-skipped
- **Status:** 🔴 OPEN — `test.skip(!!process.env.CI, 'OL-076 …')` in 7 residents specs + 2 "run locally only"; `/learn` logs `searchParams.tab should be awaited` on every request (dev log 2026-10-05). The residents+family CI jobs are green only because the specs skip themselves.
- **Path:** `src/app/operator/residents/**`, `src/app/api/residents/**`, `src/app/learn/page.tsx`, `e2e/residents-*.spec.ts`

### OL-052: Attorney review of BAA/DPA draft templates (HIPAA)
- **Status:** 🔴 FOUNDER — still blocking the first operator with real PHI. Unchanged since June.
- **Path:** `docs/legal/*` (templates), `src/app/operator/onboarding/**` (BAA/DPA gate)

### OL-053: HIPAA breach-response runbook
- **Status:** 🔴 OPEN — was due 2026-06-30; no file in repo.
- **Path:** `docs/` (to create)

---

## 🟡 LATER (backlog, ordered roughly by leverage)

### OL-120: Route the transactional (non-`email.ts`) Resend sends through suppression
- **Status:** 🟡 OPEN — deliberate scope-out of #708 (founder decision 7/17).
- **Path:** `src/lib/email-service.ts`, `src/lib/notifications/*`, `src/lib/email/suppression.ts`

### OL-116: DP direct-mode placement request sends `homeId` but the API expects `homeIds`
- **Status:** 🔴 OPEN — logged 7/5, founder said log-don't-fix; still unfixed.
- **Path:** `src/app/discharge-planner/search/_components/PlacementRequestModal.tsx`, `src/app/api/discharge-planner/placement-request/route.ts`

### OL-130: `docker/Dockerfile` is a stale, non-deployed artifact
- **Status:** 🟡 OPEN — Render runs `runtime: node` (stack traces show `/opt/render/project/src/.next/standalone`); the Dockerfile is `node:18-alpine` (musl) vs the pinned `debian-openssl-3.0.x` engine and its `HEALTHCHECK` needs `pg`/`ioredis`. Either delete it (+ `release-docker.yml`) or fix the base image + `binaryTargets` before anyone relies on it. CLAUDE.md "Hosting: Docker" line is wrong.
- **Path:** `docker/Dockerfile`, `docker/healthcheck.js`, `.github/workflows/release-docker.yml`, `CLAUDE.md`

### OL-131: Register route logs the email-verification token in plaintext to stdout
- **Status:** 🟡 OPEN — `token=${token}` in `[createVerificationToken]` log line reaches Render logs (same class as OL-118). Found during the #715 codemod; not changed there.
- **Path:** `src/app/api/auth/register/route.ts` (`createVerificationToken`)

### OL-132: 44 stale open PRs from the Dec-2025 "Droid" era + 6 from Nov-2025
- **Status:** 🟡 OPEN — #304, #326, #327, #348, #349, #412, #432–#476 (provider/aides/availability/docs matrices). Most are superseded by what shipped on `main` since; several conflict. Recommend: close in bulk with a comment, keep anything with a unique migration (#469 provider model?) only after a diff check.
- **Path:** GitHub PR list

### OL-137: Merge-order note — PR #711 (Sentry CI noise) and #715 both edit the Sentry configs
- **Status:** 🟡 OPEN — #711 adds `enabled: NODE_ENV==='production'`; #715 swaps `tracesSampleRate` → `tracesSampler`. Different lines, but whichever merges second needs a trivial rebase. #711 also blanks DSNs in `e2e-family.yml`, which #712 already did (now redundant).
- **Path:** `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts`

### OL-133: Notification sends that are still `TODO` stubs
- **Status:** 🟡 OPEN — 11 `TODO: send/integrate email` markers: family member invites (`members/invite`, `invitations/[id]/resend`), bug-report admin email, inquiry response send (`inquiries/[id]/responses`, `responses/[id]/send`), tour notifications (5 stubs + "use a job scheduler"), document generation (Cloudinary upload, template render). Families/operators see "sent" states that send nothing.
- **Path:** `src/app/api/family/members/invite/route.ts`, `src/app/api/family/members/invitations/[invitationId]/resend/route.ts`, `src/app/api/bug-reports/route.ts`, `src/app/api/inquiries/[id]/responses/route.ts`, `src/app/api/inquiries/responses/[responseId]/send/route.ts`, `src/lib/notifications/tour-notifications.ts`, `src/lib/documents/generation.ts`

### OL-134: `tests/` Playwright suite (default config) is not run in CI and carries 5 `test.skip`
- **Status:** 🟡 OPEN — `playwright.config.ts` → `testDir: ./tests` (RBAC suite); no workflow runs it; `tests/operator-onboarding.spec.ts` skips 4 tests, `tests/bug-verification.spec.ts` 1. Also `e2e/marketplace-applications.spec.ts` is `test.skip(true)` and `e2e/operator-claim-flow.spec.ts` post-redemption block is `describe.fixme` (OL-064). Decide: wire into CI or delete.
- **Path:** `playwright.config.ts`, `tests/*.spec.ts`, `e2e/marketplace-applications.spec.ts`, `e2e/operator-claim-flow.spec.ts`

### OL-135: `ConversionPipelineDashboard` is dead code; `/operator/inquiries/pipeline` is a Kanban, not the conversion dashboard
- **Status:** 🟡 OPEN — nothing renders the component (only caller of `GET /api/operator/inquiries/pipeline`). Either mount it on the pipeline page's Analytics toggle or delete component + route.
- **Path:** `src/components/operator/inquiries/ConversionPipelineDashboard.tsx`, `src/app/operator/inquiries/pipeline/page.tsx`, `src/app/api/operator/inquiries/pipeline/route.ts`

### OL-136: Other `TODO`s worth a ticket each
- **Status:** 🟡 OPEN — residents list delete action (`ResidentsListActions.tsx:92`), inquiry `followupDate` field (`operator/inquiries/route.ts:160`), caregiver document file deletion from storage (`caregivers/[id]/documents/[docId]/route.ts:65`), provider `ratingAverage`/`reviewCount` placeholders (`marketplace/providers/route.ts:166`), family note editor (`family/page.tsx:249`), `src/lib/sse.ts:24` publisher stub.
- **Path:** as listed

### OL-108: Mint + send 2 VA warm-lead claim links (Pleasant Pointe, Eliza Jennings)
- **Status:** 🟡 FOUNDER — tooling shipped; the mint is a Render-shell run with prod secrets.
- **Path:** `scripts/mint-claim-link.ts`

### OL-119: DP lead-capture + follow-up sequence — ships OFF
- **Status:** 🟢 BUILT, 🔴 FOUNDER FLIP — `DP_FOLLOWUP_ENABLED` still off; Touch-1/3 links now point at `/founder` (#713 merged). Flip when ready; send one test lead first.
- **Path:** `src/lib/dp-outreach/*`, `src/components/lead/DPLeadForm.tsx`, `.github/workflows/dp-followups.yml`

### OL-113: ODH inspection history — ships empty until the first data file is ingested
- **Status:** 🟢 BUILT, 🟡 FOUNDER — cron OFF (`odh-inspections.yml`); needs the first ODH export run through `scripts/ingest-odh-inspections.ts` on Render.
- **Path:** `src/lib/inspections/*`, `scripts/ingest-odh-inspections.ts`, `.github/workflows/odh-inspections.yml`

### OL-111 / OL-110: Pricing capture + availability freshness — flag-gated OFF
- **Status:** 🟢 BUILT — family-survey trigger and SMS/voice availability channels off pending attorney sign-off + go-live config.
- **Path:** `src/lib/pricing/pricing.ts`, `src/lib/availability/availability.ts`, `.github/workflows/availability-sms.yml`

### OL-115: TCPA lead-consent — attorney review of v1 copy
- **Status:** 🟢 MERGED (#694), 🔴 FOUNDER residual — copy review.
- **Path:** `src/lib/lead-consent/*`, `src/components/forms/LeadConsent*`

### OL-114: Payer-source screener — residuals
- **Status:** ✅ MERGED (#695). Residuals: (a) screener missing from `/lead/new`, carebot and the operator `NewInquiryModal` (audit on #716); (b) attorney review of the `deriveFeeLane` mapping; (c) **OL-124 above is the live contradiction**.
- **Path:** `src/lib/payer/payer-source.ts`, `src/components/inquiries/NewInquiryModal.tsx`, `src/components/lead/DPLeadForm.tsx`

### OL-102: Facility placement-fee revenue stream — PARKED (attorney-gated)
- **Status:** 🅿️ PARKED — scoping only. **But see OL-124:** the April OL-014 implementation is already live code; parking the idea did not disable the code.
- **Path:** `src/lib/services/inquiry-conversion.ts`

### OL-092: Claim-nudge waves sent — measurement
- **Status:** 🟡 OPEN — pilot + scale wave sent 6/25–6/26; `report-claim-funnel.ts` / `report-claim-drip.ts` are the measurement tools; no numbers logged here since. **Do NOT re-enable `claim-drip.yml`** (sprint rule; PR #688 still open for review).
- **Path:** `scripts/report-claim-funnel.ts`, `scripts/report-claim-drip.ts`, `.github/workflows/claim-drip.yml` (disabled), PR #688

### OL-082: Batch-2 founder outreach — broadcast not yet sent
- **Status:** 🟡 FOUNDER — audience loaded (`batch2-send-prep.ts --push`), send pending.
- **Path:** `scripts/batch2-send-prep.ts`, `scripts/load-outreach-send-ready.ts`

### OL-099: Unclaimed-listing enrichment — residual
- **Status:** 🟡 MOSTLY DONE (#642–#648); remaining: Google rating coverage gaps (`report-google-rating-coverage.ts`).
- **Path:** `scripts/report-google-rating-coverage.ts`, `scripts/backfill-google-ratings.ts`

### OL-093 / OL-094: Directory data quality residuals + Hudson Elms ops call
- **Status:** 🟡 OPEN — 2 data items + 1 phone call (non-engineering).
- **Path:** `scripts/report-directory-homes.ts`, `scripts/verify-home-status.ts`

### OL-103: Money-path hardening — founder Render runbook pending
- **Status:** ✅ code delivered (#665–#668); 🟡 runbook steps on Render still pending.
- **Path:** `docs/` runbook in PR #665 description

### OL-087: Directory claim-flow hardening (defense-in-depth)
- **Status:** 🟡 OPEN — not urgent.
- **Path:** `src/app/claim/**`, `src/lib/claim-engine/*`

### OL-084: Headless-browser scrape for JS-rendered directory homes
- **Status:** 🟡 DEFERRED (founder, 6/23).
- **Path:** `scripts/autopopulate-cohort.ts`

### OL-071: Capture the 71 How-To screenshots
- **Status:** 🟡 OPEN — text-first guides live.
- **Path:** `src/app/learn/howto/content.ts`, `public/howto/`

### OL-074: `/family/residents` renders without app chrome
- **Status:** 🟡 OPEN (6/16).
- **Path:** `src/app/family/residents/page.tsx`

### OL-064: dev-login sessions not authorized by operator POST routes in CI
- **Status:** 🟡 OPEN — claim-flow guard parked (`describe.fixme`).
- **Path:** `e2e/operator-claim-flow.spec.ts`, `src/app/api/dev/login/route.ts`

### OL-063: e2e false-green
- **Status:** ✅ EFFECTIVELY CLOSED — `--list` discovery guards are in every e2e job; the remaining "green" risk is OL-076's self-skips, not discovery.
- **Path:** `.github/workflows/e2e-family.yml`

### OL-058 / OL-059: Batch-2 cohort + first-batch data-quality manual passes
- **Status:** 🟡 OPEN — manual verification against the live DB; no engineering.
- **Path:** `scripts/report-directory-homes.ts`

### OL-056: Cleveland founder end-to-end production smoke test
- **Status:** 🔴 OPEN — never recorded as verified on production.
- **Path:** `tests/smoke.spec.ts`, `playwright.production.config.ts` (`npm run test:e2e:prod`)

### OL-048: Prisma migrations 20260505000001/2/3 + 20260506000001 "pending on Render DB"
- **Status:** 🟡 VERIFY-THEN-CLOSE — `start` runs `migrate deploy` on every boot, so these have almost certainly applied; confirm with `prisma migrate status` on Render and close.
- **Path:** `prisma/migrations/2026050500000*`, `package.json` (`migrate:deploy`)

### OL-036: Marketplace filter slug alignment for existing providers
- **Status:** 🟡 OPEN — production data action.
- **Path:** `scripts/` (no script yet)

### OL-023: Checkr API not configured
- **Status:** 🟡 OPEN — mock fallback until keys are set.
- **Path:** `src/lib/background-checks/*`

### Roadmap (no engineering until the trigger condition is met)
- **OL-042** transport bundle pricing · **OL-044** guaranteed-ride SLA · **OL-045** SMS text-to-book · **OL-046** Medicaid/payer billing architecture · **OL-047** health-outcomes data layer · **OL-033** corporate B2B · **OL-034** caregiver CE courses · **OL-035** insurance navigation. Status: 🟡 ROADMAP, unchanged.

---

## ✅ CLOSED (carried forward for id continuity — do not reuse ids)

Verified done; see git history / the PR number for detail.

- **OL-123** founder intro self-hosted (#713 merged) · **OL-121** Sentry off in e2e CI (#712 merged) · **OL-118** auth-cookie log scrub (#699) · **OL-117** ClaimLinkVisit (#702) · **OL-112** admin demo-metrics filter (#697)
- **OL-107** single middleware (#682) · **OL-106** robots/sitemap public (#680) · **OL-105** PlacementSearch schema drift (#673) · **OL-104** in-app DP concierge (#671) · **OL-101** DP-free + VA pricing (#659–#663) · **OL-100** lead funnel (#654–#657) · **OL-098** / **OL-097** family `/search` polish + prod fixes · **OL-096** demo-homes-in-prod incident (#629/#630) · **OL-095** multi-home claim (#625) · **OL-091** duplicate listings (#617) · **OL-090** AL/RCF publish policy · **OL-089** Medina Pointe · **OL-088** Altercare archive (#615) · **OL-086** AVIF/HEIF (#604) · **OL-085** cohort photos · **OL-083** directory live (128 listings, 6/23) · **OL-081** batch-2 punch list · **OL-080** phone/capacity persist (#607) · **OL-079** claim email (`feat/claim-notification`) · **OL-078** cookie-consent gating · **OL-077** compliance-summary counts · **OL-075** mock-mode prod guard · **OL-073** / **OL-069** / **OL-070** / **OL-072** education hub + /help + emergency page · **OL-068** / **OL-067** inquiry 400 + DP search error · **OL-062** / **OL-061** / **OL-060** / **OL-057** / **OL-055** / **OL-051** June data + HIPAA merges
- **OL-050** private-household flow · **OL-049** run-check action · **OL-043** / **OL-041** / **OL-040** / **OL-039** / **OL-038** / **OL-037** / **OL-032** / **OL-031** / **OL-030** / **OL-029** / **OL-028** / **OL-027** / **OL-026** transport + pricing tiers (May) · **OL-022** / **OL-020** / **OL-019** / **OL-018** / **OL-017** / **OL-016** / **OL-015** / **OL-014** / **OL-013** / **OL-012** / **OL-011** / **OL-010** / **OL-009** / **OL-008** / **OL-007** / **OL-006** / **OL-005** / **OL-004** / **OL-002** / **OL-001** April foundation work. (**OL-014** "placement fee auto-triggered on Convert" is the code behind OL-124 — closed as built, reopened as a policy problem.)
- Ids never used: OL-003, OL-021, OL-024, OL-025, OL-054, OL-065, OL-066, OL-109 (OL-109 is PR #688's claim-drip safeguards — unmerged, tracked under OL-092).

---

## Appendix A — Open PR inventory (56 at 2026-10-05, newest first)

| PR | Branch | Triage |
|---|---|---|
| #714–#720 | `claude/carelink-sprint-w2-batch-xe1mt9-0*` | **This sprint — review in order 1→7.** |
| #711 | `claude/sentry-ci-noise-c0jl1t` | Review; overlaps #715 (OL-137). Its CI-env half is already on main via #712. |
| #710 | `feat/dp-leads-admin-delete` | Review — admin delete + test-lead cleanup; unrelated to sprint. |
| #703 | `claude/seed-symphony-at-mentor-hpdw44` | Seed data for one warm lead; merge or drop with OL-082. |
| #688 | `feat/claim-drip-safeguards` | **Do not merge / do not re-enable** (sprint rule). Keep open until the claim-drip decision. |
| #563, #562, #561 | docs/feature-inventory, feat/gate-cnos-frozen-lanes, docs/shift-fill-engine-audit | June docs + flag-gated CNOS lanes — low risk, review when convenient. |
| #412, #349, #348, #327, #326, #304 | Nov-2025 ops/e2e/droid | Stale; #326 (Prisma singleton in one route) is fully superseded by #715 → close. |
| #432–#476 (38 PRs) | Dec-2025 Droid provider/aides/availability/docs | **Stale — close in bulk** after a 10-minute diff check for any unique migration. See OL-132. |

## Appendix B — Skipped / parked tests (verbatim markers)

| File | Marker | Loop |
|---|---|---|
| `e2e/residents-{transfer,lifecycle,documents,csv-export,assessments-incidents-edit,assessments-incidents-update}.spec.ts` | `test.skip(!!process.env.CI, 'OL-076 …')` | OL-076 |
| `e2e/residents-compliance.spec.ts`, `e2e/residents-contacts.spec.ts`, `e2e/operator-compliance.spec.ts`, `e2e/credentials-upload.spec.ts`, `e2e/auth-credentials.spec.ts` | `test.skip(!!process.env.CI, 'Run locally only')` | OL-076 / OL-134 |
| `e2e/marketplace-applications.spec.ts` | `test.skip(true, 'UI no longer exposes apply/withdraw …')` | OL-134 |
| `e2e/operator-claim-flow.spec.ts:134` | `test.describe.fixme('@critical Cleveland founder claim flow (post-redemption)')` | OL-064 |
| `tests/operator-onboarding.spec.ts` (×4), `tests/bug-verification.spec.ts` (×1) | `test.skip()` | OL-134 |

Jest: 85 suites / 0 skipped suites on this branch set (10 individually skipped cases are pre-existing `it.skip`s in HIPAA probes).

## Appendix C — Repo hygiene noticed, no loop opened
- ~450 `*_SUMMARY.pdf` / `*_FIX.pdf` files and ~60 ad-hoc `*.js` scripts at the repo root (`check-*.js`, `test-*.js`, `*.cookies.txt`, `*.token.txt`). `operator.token.txt` / `*.cookies.txt` should be checked for live credentials as part of OL-122.
- `nextjs_space/package.json` collides with the root package name in jest-haste (warning on every test run).
- `package.json` still pins CI to Node 18 in `ci.yml` while `quality.yml`/e2e use Node 20 and Render runs 20.11.
