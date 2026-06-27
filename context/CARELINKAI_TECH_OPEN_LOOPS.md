# CareLinkAI — Tech Open Loops
_Last updated: 2026-06-27 — OL-099 CLOSED: enrichment batch (#642–#648) + first-party reviews #5 (#650–#652) + Google ratings populated (133/144). Founder TODO: rotate demo.* passwords; incognito-verify anon /search. Open: dedup Brookdale Westlake pair (OL-093)._

## Format
Each loop: what it is, why it matters, what done looks like.

---

## 🔴 HIPAA Critical (Blocking First Operator with Real PHI)

### OL-051: Merge HIPAA Phase 3 PRs #536 → #537 → #538
- **Status:** ✅ CLOSED (verified 2026-06-16) — all three merged to main.
- **Evidence:** commits `0f06d6d` (PR A #536), `61e4803` (PR B #537), `a605a57` (PR C #538) are on `main`; the PR B schema migration `prisma/migrations/20260516000001_add_operator_baa_dpa_acceptance/` is in the tree. Follow-up fix `ec6c12e` (#539) also landed.
- **Note:** Merging the code ≠ legal sign-off — the BAA/DPA templates are still DRAFTs (see OL-052). The signup gate is live; existing operators get redirected to `/operator/acceptance` as designed.

### OL-052: Attorney review of BAA/DPA draft templates (HIPAA Punch List F1 / A2)
- **Status:** 🔴 OPEN — **blocked on FOUNDER action (attorney outreach), not engineering.** Still BLOCKING first operator with real PHI.
- **What:** `src/content/legal/baa/v-draft-2026-05-15.md` and `src/content/legal/dpa/v-draft-2026-05-15.md` have mandatory DRAFT banners. Must NOT be presented to operators as binding agreements until reviewed and approved by qualified legal counsel. Engineering is done — `src/lib/legal.ts` still pins `BAA_CURRENT_VERSION = DPA_CURRENT_VERSION = 'draft-2026-05-15'` (verified 2026-06-16); the only remaining step is the legal review + a version bump.
- **Done when:** Attorney reviews + approves both templates → update `BAA_CURRENT_VERSION` / `DPA_CURRENT_VERSION` in `src/lib/legal.ts` off `draft-2026-05-15` to the approved version → redeploy → existing operators re-accept.

### OL-053: HIPAA breach response runbook (Risk Register Risk 1 Action 6)
- **Status:** ❌ OPEN — due 2026-06-30
- **What:** Written runbook for breach detection, notification within 60 days (HIPAA Breach Notification Rule), affected individuals list, HHS reporting.
- **Done when:** Document created in vault, reviewed, and linked from admin HIPAA dashboard.

---

## 🔴 Critical (Blocking Revenue / Demos)

### OL-055: STRIPE_PRICE_AGENCY env var not set in Render
- **Status:** 🔴 OPEN — AGENCY tier ($799/mo) is visible in wizard Step 4 but Stripe Checkout will fail without this env var
- **What:** Create a $799/month recurring product in the Stripe dashboard, copy the price ID, set `STRIPE_PRICE_AGENCY` in Render environment variables.
- **Done when:** Env var set in Render + operator can successfully start Agency Stripe Checkout from wizard Step 4.

### OL-056: Cleveland founder end-to-end production smoke test needed
- **Status:** 🔴 OPEN — code shipped in PR #542, not yet verified on production
- **What:** Full path: seed a home via `/api/dev/upsert-operator`, generate claim link via admin UI, register new operator with `?claimToken=`, complete all 4 wizard steps, verify free access granted and no Stripe flow triggered.
- **Done when:** Founder lands on Step 4 free card, clicks "Complete Setup", reaches `/operator` dashboard with no Stripe redirect.

### OL-057: Non-Cleveland demo homes cleanup
- **Status:** ✅ EFFECTIVELY DONE (verified 2026-06-16) — residual is a live-DB confirm only.
- **What:** `scripts/cleanup-non-cleveland-demo-homes.ts` deletes DRAFT homes where `address.state != 'OH'`. **Merged via #551** (the doc's old "no PR yet" was stale). The 2026-06-10 Render cleanup **dry-run found zero non-OH DRAFT homes** (no-op — the earlier non-Cleveland demos were already gone), and **43 leaked e2e test homes were purged via #558 on 2026-06-11**.
- **Residual:** next time in the Render shell, re-confirm against the live DB that no non-OH DRAFT homes exist. No code work remains.

### OL-058: Second batch Cleveland facilities auto-population
- **Status:** 🟡 OPEN — **batch-2 seeded + partially cleaned (2026-06-19/21).** Supply staged via #579; cleanup script #580 applied 2026-06-21 (rename Anthology→Ashton, retire Villa Serena, purge 2 test homes); 3 fixable homes got Places address backfill, then manual send-ready content via #582. Remaining: photo uploads for the 3 held homes (see **OL-081** residual).
- **What:** Identify next set of Cleveland-area AssistedLivingHome records with `websiteUrl` available, create CSV, run `autopopulate-cohort.ts --dry-run` then `--force`.
- **Note:** The Elms (mapped to "Hudson Elms Skilled Nursing & Rehabilitation Center"), Concordia at Sumner (city/address unresolved), Ohman + O'Neill North Ridgeville (capacity discrepancies) should be manually reviewed before operator outreach.
- **Done when:** All Cleveland directory homes have `autoPopulatedAt` set or are marked as JS_ONLY/BLOCKED with a note.

### OL-059: AI-populated home data quality review — first-batch flags
- **Status:** 🟡 OPEN — the 2026-06-10 backfill improved address/photo data, but the 4 flagged homes below still need a **manual** verification pass before operator outreach; confirm each against the live DB.
- **What:** Manual verification needed before operator outreach for:
  1. **The Elms** — site says "Hudson Elms Skilled Nursing & Rehabilitation Center"; confirm this is the intended facility
  2. **Ohman Family Living at Holly** — capacity: DOH 58 vs site 92 SN + 26 AL + 24 MC
  3. **O'Neill Healthcare North Ridgeville** — capacity: DOH 44 vs site 190 total
  4. **Concordia at Sumner** — city/street address not resolved; MEDIUM confidence
- **Done when:** Each record manually verified and corrected in admin panel before the facility receives a claim link.

### OL-060: First-batch photo backfill (text-only June-5 run had no photos)
- **Status:** ✅ LIKELY CLOSED (pending live-DB confirm) — the 2026-06-10 Render session ran the photo backfill: **~70 photos backfilled** across the first-batch homes. Re-confirm `HomePhoto` counts against the live DB before fully closing.
- **What:** The June-5 pipeline run predated the photo feature (#549), so the 15 first-batch Cleveland homes have `autoPopulatedAt` set but **no photos**. `--photos-only` mode (skips text re-extraction + text writes; scrapes images → AI-classify → Cloudinary re-host → append `HomePhoto` rows; idempotent — clears prior auto-populated photos first). `--from-db` targets the auto-populated cohort without a CSV.
- **Done when:** On Render: `tsx scripts/autopopulate-cohort.ts --from-db --photos-only --dry-run` reviewed, then `--force`. 15 homes have auto-populated photos. (Anthropic spend small — image-classify only; Cloudinary within free tier.)

### OL-061: AI address extraction weak — Google Places fallback
- **Status:** ✅ LIKELY CLOSED (pending live-DB confirm) — code merged (#554, 2026-06-09); the 2026-06-10 Render session ran the address backfill: **12 addresses verified/backfilled** via Google Places. Re-confirm the cohort's `Address` rows against the live DB before fully closing.
- **What:** HTML extraction often misses the street (Canterbury Commons showed the `1234 Oak Lane` form placeholder). `findAddressViaPlaces()` in `src/lib/place-lookup.ts` + wired into the populator: when neither DB nor AI yields a street, look the facility up by name + city and fill street/zip from a HIGH/MEDIUM-confidence Google Places match (fill-only, never overwrite). `GOOGLE_PLACES_API_KEY` is set in Render.
- **Done when (remaining):** Backfill the existing 15 homes' addresses via the `--addresses-only` mode (no text re-extraction) on Render.

### OL-062: "Full address is required" validation doesn't name the empty sub-field
- **Status:** ✅ CLOSED (#554, 2026-06-09) — `src/app/operator/onboarding/[step]/page.tsx` now names the missing sub-field(s), e.g. "State is required."

### OL-063: e2e suite runs ZERO tests in CI (false-green)
- **Status:** 🟡 OPEN — **fix in flight: PR #572** (`fix/e2e-false-green-family-residents`). Awaiting that PR's CI to surface real failures.
- **What:** The `e2e-residents` and `e2e-family` jobs ran specs from `./e2e/` against the **default** config (`testDir: './tests'`), so a bare `playwright test e2e/<spec>` matched nothing — and `--shard` makes an empty match exit 0. Verified locally 2026-06-16: `playwright test e2e/family-notifications.spec.ts --shard=1/2 --list` → `Total: 0 tests in 0 files`, exit 0 (vs exit 1 without `--shard`). Net effect: those suites passed without executing a single test. (The `e2e-operator-claim` job was already fixed to use `playwright.e2e.config.ts`.)
- **Fix (PR #572):** point both jobs at `--config=playwright.e2e.config.ts` (`testDir: './e2e'`) so specs are discovered, and add a pre-run `--list` discovery guard (exits 1 on empty match) so a zero-discovery run fails loudly instead of an empty shard silently passing.
- **Done when:** PR #572's e2e jobs execute non-zero tests, the genuinely-failing specs are either fixed or explicitly quarantined under their own OL, and the workflow is green for real (not vacuously).
- **Note:** local execution of the suite was blocked by the sandbox network (Playwright browser download fails); PR #572's CI is the first real run.

### OL-064: dev-login sessions are not authorized by operator POST routes in CI (claim-flow e2e guard parked)
- **Status:** 🟡 OPEN — claim-flow guard parked (`test.describe.fixme`) 2026-06-09
- **What:** In the CI e2e dev-server harness, operator-authenticated POST routes (`/api/operator/claim`, `POST /api/operator/homes/[id]/claim`, acceptance POST) return **403 "Forbidden"** for a `/api/dev/login` session, even though GET routes (`/api/dev/whoami`, `/api/operator/onboarding/status`) resolve the *same* session as role `OPERATOR`. Captured: `operator/claim 403: {"error":"Forbidden"} | whoami={… "role":"OPERATOR" …}`. The claim flow itself works in production (verified by the manual prod smoke test), so this is a harness/auth quirk, not a product bug.
- **Impact:** `e2e/operator-claim-flow.spec.ts` is parked via `test.describe.fixme`; all supporting infra (`playwright.e2e.config.ts`, the `e2e-operator-claim` CI job, the testDir discovery fix) is retained so it can be re-enabled with a one-line change.
- **Done when:** Root-caused (Playwright trace / local-DB repro of why operator POST `getServerSession`+DB role check fails while GET succeeds), fixed, and the 3 parked tests re-enabled and green.

### OL-067: Discharge-planner search PrismaClientValidationError + raw-error leak
- **Status:** ✅ CLOSED (2026-06-15) — Sentry `2f642d88976448d394ec4d7d9fc10ca0`
- **What:** `POST /api/discharge-planner/search` threw `PrismaClientValidationError: Expected CareLevel` and rendered the raw Prisma message into the UI. Real cause: the AI parser emitted `careLevel "ASSISTED_LIVING"`, not a member of the `CareLevel` enum (`INDEPENDENT/ASSISTED/MEMORY_CARE/SKILLED_NURSING`). `careLevel` is a `CareLevel[]` list so `hasSome` was correct — the values were invalid. Added `sanitizeCareLevels()` (synonym map + drop-invalid) in `src/lib/discharge-planner/criteria.ts`, fixed the parser prompt, fixed the city/state location filter (was matching the full "City, ST" string against both fields), and hardened the catch block to return a generic 500 + Sentry-only logging. Unit tests in `__tests__/discharge-planner.criteria.unit.test.ts`.
- **Note:** Committed to `claude/inspiring-mayer-rvgyys`; not yet PR'd/merged to main.

### OL-068: Inquiry form 400 — field-name mismatch with /api/inquiries
- **Status:** ✅ CLOSED (2026-06-15)
- **What:** The `/homes/[id]` "Send Inquiry" form posted `name/email/phone/residentName/careNeeded` + `source:'home_detail'`, none matching the API Zod schema → every submit `400 Validation failed`. Added `buildInquiryPayload()` (`src/lib/inquiries/payload.ts`) mapping to the canonical contract, extracted the schema to `src/lib/inquiries/schema.ts`, relaxed `careRecipientName` to optional (nullable column, backward compatible). Tests in `__tests__/inquiries.payload.unit.test.ts`.
- **Note:** Committed to `claude/inspiring-mayer-rvgyys`; not yet PR'd/merged to main.

### OL-069: Port the full How-To guide set from the ChrisOS vault into the Education Hub
- **Status:** ✅ CLOSED (2026-06-16, PR feat/howto-hub-full-content) — full content now version-controlled in-repo
- **What:** The starter set has been replaced with all **29 cleaned, role-facing guides** (shared 3, family 6, operator 9, caregiver 6, provider 3, discharge-planner 2). Chris delivered them as an app-ready bundle (`_app_content_bundle`, via a zip dropped on `chore/howto-bundle-dropoff` since the vault isn't reachable from dev/CI). A codegen script `scripts/generate-howto-content.ts` transforms the bundle (`manifest.json` + `content/<role>/*.md`) into `src/app/learn/howto/content.ts` (role→audience mapping, `### ` step sections, Tips/FAQ, internal cross-refs stripped). Admin-internal + Affiliate guides are deliberately excluded. The raw bundle + zip were removed so nothing extra ships; the dropoff branch was deleted.
- **Role-gating:** unchanged from #566/#567 — families see shared + family only; each role sees its own; verified by `__tests__/howto.access.unit.test.ts` (per-role counts + no cross-role leak).
- **Image tail → see OL-071.**

### OL-071: Capture the 71 How-To screenshots into the repo
- **Status:** 🟡 OPEN — text-first guides are live; screenshots pending
- **What:** Each guide's frontmatter lists screenshot filenames (71 total) that live in Chris's Downloads, not the repo. The hub renders **text-first**: it shows only images present under `public/howto/` (build-time `AVAILABLE_HOWTO_IMAGES` set), so missing captures render nothing — no 404s, no broken layout. The full per-guide checklist is generated at `public/howto/README.md`.
- **Done when:** Optimized PNGs are dropped into `public/howto/` by the filenames in that README, `npx tsx scripts/generate-howto-content.ts` is re-run (rescans available images), and the guides show their screenshots. (Optional later: namespace filenames by slug, or host on Cloudinary.)

### OL-070: /help "Getting Started" links broken/role-gated for all roles
- **Status:** ✅ CLOSED (2026-06-15, PR #567, merged) — backfilled here
- **What:** The role checklists on `/help` pointed at dead or role-gated routes (FAMILY "Browse assisted living homes" → `/discharge-planner`; `/marketplace/aides` 404; CAREGIVER `/settings/aide` 404; OPERATOR `/marketplace/listings` 404), and DISCHARGE_PLANNER/AFFILIATE had no guide. Repointed every step to a verified, role-accessible route and added the two missing guides. Extracted to `src/lib/help/getting-started.ts` + `__tests__/help.getting-started.unit.test.ts` (33 cases) that fails if any href doesn't resolve to a real `src/app/**/page.tsx` route or a FAMILY step targets a gated portal.

### OL-072: /family/emergency crashed on load (error boundary)
- **Status:** ✅ CLOSED (2026-06-16, PR #569)
- **What:** `/family/emergency` tripped the global "Something went wrong" error boundary for FAMILY users. Cause: a client/API contract mismatch — `GET /api/family/emergency` returns `{ preferences }` (plural; `null` when none exist), but the page read `data.preference` (singular → `undefined`) and set state to it, so render dereferenced `undefined.notifyMethods`. Fix: read `data.preferences` and `normalizePreference()` any input (null/partial/free-form JSON `escalationChain`) into the strict UI shape. Extracted to `src/lib/family/emergency.ts` + `__tests__/family.emergency.normalize.unit.test.ts` (6 cases). The `/help` "Set up emergency contacts" link stays enabled (fix ships with it).

### OL-073: Education Hub information architecture — tab split
- **Status:** ✅ CLOSED (2026-06-16, PR feat/education-hub-tabs)
- **What:** The How-To tutorials sat below the senior-care articles, so as articles grow How-To would get buried. Added two tabs at the top of `/learn` — **How-To & Tutorials** (default) and **Senior Care Guides** — driven by the `?tab=` query param (URL-stable, refresh-safe, server-rendered, no client JS). Role-gating from #566 preserved under the How-To tab. The `/help` "Education Hub" card still deep-links to `/learn` (defaults to How-To).

### OL-074: `/family/residents` renders without app chrome (backlog)
- **Status:** 🟡 OPEN — captured during 2026-06-16 live inspection
- **(a)** `/family/residents` renders **without the app sidebar/chrome** — confirm whether intended (other `/family/*` pages use `DashboardLayout`). Low priority, cosmetic.
- **Done when:** decision recorded + layout aligned if needed.

### OL-075: Marketplace mock data could leak to real users in prod
- **Status:** ✅ CLOSED (2026-06-16, PR `fix/mock-mode-prod-admin-only`)
- **What:** The `/marketplace` Providers (and Caregivers) surfaces showed sample data ("Golden Years Home Care, San Francisco") because admin **mock mode** was on (a `carelink_mock_mode` cookie or `SHOW_SITE_MOCKS=1` env). The `_marketplace_mock` default-on path in `providers/[id]` and the on-empty/on-error mock fallbacks in the caregivers route could also surface mocks to real visitors. Founder chose a code hardening over an ops toggle.
- **Fix:** added `isMockViewerAllowed()` (`src/lib/mockMode.server.ts`) — non-prod: always; **production: ADMIN only** — and gated every mock-serving point in the providers/caregivers + `providers/[id]` routes on it. So a stray cookie/env can no longer leak demo data to families on prod; admins keep the preview in dev/staging. Test: `__tests__/mock-mode.viewer.unit.test.ts` (5 cases).
- **Note:** This is the durable fix for the OL-074(b) observation. If `SHOW_SITE_MOCKS=1` is *also* set in Render, it's now harmless for end users but can be unset for tidiness.

### OL-076: Complete the Next 15 async params/searchParams migration (operator/residents + api/residents)
- **Status:** 🔴 OPEN — surfaced 2026-06-16 when the e2e suite first ran for real (OL-063 fix, PR #572).
- **What:** The app is on Next 15.5.10, where `params`/`searchParams` are async and must be awaited; several server components + route handlers still read them synchronously, which throws (`sync-dynamic-apis`) → broken/slow renders. PR #572 fixed the family-residents pages, but the **operator/residents** surface is still synchronous: `src/app/operator/residents/page.tsx` (searchParams ×7), `src/app/operator/residents/[id]/page.tsx` (params + searchParams), and `src/app/api/residents/[id]/{route,assessments,contacts,notes,incidents,…}/route.ts` (params.id in every handler). This breaks the operator residents e2e specs (page-load timeouts + missing sections).
- **Quarantine:** 6 residents e2e specs (`residents-transfer`, `-lifecycle`, `-documents`, `-assessments-incidents-edit`, `-assessments-incidents-update`, `-csv-export`) are explicitly `test.skip(!!process.env.CI, …)` in CI pending this work (they were previously false-green / never executed, so no real coverage was lost). `residents-contacts`/`-compliance` were already CI-skipped; `residents-summary` passes.
- **Also worth checking:** the CI residents specs navigate via `npm run dev` (the e2e config webServer), so first-hit on-demand compilation may contribute to the 60s `page.goto` timeouts — consider building + `npm run start` for the e2e config, or raising timeouts.
- **Broader:** audit the rest of `src/app/**` for the same sync `params`/`searchParams` pattern (this was a partial Next 14→15 migration).
- **Done when:** operator/residents pages + api/residents routes await their dynamic APIs, the 6 quarantined specs are un-skipped, and the residents e2e job runs them green.

### OL-077: Reconcile family compliance-summary counts (seed vs page vs test)
- **Status:** ✅ CLOSED (2026-06-16, PR `fix/family-compliance-summary-semantics`).
- **What it was:** `family/residents/[id]` Compliance Summary (Open / Completed / Due Soon (14d) / Overdue). The page-crash bug was fixed in #572 (await params + valid `ComplianceStatus` enum), but `family-resident-readonly.spec.ts` (Open=2/Completed=1/Due Soon=1/Overdue=1) was stale vs the dev seed and had been CI-quarantined.
- **Resolution:** Kept the page's principled buckets (Completed=`CURRENT/COMPLIANT`; Open=`EXPIRING_SOON/EXPIRED/PENDING/MISSING`; Due Soon=expiry within 14d; Overdue=expiry past) and made `api/dev/seed-family-resident` produce a deterministic scenario that exercises all four: Flu Shot=`CURRENT` (completed), TB Test=`EXPIRING_SOON` expiry +10d (open + due-soon), Care Plan Review=`EXPIRED` expiry −5d (open + overdue) → Open=2 / Completed=1 / Due Soon=1 / Overdue=1, matching the spec. `family-resident-readonly` **un-quarantined**; `family-notifications` only asserts the cards render, so it's unaffected.
- **Note:** the separate operator-facing `/api/.../compliance/summary` route uses a different (looser) bucketing and is out of scope here; revisit if that surface needs exact parity.

### OL-078: Third-party trackers loaded with no cookie-consent gate (privacy/HIPAA exposure)
- **Status:** ✅ CLOSED (2026-06-16, PR `feat/cookie-consent-tracker-gating`).
- **What it was:** `layout.tsx` injected Meta Pixel, Microsoft Clarity, GA4, and GTM unconditionally (gated only by env-var presence, fired `afterInteractive`). The existing `CookieConsent` banner was cosmetic — it only flipped `ga-disable`/`fbq consent` *after* the scripts had already loaded and sent the initial PageView/session. On a HIPAA-positioned site, behavioral trackers fired before consent.
- **Fix:**
  - `src/lib/consent.ts` — shared consent state + `CONSENT_EVENT`. `AnalyticsScripts` (`src/components/analytics/AnalyticsScripts.tsx`, client) injects trackers **only after explicit consent** and reacts to the event (loads on opt-in, no reload). **Nothing fires pre-consent.** Removed the unconditional `<Script>` blocks from `layout.tsx`.
  - **GA4 + GTM:** gated behind `analytics` consent (all pages). Dropped the GTM `<noscript>` (would bypass the JS consent gate).
  - **Microsoft Clarity:** `analytics` consent only; site-wide masking via `data-clarity-mask="true"` on `<body>` (masks all text/inputs); not initially loaded on sensitive routes (auth + resident/care + logged-in app areas). **Founder action:** also set the Clarity dashboard masking to Strict for belt-and-suspenders.
  - **Meta Pixel:** `marketing` consent only; **PageView only** (no custom events in the loader); excluded from logged-in operator/family + health/care routes via `SENSITIVE_PREFIXES`.
  - `CookieConsent` refactored to use the shared helper (Accept All / Necessary Only / Customize) and dispatch the consent event.
- **Verify:** with no stored consent, the network tab shows no requests to googletagmanager.com / connect.facebook.net / clarity.ms until the user opts in. `tsc` clean, build passes, lint clean.

### OL-079: Operator-claim → instant email notification
- **Status:** ✅ CLOSED (2026-06-18, PR `feat/claim-notification`).
- **What it was:** When a home was claimed (operator self-claim onboarding → `ACTIVE`, or admin claim → `PENDING_REVIEW`), the founder had no real-time signal — claims had to be discovered by checking the backend. #576 had added a basic `sendOperatorClaimNotification`, but it sent to `chris@getcarelinkai.com` only, used a plain subject, omitted operator name / timestamp / deep link, had no idempotency on the admin path, and failures were only `console.error`'d (no Sentry).
- **Fix:**
  - `src/lib/email.ts` — `sendOperatorClaimNotification` now: **To** `profyt7@gmail.com` (override `CLAIM_NOTIFY_EMAIL`), **cc** `chris@getcarelinkai.com` (override/disable via `CLAIM_NOTIFY_CC=''`); subject `🎉 New CareLinkAI claim — <facility>`; body includes facility, operator name + email, **America/New_York** timestamp (`Intl.DateTimeFormat` ET), and a deep link to the admin home view (`${NEXT_PUBLIC_APP_URL||NEXTAUTH_URL}/admin/homes/<id>`). Non-blocking + `RESEND_API_KEY` guard preserved; failures now also `captureError` to **Sentry** (`feature: claim-notification`).
  - `src/app/api/operator/homes/[id]/claim/route.ts` — passes `operatorName` + `homeId`. Idempotent by construction (the `seededHomeId` guard means a seeded home can only be claimed once; it's nulled in the same transaction).
  - `src/app/api/admin/homes/[id]/claim/route.ts` — captures `wasAlreadyPendingReview = home.status === 'PENDING_REVIEW'` before the update and only fires the notification on a real transition INTO `PENDING_REVIEW`, so re-claiming/reassigning an already-pending home never double-sends. Passes `operatorName` + `homeId`.
- **No schema migration** (idempotency via state-transition guards, not a dedicated sent-flag column).
- **Residual edge:** two truly-concurrent admin claims on the same home could both observe the pre-update status and double-send; acceptable for a low-volume founder alert (no DB-level dedupe added).
- **Verify:** `tsc --noEmit` clean, `npm run build` passes.

### OL-080: Phone (and capacity) not persisted on AssistedLivingHome by the enrich pipeline
- **Status:** ✅ **CLOSED 2026-06-24 — PR #607 (`5092c85`).** Backfilled on Render: **82 homes now have a phone, 74 a tagline, 8 a contactEmail** (low email count expected — most facility sites Cloudflare-obfuscate or omit it).
- **What:** `AssistedLivingHome` had **no `phone`/`contactEmail`/`tagline` columns**, and the auto-populator (`scripts/autopopulate-cohort.ts`) extracted all three (`extracted.phone` etc.) but **never wrote them** — only counted toward `fieldsExtracted`. So every enriched listing was missing public phone/email/tagline.
- **Fix shipped (#607):** migration `20260624000001_home_public_contact_fields` adds `phone`/`contactEmail`/`tagline` (`String?`); `autopopulate-cohort.ts` persists them with `AI` provenance; `/api/homes/[id]` exposes phone + tagline (contactEmail kept DB-only — operator/admin handoff, not public, to avoid spam-scraping); the public listing renders the tagline + a clickable `tel:` phone; `report-directory-homes.ts` emits the phone column. **`capacity` intentionally NOT auto-written** — site values conflict with DOH (Ohman 58-vs-92, Regina 54-vs-99); reconciliation is OL-059's manual-verify job.
- **Done when:** ✅ enrich stores phone/tagline on the listing, they render publicly, and `report-directory-homes.ts` emits phone. (Capacity reconciliation tracked separately under OL-059.)

### OL-081: Batch-2 cohort punch list (post-cleanup, 2026-06-21)
- **Status:** 🟢 MOSTLY DONE — structural cleanup + name/URL reconciliation + send-ready content all **CLOSED**; only a photo-upload residual remains. The structural cleanup (PR #580, applied on Render `--force`, Applied: 4) — Anthology→**The Ashton at Mayfield Heights**, Villa Serena→**INACTIVE**, "Test Senior Living Cleveland" + "Chris Senior Care Home" **purged**. The 3 held homes' content was landed manually (PR #582, `scripts/enrich-batch2-held-homes.ts --force` on Render 2026-06-21, Applied: 3).
- **Resolved:**
  1. ✅ **Windsor Heights `websiteUrl`** (`cmql0xbos…`) — investigation showed the seeded Sunshine/Beachwood URL was **actually correct** (Sunshine Retirement Living operates Windsor Heights at that page; the "wrong URL" was a misread). UTM params stripped. Address verified 23311 Harvard Rd, Beachwood 44122.
  2. ✅ **Rebrand name reconciliation** — Bickford of Rocky River (`cmql0xbp9…`) → **"Bloom at Rocky River"** (`bloomseniorliving.com/bloom-at-rocky-river/`); Rocky River Village (`cmql0xbpc…`) → **"Meadow Falls of Rocky River"** (`meadowfallsseniorliving.com/rocky-river/`). Names + URLs set in DB.
  3. ✅ **Send-ready content for all 3** — name + official URL + description + care levels + amenities + highlights set via PR #582 (manual copy from official + public listings). All kept DRAFT. **Note on the report:** these show `enriched=no` **by design** — the script sets `aiPopulationConfidence='MANUAL'` but deliberately leaves `autoPopulatedAt` null (manual, not machine-scraped), so the report flag is NOT the right "done" signal here; the populated `description`/`careLevel`/`amenities` are.
     - **Why manual, not the scrape pipeline:** all 3 official sites sit behind WAF bot-protection that 403s datacenter IPs (verified browser-UA); our scraper (`operator-profile-scraper.ts:198`) treats 403 as `BLOCKED` and writes no text, so `autopopulate --with-photos` cannot reach them.
- **Residual (still 🟡 OPEN):**
  1. **No photos** on the 3 held homes — the same WAF block prevents image scraping. They stay photo-less until a **manual Cloudinary upload pass** (or a future scrape via a non-blocked path). Low priority; does not block DRAFT outreach prep.
  2. **The Ashton shows `city=(pending)`** despite `enriched=yes` — one `--addresses-only` pass would backfill its address.
- **Done when:** the 3 held homes have at least a hero photo (manual upload) and The Ashton's address is backfilled. (Name/URL/content reconciliation is complete; Cowork has the final values for `batch2_email_research`.)

### OL-082: Batch-2 founder outreach — send + residuals (2026-06-22)
- **Status:** 🟡 OPEN — **audience loaded, broadcast NOT yet sent.** Send prep ran on Render via `scripts/batch2-send-prep.ts --push` (PR #584, `90950a2`): generated 11 per-home founder claim links (`clevelandFounder:true`, 45-day expiry — links **exp 2026-08-06**, `NEXTAUTH_SECRET`-signed) and loaded the Resend audience **"Batch 2"** (`4a80d88c-97cb-4241-984f-764b69273b89`) with **11 contacts** (all HTTP 201, properties `facility_name` + `claim_link` + `first_name`/`email`). All 11 homes stay **DRAFT**; no email/broadcast sent — **Chris sends from Resend.**
  - The 11: Rose Senior Living Beachwood, Windsor Heights, Beachwood Commons, Solon Pointe, Vitalia Solon, Fairmont of Westlake, Bloom at Rocky River, Vitalia Strongsville, Symphony at Mentor, Vista Springs Ravinia Estate, Jennings at Brecksville.
- **Residuals (still OPEN):**
  1. **HOLD trio needs emails** — Meadow Falls of Rocky River (`cmql0xbpc…`), Embassy of Rockport (`cmql0xbpf…`), The Ashton at Mayfield Heights (`cmql0xbpm…`) are phone-call rows with no email yet. When contacts are found, extend the `HOMES` array in `scripts/batch2-send-prep.ts` and re-run `--push` to add them to "Batch 2". (Villa Serena is out of scope — INACTIVE.)
  2. **Photos for the 3 WAF-blocked homes** — Windsor Heights / Bloom / Meadow Falls still have no photos (WAF blocks image scraping). Cross-ref **OL-081** residual; manual Cloudinary upload.
  3. **Beachwood Commons email unverified** — `asarota@npseniorliving.com` flagged LOW (bounce risk). Verify or replace before relying on the send; it's loaded into "Batch 2" but may bounce.
- **Done when:** the broadcast is sent from Resend, the HOLD trio is emailed (or explicitly dropped), and the Beachwood Commons email is verified/replaced.

### OL-083: Inquiry → Claim "pull" engine + publish-wide directory (2026-06-22)
- **Status:** ✅ **CLOSED 2026-06-23 — Greater-Cleveland directory is LIVE (128 public listings across 6 counties).** The publish-wide rollout + Part B metro seed shipped and the founder ran the full seed→anchor→enrich→publish→cleanup sequence on Render. Sibling of OL-079. *(Note: the founder's ticket called this "OL-082", but that number was already taken by the batch-2 outreach loop above, so it's filed as OL-083.)*
- **Launch result (2026-06-23, Render prod):** 118 metro homes seeded + 138 city/OH address anchors → Places address backfill (117 filled, all in-state) → `publish-directory-homes.ts --force` published **133**, then `hold-crossmatch-homes.ts --force` reverted **5** same-city cross-matches → **128 live ACTIVE listings**. $0 Anthropic spend (Places-only).
- **What it does:** when a family inquires on an **unclaimed/directory-owned** home, the inquiry is **always captured** (existing `Inquiry` row; `/api/inquiries` has no status guard) and surfaces on the operator dashboard the moment they claim (inquiries key off `homeId`, which reassigns on claim — no extra wiring). On top of that capture: a **best-effort notify** nudges the operator to claim.
- **Build:**
  - **Schema (migration `20260622000001_inquiry_claim_outreach_fields`, additive):** `AssistedLivingHome.outreachEmail`, `outreachPhone`, `claimNudgeLastSentAt`.
  - **`src/lib/claim-engine/inquiry-claim-notification.ts`** — `notifyUnclaimedHomeInquiry({homeId, inquiryId})`: self-filters to unclaimed homes (directory sentinel operator `directory-unclaimed@carelinkai.system`); if `outreachEmail` known + not nudged in last 24h, mints a 45-day founder claim link (`signClaimToken`, `clevelandFounder:true`) and sends a **Resend email + Twilio SMS** (reusing existing infra), then stamps `claimNudgeLastSentAt`. Non-blocking, Sentry-tagged `feature: 'inquiry-claim-notification'`, idempotent (24h throttle).
  - **`src/lib/email.ts` `sendInquiryClaimNudgeEmail` + `sms-service.ts` `sendInquiryClaimNudge`** — generic copy ("a family is trying to reach <Facility>… claim to respond securely"); the link IS the CTA.
  - **Public counter:** `/api/homes/[id]` returns `unclaimed` + `pendingInquiryCount` (count of NEW inquiries); `src/app/homes/[id]/page.tsx` shows "N families have inquired — claim to view & respond securely" (or a soft "claim this listing" when 0).
  - **Wire:** one non-blocking call in `/api/inquiries` POST. Unit test for the unclaimed gate.
- **HIPAA:** inquiries may carry PHI (care needs). The email/SMS body and the public counter are **generic only** — facility name + a generic "a family is trying to reach you" / a bare count. Actual inquiry content stays behind auth, revealed only after claim.
- **Publish-wide rollout (2026-06-23): ✅ SHIPPED — 6 PRs merged to main.** The "listings PUBLIC + anonymous capture" ticket that this loop depended on is done:
  - **#588 (C9)** soften compliance claims → "HIPAA-aligned safeguards".
  - **#589 (A2) anonymous capture — `Inquiry.familyId` now nullable** (migration `20260623000001_inquiry_nullable_family`). Public anonymous inquiries no longer 400; entire inquiry surface guarded for null-family; conversion blocked until linked.
  - **#590 (A1)** search badges unclaimed/directory listings (`isUnclaimed` via `isUnclaimedHome()`).
  - **#591 (C8)** `scripts/pre-publish-test-demo-sweep.ts` (dry-run default).
  - **#592 (C7)** `scripts/publish-directory-homes.ts` — quality-gated DRAFT→ACTIVE publisher (dry-run default).
  - **#593** branded `HomeImagePlaceholder` + photo-aware "Claim & add photos" nudge.
- **Follow-ups (non-blocking, post-launch):**
  1. **~24 directory homes held without addresses** — ✅ **largely resolved 2026-06-24 (night).** Two verified-address batches shipped + published: **Batch A** (#611, `backfill-verified-addresses.ts`) wrote addresses to 11 OPEN current-name homes; **Batch B** (#612, `rebrand-and-address-batch-b.ts`) renamed + addressed 11 rebranded homes; **#613** cleaned the one stale description (Eliza). `publish-directory-homes.ts --force` then took **22 DRAFT→ACTIVE**. Remaining held: **Altercare St Joseph** (CLOSED 2019 → see OL-088), **Brookdale Medina North** (address medium-confidence → see OL-089), **Princeton Place** (no confident OH match), **Montefiore** (now SNF, out of AL/RCF scope per OL-090 policy). _Original detail:_ two groups — (a) ~9 *correct* homes held on a city-label technicality where Google's municipality ≠ the seeded city; (b) un-anchored older Tier-A names not in the metro list hitting the "no seeded state" guard.
  2. **5 same-city cross-matches held** via `hold-crossmatch-homes.ts` (reverted to DRAFT, street/zip cleared): Brookdale Gardens at Westlake, Homestead I, StoryPoint Medina West, Elmcroft of Medina, Gardens of Western Reserve. Need a correct address (or operator claim) before re-publish.
  3. **20 SNF-primary rows** held out of the seed pending `ltc.ohio.gov` verification — re-run `seed-cleveland-metro.ts --include-unverified` for any that carry a real AL/RCF wing.
  4. **Text-enrich — ✅ DONE 2026-06-23 (evening).** URLs cleaned via `verify-directory-websites.ts` (#601: 12 nulled rebrands, 11 refreshed, 95 kept) + 2 manual name-collision nulls (Princeton Place→LA, Vista Springs Macedonia→Ravinia), then `autopopulate-cohort.ts --from-db --include-unpopulated --include-active --force` enriched 90/105 (HIGH/MEDIUM), $8.47, **text only**. See OL-084 (13 JS-rendered homes still un-enriched) and OL-085 (photos never imported).
  5. **Populate `outreachEmail`/`outreachPhone`** so the claim-nudge email/SMS fires (currently only the public counter path is active).
  6. **Anonymous-inquiry → family link-by-email** and **AI triage auto-ack** — deferred to a later phase.
- **Done when:** ✅ DONE — directory live with 128 listings. Remaining items above are incremental polish, not blockers.

### OL-084: Headless-browser scrape for JS-rendered directory homes
- **Status:** 🟡 OPEN — **deferred 2026-06-23 (founder decision)** as a larger infra task; not a same-night change.
- **What:** 13 directory homes returned **empty `<html></html>`** to the current scraper (`operator-profile-scraper`) because their sites are JS-rendered or bot-blocking, so the AI enrich produced LOW/`"<UNKNOWN>"` output. After cleanup they carry **seed-based fallback descriptions** (name + city + care levels), not real content. The homes: **Meadow Falls of Rocky River, Windsor Heights, Homestead I, Homestead II, Oaks of Brecksville, Brookdale Bath, Mulberry Gardens, St. Luke Lutheran (Portage Lakes), Marymount Place** (the 9 repaired `<UNKNOWN>`), plus **Grande Village Suites, Grande Village Villas, East Park Retirement Community** (LOW but real-ish corporate/hero text, left as-is) and **Brookdale Willoughby** (cleaned — wrong-page generic content + 20 bogus amenities removed; its URL is a Wickliffe mismatch needing a correct community page). Also re-check the 2 **blocked** homes: Legacy Place-Parma (404 — dead URL) and Ivy House (403 — bot block).
- **Why it matters:** these listings are public (ACTIVE) with thin fallback text; richer content improves SEO + claim conversion.
- **2026-06-23 investigation (where a browser can run):** `@playwright/test` is a **devDependency only** and the production Docker image (`docker/Dockerfile`) has **no Chromium**, so the **Render container cannot run a headless browser**, and the Render shell can't `git pull` to add one ad-hoc. CI *does* have Playwright (the e2e jobs run `npx playwright install --with-deps`) and a `secrets.DATABASE_URL`, **but** the e2e workflows carry an explicit warning — *"NEVER point at prod … this is how 43 test homes leaked into production"* — so a CI-writes-to-prod scraper cuts against a known scar. Three viable paths weighed: **(A)** a gated `workflow_dispatch` Action (Playwright render → extract → write to prod, dry-run default + explicit apply input, scoped to the directory operator + #602's LOW-skip guard; the dry-run doubles as a test of which sites a browser actually recovers); **(B)** add Chromium to the prod Docker image (`playwright-core` + `@sparticuz/chromium`) + a `--render` flag in the scraper, run from the Render shell — heavier image/build/memory; **(C)** defer. **Founder chose C.** When picked up, **A is the recommended path** — least infra bloat, and the dry-run de-risks the unknown (some of these sites may be Cloudflare-hard-blocked, not just JS-rendered).
- **Note:** #602 (`50c720d`, merged) **skips DB writes for LOW-confidence extractions**, so a future enrich won't re-clobber these — but it also won't improve them until the scraper can render JS. These homes are **un-stamped** (`autoPopulatedAt` null) so they're cleanly retryable.
- **Done when:** the JS-rendered homes return real HTML and re-enrich to HIGH/MEDIUM, or are explicitly marked JS_ONLY/BLOCKED with a note.

### OL-085: Photo import for the Greater-Cleveland directory cohort
- **Status:** ✅ **DONE 2026-06-23 (evening).** `autopopulate-cohort.ts --from-db --include-active --photos-only --force` run twice on Render (initial 398 photos, then **417** after OL-086 landed). 93 homes processed; ~74 have ≥1 Cloudinary photo, the rest are logo-only sites (classifier kept 0). $1.43 Anthropic per run. The 12 un-stamped JS-rendered homes were excluded from selection (no scrapable images — see OL-084).
- **What:** Run the photo pipeline over the enriched directory homes: `autopopulate-cohort.ts --from-db --include-active --photos-only --force` (classifies candidate images, downloads + re-hosts to **Cloudinary**, idempotent — clears prior `autoPopulated` photos first).
- **Cost/infra note:** image classification adds ~$1.43 Anthropic per full run on top of Cloudinary storage (within free tier). **Render shell can't `git pull`** — the script is already on deployed main, so it runs as-is; do ad-hoc tweaks via inline `npx tsx -e`.
- **Done when:** ✅ directory homes with scrapable galleries have ≥1 Cloudinary-hosted `autoPopulated` photo.

### OL-086: AVIF/HEIF support in the photo-rehost pipeline
- **Status:** ✅ **DONE 2026-06-23 (evening) — PR #604 (`8c6088f`).**
- **What:** The first photo run left **East Park** and **Merriman** (Webflow sites serving **AVIF**) with 0 photos — `photo-rehost.ts`'s `sniffImageType` only accepted JPEG/PNG/GIF/WEBP, so every AVIF was rejected as "not a decodable image". A few 5–8MB facility JPEGs (Rockynol, Nason) were also skipped by the old 4MB cap.
- **Fix:** `sniffImageType` now detects ISO-BMFF (`ftyp` brand → `avif`/`heic`) and the download loop transcodes those to JPEG via **sharp** (already a prod dep; libheif present) before upload; size cap raised 4MB → 12MB (Cloudinary's incoming transform still bounds the stored asset to 1600px).
- **Verified:** after deploy, the photo re-run uploaded **East Park 8/8, Merriman 8/8, Rockynol 8, Nason 8** — total directory photos 398 → **417**.
- **Done when:** ✅ AVIF-serving homes upload photos.

### OL-087: Directory claim-flow hardening (defense-in-depth)
- **Status:** 🟡 OPEN — logged 2026-06-23. Not urgent; current guardrails already block the "random competitor grabs a listing" scenario.
- **Current guardrails (verified 2026-06-23, already solid):** Claims require an **HMAC-signed token** (`src/lib/claim-token.ts`, signed with `NEXTAUTH_SECRET` — unforgeable). `/api/operator/claim` enforces **token.operatorEmail === logged-in user's email** (can't use someone else's link). `/api/operator/homes/[id]/claim` transfers ownership only if **`operator.clevelandFounder === true` AND `operator.seededHomeId === homeId`** — so you can only claim the *one* home your token was minted for; there is **no "claim arbitrary listing by ID" path**. Minting is admin-only (`/api/admin/homes/[id]/claim-link`) or via the nudge engine (emails the link to the facility's researched `outreachEmail`). Image-rights ack required if the listing has scraped photos; every claim fires a real-time admin notification; 50-founder-per-metro cap.
- **Residual risk this loop addresses:** the model **trusts whoever controls the minted email**. (1) If a link is minted to a wrong/generic email (bad research data) or a bad actor controls the facility's listed email, they could claim. (2) Claims take effect **immediately** (detection-after via the admin notification, not approval-before). (3) There is **no listing content-version history** — a bad post-claim edit can't be one-click reverted (we have `autoPopulatedVersion` but not full content snapshots).
- **Proposed hardening (pick per appetite):**
  1. **Domain-match guard** — at mint and/or claim, warn/block when the claim email's domain doesn't match the facility's `websiteUrl` domain (skip for generic mailbox providers).
  2. **PENDING-review gate for directory claims** — directory-sentinel claims land in a `PENDING` state requiring a quick admin OK before the listing flips to the new owner (approval-before instead of detection-after).
  3. **Listing edit-history / snapshots** — capture description/amenities/careLevel/photos versions so a defaced listing can be rolled back; pairs with an admin "revert to version N" action.
- **Done when:** at least the domain-match guard + a rollback path exist, or the founder explicitly accepts the current email-trust model as sufficient and closes this.

### OL-088: Archive closed facility — Altercare at Saint Joseph Center
- **Status:** ✅ CLOSED 2026-06-25 — `archive-stale-directory-homes.ts` (#615) set it INACTIVE on Render (founder ran `--force`); permanently non-publishable now.
- **What:** "Altercare at Saint Joseph Center" (id `cmqqrk7gu0006rlmb2nfqnrvn`) is **CLOSED since Nov 2019** (Crain's + Cleveland Jewish News). It was deliberately excluded from the Batch B rebrand PR (#612). Right now it stays out of the public directory **only because it has no street/zip** — the publish gate holds it. That's incidental, not intentional: if anyone later backfills an address, it would publish a defunct facility.
- **Done when:** the home is given an explicit non-publishable status (archived/closed flag, or hard-deleted) so it can never flip to ACTIVE, independent of whether it has an address.

### OL-089: Re-verify Brookdale Medina North → Medina Pointe address, then publish
- **Status:** ✅ CLOSED 2026-06-25 — address re-verified to two sources (49-A Leisure Ln, Medina 44256; Sinceri's Medina Pointe Senior Living), added as Batch B's 12th target (#615), renamed + addressed + published on Render → directory reached 168.
- **What:** "Brookdale Medina North" (id `cmqqrlg91005krlmbyqjdxy5t`) is a real OPEN home that has rebranded to **Medina Pointe Senior Living**, but the address found during Batch B was only **medium-confidence**, so it was intentionally held out of #612. Held today by missing street/zip.
- **Done when:** address re-verified against the operator site + a 2nd source, applied (extend the Batch B script's TARGETS or a one-off), and `publish-directory-homes.ts --force` takes it ACTIVE (→ +1 listing).

### OL-090: AL/RCF-only publish policy (codified) + verified-address batches
- **Status:** ✅ CLOSED 2026-06-24 (night).
- **What shipped:** **#609** gates public phone to operator-claimed homes only (unclaimed listings show the inquiry path, protecting the claim-nudge funnel). **#610** codifies an AL/RCF-only publish policy directly in `publish-directory-homes.ts` — homes with no ASSISTED/MEMORY_CARE careLevel (SNF-primary) are skipped and stay DRAFT (Cedarwood Plaza, Gardens of Western Reserve held on the go-live run). **#611/#612/#613** delivered the verified-address + rebrand + stale-description batches that unblocked the publish (see OL-083 follow-up #1). Net go-live: **22 DRAFT→ACTIVE**.
- **Note:** rename safety confirmed — home detail routes are id-based, `name` is non-unique, directory homes have no slug, so renaming a published listing is non-breaking.

### OL-091: Duplicate directory listings (same facility seeded twice)
- **Status:** ✅ CLOSED 2026-06-25 — the DRAFT-pending Ohman-at-Briar twin was archived via #615; then Cowork's research surfaced 5 more ACTIVE duplicate pairs, all resolved by `dedupe-directory-homes.ts` (#617, founder ran `--force`): Briarcliff Manor=Ohman at Briar, Harbor Court=Meadow Falls of Rocky River, Cuyahoga Falls Danbury Woods=Danbury Woods, Solon Pointe=Solon Pointe at Emerald Ridge, Sunrise at Shaker Heights=The Woodlands of Shaker Heights, Ohman at Holly=Holly Hill. Directory 168→**163**. Keeper-must-be-ACTIVE guard ensured no facility was orphaned.
- **Residual:** Nason Center of Breckenridge Village vs Ohio Living Breckenridge Village left for manual review (possible-only; Nason is the SNF health center, likely a distinct unit) — see OL-093.

### OL-092: Claim-nudge — pilot + scale wave SENT; now measuring
- **Status:** 🟢 SENT — measurement pending. **Pilot** SENT 2026-06-25 (13 HIGH). **Scale wave SENT 2026-06-26** via `send-claim-nudges.ts --tier medium --force`: **28 collapsed emails → 46 homes, 0 failed** (all Resend-accepted), after `COMPANY_POSTAL_ADDRESS` was set in Render (6545 Market Ave N, Ste 100, Canton OH 44721). **Total: ~59 unclaimed homes contacted across ~41 operators.** Outreach data finalized via the SEND_READY backfill (`load-outreach-send-ready.ts`, #621): 59 verified emails; 5 hard-bounced → CALL-ONLY; 4 dup + 10 hold suppressed.
- **Sender hardened for scale (2026-06-26):**
  - ✅ **Collapse by unique email** (#624) — `send-claim-nudges.ts` now sends ONE email per address; a shared inbox gets a single email listing every community with its own claim link. Preview: 59 homes → **41 unique sends** (csig→6, oneillhc→5, meadowfalls→4, judson→3…). 24h throttle is now per-address; INACTIVE excluded.
  - ✅ **CAN-SPAM** (#624) — `EmailSuppression` model + migration `20260626000001_email_suppression`; one-click unsubscribe route `/api/outreach/unsubscribe` (signed token, `List-Unsubscribe` + RFC 8058 headers); sender skips suppressed addresses every run. Email footer carries the unsubscribe link + company physical address + clear sender identity.
  - ✅ **Multi-home claim** (#625, OL-095) — new `/claim?token=` landing lets one operator claim ALL their listings from the collapsed email.
- ✅ `COMPANY_POSTAL_ADDRESS` set in Render; sender hardened (#624 collapse + CAN-SPAM) and multi-home claim shipped (#625) before the send.
- **Gap-fill (2026-06-26, #640):** 5 VA-sourced (Anita), phone-verified operator emails backfilled via `scripts/backfill-va-operator-emails.ts` (founder ran `--force`: 5 applied) — Arden Courts Parma (`ncosta@arden-courts.com`, replaced dead promedica.org), Village of the Falls (`hcorwin@sprengerhealthcare.com`, replaced bounced hjohnson@), The Residence of Chardon (`cagardner@sonidaliving.com`), Danbury Woods (`mcollage@danburyseniorliving.com`, kept-dup), O'Neill Lakewood (`administrator.lw@oneillhc.com`, upgraded from Dir.sales@). All tagged `preFilledFields.outreachEmail='MEDIUM'` + status ACTIVE → queued for the **next** `--tier medium` send (24h per-address throttle protects re-sends). Excluded CALL-ONLY: Arden Courts Bath (HR inbox), Concordia at Sumner (no email). CAN-SPAM re-verified end-to-end (unsubscribe→`EmailSuppression` upsert + postal hard-gate) — no code change needed.
- **What's next:**
  1. **Measure (~3–5 business days):** `npx tsx scripts/report-claim-funnel.ts` (#619) — now covers all ~59 (pilot + scale wave). Opens/clicks live in the Resend dashboard.
  2. **Watch for bounces:** a few generic `info@` inboxes may hard-bounce; Resend auto-suppresses them. (Optional follow-up: sync Resend bounces into our `EmailSuppression` table so our own re-runs also skip them.)
  3. **Then the long tail:** the ~78 phone-only homes become a VA call list (`report-directory-homes.ts --csv`).
- **Done when:** claim conversion measured; healthy operators onboarded. (Pilot + scale wave both SENT — the build/send arc is complete.)

### OL-095: Multi-home claim from one collapsed email
- **Status:** ✅ CLOSED 2026-06-26 (#625). The collapse (#624) sends a shared-inbox operator one email with N claim links; the single-use `seededHomeId` guard previously let them claim only the first. New `/claim?token=` landing page verifies the signed token and, for the already-signed-in addressed operator, re-arms `seededHomeId` (existing `/api/operator/claim`) → onboarding step 2 claims it (image-rights ack + transfer). First-timers fall through to the unchanged register/redeem flow. Sentinel-owned safety check; transfer endpoint + its e2e untouched.

### OL-096: INCIDENT — demo/test homes leaked into prod directory (resolved)
- **Status:** ✅ CLOSED 2026-06-26 (#629 + #630). **11 demo/test homes were ACTIVE in the production directory, ranking on family `/search`.** Archived (status → INACTIVE, NOT deleted — kept for the OL-068 How-To recordings) via `scripts/archive-demo-test-homes.ts --force`: directory dropped from 155 → **144 real OH "Unclaimed Listings" homes**; re-run dry-run confirmed 0 junk remaining.
- **The 11:** E2E Test Home, DeepAgent Test Home, Sunshine Care Home (CA), and 8 out-of-state city homes (Sunny Meadows/MA, Harbor View/FL, Peaceful Pines/CO, Rose Garden/OR, Golden Years/IL, Veterans Care/CA, Lakeside Rehab/WA, Comfort Care/AZ) — operators "Sunshine Valley Care" / "CareLink Services Inc."
- **Root cause:** the CLI seed scripts had **no production guard**, so running a demo/test seed against the prod `DATABASE_URL` (e.g. on the Render shell) injected test data. CI e2e was already safe (seeds a localhost Postgres — the June "43 test homes" fix holds).
- **Guard shipped (#629):** `prisma/seed-guard.ts` `assertSeedAllowed()` refuses to run unless the target DB host is local, unless `ALLOW_PROD_SEED=1`; wired into seed-e2e / seed-simple / seed-demo. Plus a data-layer guard inside `runDemoSeed()` (blocked in prod unless `ALLOW_DEMO_SEED_IN_PROD=1`). **Rule going forward: demo/test seeds only run with a local DATABASE_URL** (or an explicit allow-flag for a known non-prod remote).
- **Also fixed (#629):** `/search` `useSearchParams()` wrapped in `<Suspense>` — a cold first load was intermittently hitting the global "Something went wrong" error boundary and only working on retry.
- **Reversal:** to restore a demo home for recording, flip its status back to ACTIVE (the rows are intact).

### OL-097: Family-facing production fixes — public browse + map coords + price markers (resolved)
- **Status:** ✅ CLOSED 2026-06-26 (#633 C, #634 B, #635 A). Three getcarelinkai.com family-facing issues.
- **A — anonymous public browse (#635):** logged-out families hitting `/search` or `/homes/[id]` were redirected to `/auth/login` (member `DashboardLayout` client-redirect; `/homes/[id]` also edge-blocked) — a login wall on what should be public. Fix: new `PublicShell` (minimal anon chrome) + `BrowseShell` (session-aware: authenticated → DashboardLayout, anon/loading → PublicShell); `/search` + `/homes/[id]` wrap in BrowseShell; `/homes` added to middleware public lists; anon Save → signup toast (signup only at save/inquiry, never a browse wall); server-side auth-gate layouts added for `/background-checks` + `/messages`. **A#1 verified: production does NOT leak sessions** — anon gets no session (mockSession null in prod, mocks ADMIN-only); the observed "demo.family on /search" was a sticky browser cookie, not a leak. **A#4 (founder TODO): rotate the demo.\* prod passwords** (low urgency; no auto-login / no data exposure).
- **B — wrong map coordinates (#634):** ALL 144 ACTIVE homes had NULL `Address.latitude/longitude` (seed never geocoded), so `/api/search` fell back to a city table / centroid → everything clustered in central Ohio (East Park showed 40.42,-82.84). Fix: `scripts/audit-home-coordinates.ts` flagged all 144 (out of metro box) and `--force` re-geocoded each via Google Places, writing only in-box results: **144 fixed, 0 skipped** (~$5 one-time). Map now shows real NE-Ohio locations live (no deploy needed — `dbCoords` wins). Fallback default also repointed central-OH → Cleveland-metro (future coord-less homes stay local).
- **C — price markers (#633):** unclaimed (no-price) listings showed a confusing `$?` map bubble and `$0 - $0/mo` card. Fix: map marker shows the facility initial when no price; popup + card show "Price on request".
- **Known follow-up (out of scope today):** the `/homes/[id]` favorite button is a local no-op stub (doesn't persist) — separate pre-existing bug if detail-page saves are wanted.

### OL-098: Family `/search` polish — distinct placeholders + full-result map (resolved)
- **Status:** ✅ CLOSED 2026-06-26 (#637 map markers, #638 placeholders). Two `/search` UX issues.
- **Placeholders (#638):** 73 of 144 listings had `primaryPhoto=null` and all rendered the SAME generic kitchen. Root cause (confirmed via Cloudinary search): the 12 `carelinkai/homes/home-1..12` assets were **11 byte-identical copies** of one image (97,608 B each except home-2). Fix: uploaded **12 distinct senior-living images** to `carelinkai/placeholders/placeholder-1..12` (Pexels, commercial-free, no attribution — 6 founder-vetted exteriors/gardens + 6 curated interiors) and replaced the page-position `HOME_IMAGES[i % len]` with `placeholderImageFor(home.id)` (djb2 hash → stable per home, varied grid). Real `home.photos[0]` still preferred. **Sourcing note:** the agent can't render images in-sandbox; Cloudinary fetched the URLs server-side, and the 6 swapped images were founder-eyeballed before merge. Old `home-*` assets left in place (reversible).
- **Map all markers (#637):** Map view only plotted the current page (10 of 144). Fix: `/api/search?markers=1` returns an unpaginated lightweight marker set (capped 1000); `search/page.tsx` fetches it in map mode while grid/list stay paginated.
- **Preceding enrichment (founder Render run):** `autopopulate-cohort.ts --photos-only --force` added **418 real Google Places photos across 93 homes ($1.42)**; ~18 of those still have 0 photos (Canterbury Commons, Embassy of Rockport, Fairmont of Westlake, Rose Senior Living Beachwood, both Solon Pointes, Briarcliff Manor, Heritage of Hudson, NCR Portage Trail, Plum Creek, Sanctuary Wadsworth, Gardens of Western Reserve, Bloom at Rocky River, Cedarwood Plaza, both Kemper Houses, Avenue at Macedonia, Wesleyan Village) → now covered by placeholders.
- **Follow-ups (optional):** residual ~18 photo-less homes could get a 2nd Places pass or manual photos; prune superseded old-version placeholder assets + original `home-*` set from Cloudinary if desired.

### OL-099: Unclaimed-listing enrichment — images, descriptions, empty states, Google rating badge
- **Status:** 🟡 MOSTLY DONE 2026-06-27 (#642–#648). Honest enrichment of sparse unclaimed directory listings (overarching rule: never fabricate facility specifics; general info clearly labeled; real data overrides).
- **Done:**
  - #642 — /search badge overlap fixed (% Match only with real personalization; badges stack).
  - #643 — detail hero placeholder + "Representative photo" caption (shared `src/lib/placeholder-images.ts`).
  - #644 — rating coverage: **90%** of homes have a Google rating (avg 4.24★, median 43).
  - #645/#647 — facts-only description generator + script; founder ran `--force`: **25 sparse homes written**, tagged `preFilledFields.description='AI_PUBLIC_DATA'` (clean overwrite on claim).
  - #646 — warmer/honest amenities + pricing empty states (general "typical for [care level]", no invented numbers) + claim CTA.
  - #648 — Google rating badge: migration `20260626000002` (`googleRating/googleRatingCount/googlePlaceId/googleRatingUpdatedAt`) + `backfill-google-ratings.ts` + `GoogleRatingBadge` on cards (attribution-only) + detail ("See reviews on Google" link). Rating + count + place id only — **no review text** (Maps ToS).
- **Google ratings — DONE 2026-06-27:** founder ran `backfill-google-ratings.ts --force` → **133/144 rated** (8 weak skipped, 3 cleared); badge live. ⚠ Brookdale Gardens at Westlake / Brookdale Westlake Village share one Google place id (possible duplicate) → flagged for OL-093 dedup review.
- **DONE — #5 first-party reviews (#650/#651/#652):** **5a** (#650) — `HomeReview.operatorResponse` + migration `20260627000001`; POST eligibility broadened booking-only → **inquiry/tour/booking** (booking → `isVerified`); operator-reply endpoint `POST/DELETE /api/reviews/homes/[id]/response`; unit tests updated (20/20). **5b** (#651) — real `HomeReviews` section on the listing ("No reviews yet — be the first" empty state, eligible-family submit form, inline operator replies, privacy-safe identities), replacing the legacy mock block. **5c** (#652) — `/api/homes/[id]` returns `viewerIsOwner`; owning operator gets an inline "Respond as the operator" reply form; claim pitch advertises "showcase & respond to reviews". No third-party review text stored/shown (Maps/APFM/Caring ToS). First-party → every listing starts empty and accrues from real CareLinkAI families.
- **OL-099 fully delivered** (#642–#648 + #650–#652); all founder Render runs done.

### OL-093: Remaining directory data-quality (rebrands, SNF/category, stale URLs)
- **Status:** 🟡 OPEN — mostly resolved 2026-06-25; 2 items remain.
- **Done this session:**
  1. ✅ **Rebrand renames** — `rename-rebranded-homes.ts` (#619, founder ran `--force`) renamed the 12 ACTIVE listings to current brands (Eden Vista Stow, Saint Therese of Westlake, StoryPoint Shaker Heights, Lorain Estates, Maple Ridge, Middleburg Heights Assisted Living, etc.). **Held:** Brookdale Richmond Heights→Richmond Heights Place (confirm operator).
  2. ✅ **SNF/category + HOLD review** — `archive-hold-resolved-homes.ts` (#622, founder ran `--force`) archived **6 pure-SNF** (Park East, Oaks of Brecksville, Heritage of Hudson, Avenue at Macedonia, Landerbrook, Heather Knoll) + **3 dups** (Legacy Place-Twinsburg→keep Canterbury Commons; Nason→keep Ohio Living Breckenridge Village; Sunrise already INACTIVE) → INACTIVE. **Nason/Breckenridge resolved** (Nason archived). Directory settled to **~155 ACTIVE**.
- **Remaining:**
  1. **Stale/wrong website URLs (3)** — Ivy House (magnoliaresidence URL wrong → ivyhouseassistedliving.com), Brookdale Willoughby/Maple Ridge (points to brookdale-wickliffe), Homestead I (Saber URL is the wrong record).
  2. **Brookdale Richmond Heights → Richmond Heights Place** — held rename pending operator confirmation.
- **Done when:** the 3 URLs corrected; Richmond Heights rename confirmed + applied.

### OL-094: The Elms / Hudson Elms — confirm AL wing still admitting (ops call)
- **Status:** 🟡 OPEN — non-engineering. Kept ACTIVE as CALL-ONLY in the 2026-06-25 HOLD review.
- **What:** "The Elms Assisted Living" (id `cmp71kmty002mlpion9nyi9d2`, Hudson) has a real 25-suite AL wing (+50 SNF), but the brand now markets as "Hudson Elms Skilled Nursing & Rehab." Before actively promoting it (or building outreach), one phone call to confirm the AL wing is still admitting.
- **Done when:** founder/VA confirms AL availability by phone; promote or retire accordingly.

### OL-027: Provider listing fee ($99/mo)
- **Status:** ✅ CLOSED (2026-05-02)
- Schema fields + migration, Stripe Checkout + Customer Portal APIs, webhook handler, visibility gate in marketplace API, billing UI at `/settings/provider/billing`. Requires `STRIPE_PRICE_PROVIDER_LISTING` env var in Render.

### OL-028: Pro Caregiver tier ($19/mo)
- **Status:** ✅ CLOSED (2026-05-02)
- Schema fields + migration, Stripe Checkout + Customer Portal APIs, webhook handler, `isPro: desc` search boost in all sort orders, ★ Pro badge on CaregiverCard, billing UI at `/settings/billing`. `applicationCount` tracked — enforcement (block/reset cron) still pending. Requires `STRIPE_PRICE_PRO_CAREGIVER` env var in Render.

### OL-029: Background check markup
- **Status:** ✅ CLOSED (2026-05-02)
- BackgroundCheckOrderPanel: ENHANCED $34.99, MVR $19.99, PREMIUM $59.99. Basic remains $0 (lead magnet).

### OL-030: Raise placement fee — update PLACEMENT_FEE_CENTS to $1,500 in Render
- **Status:** ✅ CLOSED (2026-05-02) — Chris updated `PLACEMENT_FEE_CENTS` to `150000` in Render dashboard. Placement fee is now $1,500.

### OL-031: Application cap enforcement for basic caregivers
- **Status:** ✅ CLOSED (2026-05-03)
- POST route blocks at 10 apps with 403 + `upgradeRequired: true`; `applicationCount` incremented on every submit; monthly reset cron at `/api/cron/reset-application-counts` (Render cron `0 0 1 * *` created); `ListingActions.tsx` shows Pro upsell banner with CTA to `/settings/billing`.

### OL-036: Marketplace filter slug alignment for existing providers
- **Status:** 🟡 OPEN — requires production action
- **What:** Provider settings service type slugs changed from underscore to hyphen format (2026-05-04). Existing providers in production DB have old `personal_care`, `home_care` etc. stored. They need to re-save their settings page to update. Also: run `npx prisma db seed` in Render shell to populate new marketplace categories.
- **Done when:** Demo provider re-saves settings, all new categories appear in marketplace filter.

### OL-032: Family subscription tier ($19/mo "CareLinkAI Plus")
- **Status:** ✅ CLOSED (prior session — exact date unknown)
- `plusStatus` + `isPlus` on Family model; `POST /api/family/billing/subscribe` (Stripe Checkout); `POST /api/family/billing/portal`; webhook syncs `plusStatus` on subscription events; billing UI at `/settings/family/billing` with feature list ($19/mo, 14-day trial); Plus nav item in sidebar with amber highlight; admin MRR tile shows `familyPlusMRR`. Requires `STRIPE_PRICE_FAMILY_PLUS` env var.

### OL-042: Operator transport bundle / subscription pricing
- **Status:** 🟡 ROADMAP — build after 2-3 operators are running 15+ rides/month
- **What:** Optional "Transport Pass" add-on to operator SaaS subscription. Facility pays $X/month for Y rides; CareLinkAI fulfills at provider rates and pockets the margin. Requires knowing real usage patterns before pricing correctly.
- **Why not now:** Need provider supply depth to guarantee fulfillment before selling bundles. Current transactional model is correct for families and early-stage operators.
- **Done when:** 2-3 operators actively using transport → price a pilot bundle → build billing UI + ride quota tracking.

### OL-043: Provider compliance-as-a-service
- **Status:** ✅ CLOSED (2026-05-05)
- Provider credentials UI at `/settings/provider/credentials` (8 types, status lifecycle). Admin credentials queue at `/admin/credentials` (Verify/Reject with reason). Expiry cron `GET /api/cron/credential-expiry` marks EXPIRED + deactivates critical-type providers + sends 30-day warning emails. CareLinkAI Certified badge (3+ VERIFIED) on ProviderCard + provider detail page. Render cron registered `0 6 * * *`. PR #515.

### OL-044: Guaranteed Ride SLA
- **Status:** 🟡 ROADMAP — positioning differentiator, needs supply depth first
- **What:** "If we miss a ride, it's free + $50 credit." Requires: fallback provider network, SLA breach detection (cron checks rides 30 min before scheduled time with no driver confirmed), automatic credit issuance.
- **Why it matters:** Nobody in NEMT confidently offers this. Becomes a no-brainer for facilities choosing between CareLinkAI and legacy brokers.
- **Done when:** Fallback network exists (3+ providers in market) + SLA breach cron + credit logic built.

### OL-045: SMS text-to-book dispatch
- **Status:** 🟡 ROADMAP — requires Twilio + NLP integration
- **What:** Staff texts "Ride for Margaret tomorrow 2pm to Cleveland Clinic dialysis" → system parses and books. No app required. Removes last barrier for non-tech staff at facilities.
- **Done when:** Twilio webhook parses inbound SMS → confirms booking → replies with confirmation text.

### OL-046: Medicaid / payer billing architecture
- **Status:** 🟡 ROADMAP — design now, build when first payer contract is in hand
- **What:** Trip verification data (actualPickupAt, actualDropoffAt, GPS) formatted for Medicaid claim submission. Prior authorization workflow. Eligibility verification before booking. EDI 837 claim format or broker API (Modivcare, MTM).
- **Why:** This is where the real scale is — $16B NEMT market runs through payer contracts, not consumer credit cards. Current schema (trip verification, ride classification, no-show cause) is designed to support this.
- **Done when:** First payer/broker contract signed → build claims pipeline.

### OL-047: Health outcomes data layer
- **Status:** 🟡 ROADMAP — long-term strategic asset
- **What:** Aggregate: missed appointment rate, ride frequency, no-show patterns. Generate report: "CareLinkAI reduced missed appointments by 18% for [Facility]." Sell this story to Medicare Advantage plans as a readmission-reduction tool.
- **Done when:** 6+ months of ride data + reporting dashboard built for facility admins.

### OL-033: Corporate elder care B2B (employee benefit)
- **Status:** 🟡 ROADMAP — requires sales conversations before build
- Pitch HR departments: $X/employee/month. One mid-size company = $5K-20K/year MRR spike.

### OL-034: Caregiver CE training / certification courses
- **Status:** 🟡 ROADMAP — partnership-dependent
- $15-30/course for CE credits. Partner with accredited CE provider.

### OL-035: Insurance/benefits navigation service
- **Status:** 🟡 ROADMAP — needs human process designed first
- Flat-fee ($99-199) for Medicaid waiver, VA Aid & Attendance, LTC insurance claims navigation.

### OL-039: Add Render cron for recurring rides
- **Status:** ✅ CLOSED (2026-05-04) — Chris registered cron in Render dashboard: `0 7 * * *` → `/api/cron/recurring-rides`. Endpoint live.

### OL-040: Transport migration 20260504000006 deploy
- **Status:** ✅ CLOSED (2026-05-04) — PR #512 squash-merged to main. Migration auto-runs via `start` script (`npm run migrate:deploy && node .next/standalone/server.js`). No manual Render shell step needed.

### OL-041: Provider reliability score dashboard
- **Status:** ✅ CLOSED (2026-05-04) — Built in full: `src/lib/rideStats.ts` (transport-only gate, weighted score 60% completion + 40% on-time), provider dashboard 4th tile + Ride Dispatch quick action, marketplace provider detail reliability section with progress bars, API route returns `rideStats`. PR #512 merged.

### OL-038: Transport migration 20260504000005 deploy
- **Status:** ✅ CLOSED (2026-05-04) — PR #512 squash-merged to main. Migration auto-runs via `start` script. `vehicleCapacity` and shared ride fields live in production.

### OL-037: Provider real-time new booking notification
- **Status:** ✅ CLOSED (2026-05-05)
- 30-second interval on `/rides` page (PROVIDER role only). `knownRequestedIds` ref seeded on initial load to prevent false alarms. `pollRides` callback diffs new REQUESTED ids → shows toast for genuinely new arrivals. PR #513.

### OL-026: Transport Phase 2 — ride booking + dispatch
- **Status:** ✅ CLOSED (2026-05-04)
- Full end-to-end ride booking live: REQUESTED→CONFIRMED→PAID→IN_PROGRESS→COMPLETED→CANCELED lifecycle. Stripe Checkout payment, 12% platform commission, Stripe refund on PAID cancellation, 5 email triggers, day-of reminder cron, operator resident booking, admin MRR tile, landing page updated. Ride model with 2 migrations deployed.

### OL-048: Prisma migrations 20260505000001/2/3 + 20260506000001 pending on Render DB
- **Status:** 🔴 OPEN — four schema changes not yet deployed to production
- **What:** `aiReviewStatus/Notes` on `ProviderCredential`, `OPERATOR` in `BackgroundCheckOrderer` enum, new `BackgroundCheckInvitation` model, `checkrCandidateId` on `Provider`, new `ProviderBackgroundCheckOrder` model. Will auto-apply via `npm run start` → `prisma migrate deploy` on next Render deploy (triggered by our main push 2026-05-07).
- **Risk:** If any of these migrations partially ran before and are stuck in "failed" state in `_prisma_migrations`, Render deploy will fail at start. Monitor deploy logs. If stuck: use Render Shell `npx prisma migrate resolve --rolled-back 20260505000001` (etc.) then `npx prisma migrate deploy`, then manually apply the SQL.
- **Done when:** Render deploy logs show all four migrations applied with no errors.

### OL-049: CaregiverCard + ProviderCard "Run Check" quick-action
- **Status:** ✅ CLOSED (already built)
- **CaregiverCard** (`src/components/marketplace/CaregiverCard.tsx` ~line 190): "Run Background Check" button shown when `backgroundCheckStatus !== 'CLEAR'`, links to caregiver profile.
- **ProviderCard** (`src/components/marketplace/ProviderCard.tsx` ~line 247): "Run Background Check" button always visible, links to provider profile.

### OL-050: Private household flow — Option B for direct-hire families
- **Status:** ✅ CLOSED (2026-05-07) — MVP shipped
- **What was built:** `HouseholdShift` model, migration, GET/POST `/api/family/household`, PATCH/DELETE `/api/family/household/shifts/[id]`, `/dashboard/household` full UI (care team grid + schedule form + shift history), DashboardLayout "My Household" nav, landing page feature card.
- **Future expansion:** Timesheet approval, Stripe Connect direct payment to caregivers ($49–99/mo family tier). Build when 3+ families are actively using the schedule flow.

### OL-023: Checkr API not yet configured
- **Status:** 🟡 OPEN — system uses mock fallback until keys are set
- **What:** Set `CHECKR_API_KEY` and `CHECKR_WEBHOOK_SECRET` in Render env vars; register webhook at `https://getcarelinkai.com/api/webhooks/checkr`
- **Done when:** Real background checks process end-to-end in production.

### OL-022: STRIPE_PRICE_AGENCY and STRIPE_PRICE_DISCHARGE_PLANNER_DEPT not set
- **Status:** ✅ FIXED (2026-04-27) — Chris confirmed both env vars already set in Render dashboard.

### OL-001: Demo accounts not seeded in production
- **Status:** ✅ FIXED (2026-04-22)
- **All 7 accounts active in production (Password: DemoUser123!):**
  - demo.family@carelinkai.test (FAMILY)
  - demo.operator@carelinkai.test (OPERATOR)
  - demo.aide@carelinkai.test (CAREGIVER)
  - demo.provider@carelinkai.test (PROVIDER)
  - demo.admin@carelinkai.test (ADMIN)
  - demo.healthcare@carelinkai.test (DISCHARGE_PLANNER)
  - demo.affiliate@carelinkai.test (AFFILIATE)

### OL-002: ANTHROPIC_API_KEY not set in Render
- **Status:** ✅ FIXED (2026-04-22) — Chris confirmed key is set in Render dashboard
- **Done:** CareBot, inquiry AI, document classification, discharge planner, match explainer all live

### OL-004: Revenue model not finalized / Stripe billing not wired
- **Status:** ✅ FULLY VERIFIED END-TO-END (2026-04-25)
- Operator checkout → trial → portal → plan switching → webhook → DB all confirmed working in test mode
- In-app plan switching built (upgrade/downgrade without Stripe portal redirect)
- Admin revenue dashboard live: MRR, placement fees, affiliate commissions, recent payments, subscription breakdown
- **Remaining before live revenue:** Switch to live Stripe account (runbook: `context/STRIPE_SETUP_RUNBOOK.md`)

### OL-007: Full end-to-end operator onboarding never verified
- **Status:** ✅ CLOSED (2026-04-23) — all 10 steps verified in production
- All steps passing in production on getcarelinkai.com

### OL-008: Stripe subscription billing not wired (operators)
- **Status:** ✅ CODE COMPLETE (2026-04-24) — merged into OL-004 above
- See OL-004 for remaining deployment steps

---

### OL-016: Aide reliability migration not yet deployed to production
- **Status:** ✅ CLOSED (2026-04-26) — Chris confirmed migration deployed to production

### OL-017: Twilio webhook URLs not registered for On-Call AI
- **Status:** ✅ CLOSED (2026-04-26) — Twilio webhooks registered in console

### OL-018: Render cron not set up for On-Call AI wave dispatch
- **Status:** ✅ CLOSED (2026-04-26) — Render cron job created

### OL-019: Demo caregiver employment not linked in production DB
- **Status:** ✅ CLOSED (2026-04-26) — Admin clicked fix in /admin/tools

### OL-020: Landing page (src/app/page.tsx) still has legacy color tokens
- **Status:** ✅ CLOSED (2026-04-26) — All raw hex Tailwind classes replaced with design tokens. TypeScript 0 errors confirmed.

---

## 🟡 Important (Week 1-4 launch requirements)

- [x] **Home photo upload broken — missing S3 credentials** ✅ RESOLVED 2026-05-13
  - Fixed by HIPAA Phase 1 PR 2: `storage.ts` rewritten, AWS_S3_* env vars set in Render, `canUseS3()` simplified (no NODE_ENV restriction). HIPAA comment added to `homes/photos/route.ts`.

- [x] **S3 env var naming inconsistency** ✅ RESOLVED 2026-05-13
  - Fixed by HIPAA Phase 1 PR 2: ALL upload routes now use `AWS_S3_*` exclusively. No more S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_REGION in S3 code paths. Render env vars match. SES in email-service.ts exempted per design spec.

- [x] **Fragmented image storage architecture (Cloudinary vs S3)** ✅ PARTIALLY RESOLVED 2026-05-13
  - HIPAA Phase 1 PR 2 establishes `getUploadDestination(classification)` as single source of truth. PHI tables → S3. PUBLIC/PII → Cloudinary. Every route annotated with HIPAA classification comment. Remaining: `documents/upload/route.ts`, `upload/route.ts`, `residents/[id]/photo/route.ts` — flagged HIPAA-TODO Phase 2.

- [ ] **OL-051: HIPAA Phase 1 PRs — merge in order**
  - **Status:** 🔴 OPEN — 3 PRs pushed 2026-05-13, awaiting merge
  - **Branches:** `claude/hipaa-phase1-schema-2026-05-13` (PR 1) → `claude/hipaa-phase1-routing-2026-05-13` (PR 2) → `claude/hipaa-phase1-purge-2026-05-13` (PR 3)
  - **CRITICAL:** Must merge in order. PR 2 imports DataClassification from @prisma/client generated by PR 1.
  - **After PR 2 merge:** Run `npx ts-node --transpile-only scripts/phase1-purge-cloudinary-seeds.ts --dry-run` then the real purge.
  - **Done when:** All 3 PRs merged, migration applied on Render, purge script confirms 0 Cloudinary rows.

- [x] **OL-052: HIPAA Phase 2 — 3 remaining PHI upload routes** ✅ RESOLVED 2026-05-14
  - PR A `claude/hipaa-phase2-uploads-2026-05-14` fixes all three; zero HIPAA-TODO Phase 2 comments remain.
  - Awaiting merge (after Phase 1 PRs merge first).

- [ ] **OL-053: HIPAA Phase 2 PRs — merge in order A→B→C** (after Phase 1 PRs)
  - **PR A** `claude/hipaa-phase2-uploads-2026-05-14` — upload routes + schema migration
  - **PR B** `claude/hipaa-phase2-download-2026-05-14` — pre-signed URLs on all PHI reads
  - **PR C** `claude/hipaa-phase2-logs-2026-05-14` — Sentry scrubbing + log redaction
  - Design spec: `chrisos-vault/03_Execution/HIPAA_PHASE_2_DESIGN.md`
  - **CRITICAL:** Phase 1 PRs must merge first (Phase 2 imports DataClassification from Phase 1 migration)
  - **Done when:** All 3 PRs merged, migrations applied on Render, real-S3 integration tests run clean.

- [ ] **OL-054: HIPAA external consultant gap assessment** — $500-1500, target 2026-05-27 (Risk 1)

- [ ] **Test suite rot — 2 broken suites on main**
  - `__tests__/emergency.api.test.ts` — failing on main
  - `__tests__/background_checks.api.test.ts` — failing on main
  - 10 total test failures across both suites
  - Has been failing since at least PR #517; PR #518 and PR #519 both
    merged via admin override past these
  - CI/build-and-test runs Jest which catches these; Quality job depends
    on Jest pass for green status
  - Fix options: (a) repair the tests, (b) temporarily skip the suites
    until repaired, (c) keep admin-overriding (status quo, not great)
  - Recommended: option (b) until someone has time for (a)
  - Cross-ref: Risk #7 (no staging / no tests)

- [ ] **Main branch is not protected**
  - GitHub Branches page reports "Your main branch isn't protected"
  - Allows force-push and deletion of main; allows merges past failing
    required checks (currently the only thing letting our merges through)
  - Once test suite rot is fixed, enable branch protection: require PR
    review (or at least up-to-date branch), require status checks to
    pass, prevent force-push, prevent deletion
  - DO NOT enable protection BEFORE fixing the test suite rot — it
    would block all merges
  - Cross-ref: Risk #7 (HIPAA/compliance — branch protection is a basic
    security control)

- [x] **Stale sentry-wrapper-rollout branch deleted (informational)**
  - `claude/sentry-wrapper-rollout-2026-05-13` deleted from GitHub
    2026-05-13 (the messy-history first attempt at the Sentry rollout)
  - Kept here as a record of what was cleaned up; loop is closed.

---

## 🟡 Important (Quality / Stability)

### OL-005: TypeScript strict mode errors
- **Status:** ✅ CLOSED (2026-04-24) — 0 errors, `npm run type-check` passes clean

### OL-006: CI quality workflow type-check step disabled
- **Status:** ✅ CLOSED (2026-04-24) — type-check step re-enabled in `.github/workflows/quality.yml`

---

## 🟢 Low Priority / Future

### OL-013: CareBot outputs raw markdown in chat
- **Status:** ✅ CLOSED (2026-04-24) — added plain text instruction to SYSTEM_PROMPT in `src/app/api/carebot/chat/route.ts`

### OL-009: SMS (Twilio) not implemented
- **Status:** ✅ CLOSED (2026-04-24; extended 2026-05-01) — 7 triggers live via SMSService
- Operator: new inquiry, tour booked, payment failed
- Family: inquiry response received, tour reminder 24hr (Render cron daily 9am)
- Marketplace: listing owner on new application, caregiver on status change (invite/interview/offer/hire/reject)
- All calls non-blocking; gracefully no-ops if Twilio not configured

### OL-010: Invoice model missing from schema
- **Status:** ✅ CLOSED (2026-04-25) — `Invoice` model added; webhook upserts on payment_succeeded/failed; `GET /api/operator/billing/invoices` live; invoice history table in SubscriptionManager UI

### OL-011: Playwright tests configured for localhost only
- **Status:** ✅ CLOSED (2026-04-25) — `playwright.production.config.ts` + `tests/smoke.spec.ts` added; run with `npm run test:e2e:prod`

### OL-012: context/ files were not in repo
- **Status:** ✅ FIXED (2026-04-21)

### OL-014: Placement fee not auto-triggered on Convert to Resident
- **Status:** ✅ CLOSED + IMPROVED (2026-04-24) — switched from PaymentIntent (blocks if card fails) to Stripe invoice item (collected on next billing cycle); never blocks conversion
- Payment status: PENDING → PROCESSING (invoice queued) → COMPLETED (invoice paid via webhook)
- Defaults to $500 (`PLACEMENT_FEE_CENTS=50000`); configurable per Render env var

### OL-015: Landing page does not showcase all products by user type
- **Status:** ✅ CLOSED (2026-04-24) — full landing page revamp with 6-tab user-type sections, pricing cards, roadmap

---

## ✅ Closed Loops

| Loop | Description | Closed |
|------|-------------|--------|
| Operator Caregiver Reviews page | `/operator/reviews` built — hire list, star ratings, breakdown, Leave Review modal | 2026-04-26 |
| Caregiver rating dashboard tile | Avg star + review count tile + My Reviews section on `/caregiver` | 2026-04-26 |
| App status notifications missing link | Notification now includes `link: /caregiver/applications` + email sent | 2026-04-26 |
| Caregiver sidebar nav missing My Applications | Added to DashboardLayout Listings section (CAREGIVER only) | 2026-04-26 |
| Caregiver My Applications | `GET /api/caregiver/applications` + `/caregiver/applications` page built | 2026-04-26 |
| Wallet deposit gap (false alarm) | `/api/billing/wallet` + `DepositModal.tsx` already exist | 2026-04-26 |
| On-Call AI gap (false alarm) | `/api/scheduling/needs/{id}/start` and `cancel` routes already exist | 2026-04-26 |
| Email FROM domain | Was `noreply@applyedge.co` | 2026-04-21 |
| .env.example missing 12 vars | Added all required vars | 2026-04-21 |
| context/ directory missing | Created all state files | 2026-04-21 |
| /api/dev/ security | Confirmed gated behind ALLOW_DEV_ENDPOINTS | 2026-04-21 |
| OpenAI build failure | Fixed Dec 19 — dummy key pattern | 2025-12-19 |
| Migration failure (20251218) | Resolved with resolve script | 2025-12-19 |
| CareBot implementation | Built and deployed | 2025-12-30 |
| AI provider consolidation | Migrated all AI from OpenAI+AbacusAI → Anthropic Claude API | 2026-04-21 |
| OL-002: ANTHROPIC_API_KEY | Set in Render dashboard by Chris | 2026-04-22 |
| OL-001: Demo accounts | All 7 accounts seeded in production | 2026-04-22 |
| Profile picture upload (Bug 1) | Fixed CLOUDINARY_URL missing @dygtsnu8z in Render | 2026-04-22 |
| AI matching error (Bug 2) | Was missing OpenAI key — resolved with Anthropic migration | 2026-04-22 |
| Settings routing (Bug 3) | Not a bug — /settings index page works correctly | 2026-04-22 |
| OL-007: Full operator onboarding | All 10 steps verified in production | 2026-04-23 |
| AI Response Generator blank preview | Fixed response wrapper unwrapping in hook | 2026-04-23 |
| Convert to Resident button missing | Wired ConvertInquiryModal into InquiryDetailModal | 2026-04-23 |
| Resident INQUIRY status after convert | Removed spurious status overwrite in conversion service | 2026-04-23 |
| Archive button placeholder text | Wired real ArchiveButton component | 2026-04-23 |
| OL-008: Stripe subscription billing | Code complete — checkout, portal, webhooks, feature gating built | 2026-04-24 |
| OL-009: SMS / Twilio | 5 triggers wired: new inquiry, tour booked, payment failed, response received, 24h tour reminder cron | 2026-04-24 |
| Care Wallet spending | Families pay care costs from wallet; 2.5% fee; atomic deduction; payment trail | 2026-04-24 |
| Affiliate commission auto-trigger | affiliateCode on Inquiry; commission recorded on conversion; affiliate dashboard built | 2026-04-24 |
| FOUNDERS49 promo | Stripe coupon $50/mo off forever (max 50); banner in billing UI | 2026-04-24 |
| Placement fee billing switch | Switched from PaymentIntent → invoice item; collected on next billing cycle | 2026-04-24 |
| OL-005: TypeScript strict mode errors | 147 errors fixed across 73 files; `npm run type-check` passes 0 errors | 2026-04-24 |
| OL-006: CI type-check step disabled | Re-enabled in `.github/workflows/quality.yml` | 2026-04-24 |
| OL-010: Invoice model missing | Invoice model + migration + webhook upsert + billing API + UI table | 2026-04-25 |
| OL-011: Playwright localhost-only | playwright.production.config.ts + tests/smoke.spec.ts; `npm run test:e2e:prod` | 2026-04-25 |
| Caregiver hire fee not charging | triggerMarketplaceHireFee() on shift claim; MARKETPLACE_HIRE_FEE PaymentType | 2026-04-25 |
| Featured listings not built | isFeatured/featuredUntil on schema; search boost; operator toggle UI; $79/mo billing | 2026-04-25 |
| Discharge planner not monetized | DischargePlannerProfile model; Stripe checkout; billing UI; webhook handler | 2026-04-25 |
| AI Shift Auto-fill missing | Claude Haiku matches available caregivers to shift descriptions; /api/operator/shifts/autofill | 2026-04-25 |
| Caregiver reliability score missing | reliabilityScore field; computed on review + timesheet approval; 0-100 scale | 2026-04-25 |
| Aide ghosting/no-show problem | Call-off tracking + gamification points + shift bidding + On-Call AI outreach all built | 2026-04-25 |
| Waitlist management missing | WaitlistEntry model; operator + family API routes | 2026-04-25 |
| Education hub missing | 7 long-form guides at /learn and /learn/guides/[slug] | 2026-04-25 |
| Education hub at 7 articles | Expanded to 15 articles in content.ts; learn/page.tsx now imports from content.ts | 2026-04-25 |
| Family-facing chat widget | Care Concierge replaces CareBot globally; public /api/care-concierge + home search tools | 2026-04-25 |
| Family onboarding missing | /get-started 3-step wizard routes by role + need + timeline | 2026-04-25 |
| Financing CTA missing | CareCredit affiliate banners on /learn and home listing pricing tab | 2026-04-25 |
| Compliance document kits not built | ComplianceKitPurchase model; 3 Ohio kits at $149-$199; Stripe one-time checkout | 2026-04-25 |
| Build failure (content.ts premature array close) | Premature `];` at line 259 removed; all 15 guides now inside GUIDES array | 2026-04-25 |
| Map tile error (OSM Referer policy) | Switched SimpleMap.tsx to CARTO voyager tiles — no Referer restriction | 2026-04-25 |
| Admin portal gaps (affiliates/operators/discharge-planners) | Three new admin pages built with full data tables and stat cards | 2026-04-25 |
| Sidebar nav cutoff (can't scroll to Admin Tools/Help) | Sidebar refactored to flex column; nav section independently scrolls | 2026-04-25 |
| UI/UX brand token fragmentation | Unified: Inter + DM Serif Display fonts; primary-*/neutral-*/error-*/success-* tokens throughout button.tsx, card.tsx, login page; CSS vars fixed to match Tailwind config | 2026-04-25 |
| Login page using wrong brand colors | Complete redesign: gradient panel primary-600→secondary-600, DM Serif hero headline, all tokens corrected | 2026-04-25 |
| Bulk token unification across codebase | 259 files bulk-updated via sed: red→error, green→success, blue→primary, gray→neutral, yellow/orange→warning, purple→secondary. TypeScript 0 errors. 0 old tokens remain (except src/app/page.tsx deferred). | 2026-04-25 |
| Component design polish pass | StatCard left-border accent + trend prop; skeleton shimmer animation + HomeCardSkeleton; search card hover lift; tabs fixed; error/not-found redesigned; operator dashboard token fixes | 2026-04-25 |
| OL-016: Aide reliability migration | `npx prisma migrate deploy` run in Render shell — confirmed deployed | 2026-04-26 |
| OL-017: Twilio webhooks for On-Call AI | Webhooks registered in Twilio console | 2026-04-26 |
| OL-018: Render cron for On-Call AI | Cron job created in Render dashboard | 2026-04-26 |
| OL-019: Demo caregiver employment | Admin clicked fix in /admin/tools | 2026-04-26 |
| OL-020: Landing page legacy tokens | All raw hex Tailwind classes in page.tsx replaced with design tokens | 2026-04-26 |
| Direction B design system applied | Dark sidebar (neutral-950), border-t-4 stat cards, shimmer skeletons, design preview page | 2026-04-26 |
| OL-022: Stripe price env vars | STRIPE_PRICE_AGENCY + STRIPE_PRICE_DISCHARGE_PLANNER_DEPT confirmed set in Render | 2026-04-27 |
| Landing page benefits/FAQ overhaul | Operators/Caregivers/Healthcare/Affiliates tabs updated; On-Call AI, Direct Hire, Points, tiered commissions, licensing tiers added; FAQ 5/6 updated, 2 new FAQs added | 2026-04-27 |
| Playwright demo verification suite | 13 tests across 3 roles; DISCHARGE_PLANNER added to TEST_USERS; replaces manual post-deploy checklist | 2026-04-27 |
| Marketplace Create Listing form | /marketplace/listings/new with full form + pill toggles for care types/services/specialties | 2026-04-26 |
| Hire fee confirmation UI | HIRE action in ApplicationActions shows $250 fee modal before submitting; API queues Stripe invoice item | 2026-04-26 |
| Message Caregiver on application page | "Message Caregiver" button links to /messages?with={userId} on application detail page | 2026-04-26 |
| Revenue model expansion (5 streams) | On-Call/Autofill gates, DP dept license, family referral track, tiered commissions, AGENCY plan | 2026-04-27 |
| Operator direct hire from caregiver profile | DirectHireButton + /api/operator/caregivers/[id]/hire; plan-aware modal; replaces family-only CTA for operators | 2026-04-27 |
| Caregiver dashboard showing wrong page | /dashboard now redirects CAREGIVER → /caregiver, DISCHARGE_PLANNER → /discharge-planner | 2026-04-27 |
| Discharge planner double nav | Removed erroneous layout.tsx; billing page now has its own DashboardLayout wrapper | 2026-04-27 |
| Demo operator on Starter plan | seed-demo.ts forces PROFESSIONAL plan on upsert + explicit update; re-seeded on Render | 2026-04-27 |
| OL-021: Prisma migrations | All migrations deployed — confirmed "No pending migrations" in Render shell 2026-05-02 | 2026-05-02 |
| OL-024: BackgroundCheckOrderPanel Stripe Elements | Real Stripe Elements wired — Elements/PaymentForm inline; POST→clientSecret→confirmPayment→PUT confirm | 2026-05-02 |
| OL-025: HomeCompareModal wired | compareIds state + toggleCompare + compare bar + modal render in search/page.tsx | 2026-05-02 |
| ProviderReview migration | migration.sql created and auto-deployed on build | 2026-05-02 |
| Residents page server-to-self HTTP fetch | Replaced with direct Prisma via requirePermission + getUserScope | 2026-05-02 |
| /help double nav | Removed duplicate DashboardLayout wrapper from help/page.tsx | 2026-05-02 |
| Landing page auth wall | Added alwaysPublic paths in middleware authorized callback | 2026-05-02 |
| PDFKit Helvetica.afm ENOENT in standalone | Added serverExternalPackages: ['pdfkit'] to next.config.js | 2026-05-02 |
| ReportGenerator homes 404 | Changed /api/homes to /api/operator/homes in fetchHomes() | 2026-05-02 |
| Provider dashboard routing | /dashboard switch missing PROVIDER case — fell through to family UI; fixed | 2026-05-03 |
| Billing nav missing for PROVIDER + CAREGIVER | Added "Listing & Billing" + "Pro Membership" nav entries to DashboardLayout | 2026-05-03 |
| Provider dashboard design | Full rewrite with stat tiles, smart banners, quick actions, inquiries table | 2026-05-03 |
| Landing page freemium inaccuracy | Updated 5 "always free" references to reflect free-to-join + Pro $19/mo optional model | 2026-05-03 |
| Admin MRR visibility | Admin dashboard now shows 5-tile MRR breakdown across all 4 revenue streams | 2026-05-03 |
| OL-031: Application cap enforcement | Full enforcement built: block at 10, increment on submit, reset cron, upsell banner | 2026-05-03 |
| OL-038: Transport migration 20260504000005 | Auto-deployed via PR #512 merge → Render start script | 2026-05-04 |
| OL-039: Recurring rides cron | Chris registered Render cron `0 7 * * *` → `/api/cron/recurring-rides` | 2026-05-04 |
| OL-040: Transport migration 20260504000006 | Auto-deployed via PR #512 merge → Render start script | 2026-05-04 |
| OL-041: Provider reliability score | `rideStats.ts` + dashboard tile + marketplace section + API; transport-only gate | 2026-05-04 |
