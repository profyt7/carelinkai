# CareLinkAI — Tech Open Loops
_Last updated: 2026-10-29 (late) — OL-217 ✅ MERGED #8 (squash) `9294a7d8`. Follow-ups OL-222 (gallery counter over caption), OL-223 (two "all photos" buttons), OL-224 (compact limited-data states on mobile) and OL-225 (one mobile support control, not scheduled). Prior: OL-217 PR open (facility profile /homes/[id] on the Direction D standard: one inquiry pathway, CTA bar, claim demoted). Prior: OL-216 ✅ MERGED #6 (squash) `57d5e21e`, closing OL-208. Follow-ups OL-218…OL-221 logged (directory placeholder tile, /search a11y leftovers, Search Tips copy, waiver data in /api/search). OL-217 (`/homes/[id]` restructure) is reserved for the next batch. Prior: 2026-10-28 (night) — OL-215 added (Render crons were inactive until 10/28; Monthly Reset unverified until its Nov 1 run); `.github/workflows-disabled/` removed; #3 CI shard-check fix, #4 render.yaml cron record merged. Prior: OL-207 ✅ MERGED #1 (squash) `d965c008`; OL-205 and OL-209 closed with it. Repo moved to a fresh public `profyt7/carelinkai` (one squashed commit); old repo archived private as `carelinkai-archive`. Prior: 2026-10-28 — OL-212 PR open (demo passwords from DEMO_ACCOUNT_PASSWORD); OL-213 added (credentials in git history / tracked PDFs — founder rotation). Prior: 2026-10-27 — OL-210 PR open (remove the CI migrate-deploy job). OL-206 ✅ MERGED #807 `1977ff6a`, prod-verified; #808 (CI runs once per PR) ✅ MERGED `0d553dfb`. Earlier the same day: OL-208 added (Care Advisor bubble covers mobile "More"); OL-209 added (header/sidebar user block duplicated); OL-202 ✅ MERGED #806 `24537cee`. Prior: 2026-10-24 — OL-177 + OL-178 PR open (unclaimed inquiries → inbound queue; MapTiler); OL-176 ✅ MERGED #783 `3af16f2c`; OL-175 ✅ MERGED #782 `3c08889d`; OL-171…OL-174 ✅ MERGED (#777 `ba7d9ba3` · #778 `972c8b63` · #779 `83367965` · #780 `3c29ad10`). Prior: 2026-10-22 — OL-153 #774 `b3a6b298` + OL-169 #775 `caff286b` ✅ MERGED. Prior: 2026-10-21 (W2 batch merged) — OL-167 a–d + OL-168 ✅ MERGED (#768 `0f1b2ba8` · #771 `481a463d` · #772 `fcdeebf3` · #770 `5d5fb05d` · #769 `2a2eba26`). Prior: OL-166 a–d ✅ MERGED (#762–#765); OL-165 residuals closed. Prior: 10/20 batch MERGED (#749, #761, #750–#759; see DEV_SESSION_SUMMARIES 2026-10-20/21); OL-163 a–e, OL-159, OL-160, OL-161, OL-162, OL-165 now ✅ MERGED (residuals noted inline); OL-166 follow-ups in flight. Prior: 2026-10-17 — sprint W5 batch: six stacked PRs open (#743–#748); OL-155…OL-158 added; OL-148 (W4), OL-140 (W3), OL-146 (font flake), OL-154 (decline flake, #743) closed; OL-141/OL-150 residuals folded into OL-155/#748. Prior: 2026-10-13 (evening) — sprint W4 batch: six more PRs open (#733–#738), OL-148…OL-153 added; OL-142 and OL-143 built (decision residuals only), OL-144 half-closed (Beachwood/Lakewood shipped). Earlier same day — sprint W3 batch: six PRs open (#726–#731), OL-140…OL-147 added; OL-125/OL-129 residuals carried. Previous rebuild 2026-10-05 — **rebuilt from the repo** (sprint W2 item 7). Sources: the 56 open PRs on GitHub, `grep TODO|FIXME` over `src/`, every `test.skip`/`fixme` in `__tests__/`, `tests/`, `e2e/`, the CI workflows, and the previous version of this file (all 115 prior OL ids carried forward below with their last known status). Each entry: **OL id · one-line status · file path**. Triage: **SHIP NOW** = this week, **LATER** = backlog, **FOUNDER** = needs Chris (settings, money, legal), **CLOSED** = verified done (kept for id continuity)._

_Sprint W2 batch — merge day 2026-10-10/11 (one at a time, production verified after each via the new `prod-verify.yml` workflow): **#723** ops tooling `870a65f` · **#721** OL-124 gate `0df4b18` · **#714** public routes `4f95aec` · **#718** Sentry 401 noise `b402dd5` · **#717** isDemo filter `189dd8d` · **#716** closed as superseded by #721 · **#720** this file `b81fc9f` · **#715** memory restarts `b0b4078` · **#719** Prisma warm-up `97e6583` · **#724** workflow fix `87df579`. All eight sprint PRs are on main and verified live._

---

## 🔴 SHIP NOW (this week)

### OL-217: Facility profile (/homes/[id]) on the Direction D standard — MERGED
- **Status:** ✅ MERGED 2026-10-29, PR #8 (squash) `9294a7d8`. Prod-verify run 40808771299 (all passed): `/api/version` = `9294a7d8` (live 02:57:06 UTC, about 8 min after the merge), `/` 200, `/api/health` 200 ok=true db=ok, `/search` 200 with footer @9294a7d, `/cleveland/assisted-living/beachwood` 200 with footer @9294a7d, `/homes/cmql0xbos0006r7jcitqgqhds` 200 with footer @9294a7d, `/homes/cmql0xbp9000gr7jcpmm4c9ps` (first listing on `/cleveland/assisted-living`) 200, `/concierge` 200 with the screener, `/cleveland` and its four care-type hubs 200 and indexable, `/zzz-nope` and `/.env` 404, `/operator` (logged out) → 307 to login. Claim status of the two listings is not recorded by prod-verify, and the prod host isn't reachable from the agent sandbox, so claimed vs unclaimed wasn't confirmed on production.
- **What:** presentation only; `generateMetadata`, JSON-LD, the URL, the inquiry/tour handlers, the PhotoGallery / HomeReviews / InspectionHistory internals, waiver lines, the CareCredit disclosure, and every test id and data attribute are unchanged.
  - **Header:** a visible breadcrumb (from the existing `listingBreadcrumb`, the same items as the JSON-LD); PhotoGallery as the hero, with a second photo + "All photos" (opens PhotoGallery's lightbox) at ≥ md; `HomeImagePlaceholder` when there are no photos (the remote stock stand-in is gone); DM Serif name; location; full Google rating.
  - **Key-stat tiles:** care types (+ capacity only when verified), availability (`AvailabilityBadge`), pricing (`PriceLine`), and state inspection (latest ODH survey date · citations · license, read from the existing `/api/homes/[id]/inspections`). With no survey on file the row has three tiles; it never says "0 inspections".
  - **Section nav** inside `listing-sticky-bar` (About · Amenities · Pricing · Location · Reviews · Inspections; anchor links + scroll-spy). Sticky only at ≥ lg; scrollable with an edge fade below md.
  - **One inquiry panel**, the existing form in a single instance: right rail at ≥ lg, inline at the top of the content below lg. Below lg, a sticky CTA bar (`listing-cta-bar`) appears once the reader has scrolled past the panel. It's safe-area aware for guests; signed in, it docks (fixed) on the tab bar, because the shell's scrolling `<main>` pads its bottom and a sticky bar would stop 64px short. It is hidden + inert while the panel is on screen and publishes `--bottom-stack-offset` (OL-208). "Scrolled past" is a scroll check, not an IntersectionObserver: a jump from below the fold to past the panel (End key, anchor link, reduced motion) never crosses a threshold.
  - **Removed:** the Contact section's "Send a Message" / "Chat with a Care Advisor" buttons and the "Schedule a Tour to Discuss Pricing" button; contact details stay as information.
  - **Claim:** guests and FAMILY get a quiet footer line (`listing-claim-footer`); OPERATOR/STAFF/ADMIN keep the full claim block and the section claim buttons. No claim URL parameter exists for `/homes/[id]`, so the role is the only switch.
  - **Floating widgets (pre-merge fix `e074eba2`):** below lg the page measures the Care Advisor / Report Bug boxes (`[data-floating-widget]`) and adds that much clearance (`listing-widget-clearance`) at the end of the listing, so the contact details and claim link scroll clear. The widget lift follows the CTA bar: docked → the bar's height; a guest's bar scrolling away → the widgets ride its top edge, then return to normal once it's clear (`setBottomStackHeight`). While the inquiry form or its confirmation is on screen on a phone, `body[data-listing-form-open]` hides the widgets (`globals.css`).
- **Follow-ups:** OL-222 (gallery counter over its caption), OL-223 ("View All" + "All photos"), OL-224 (compact limited-data states on mobile), OL-225 (one support control on mobile).
- **Path:** `src/app/homes/[id]/page.tsx`, `src/hooks/useBottomStackOffset.ts`, `src/components/CareConcierge.tsx`, `src/components/bug-report/BugReportButton.tsx`, `src/app/globals.css`, `e2e/public/directory/listing-profile.spec.ts` (pointer checks), `e2e/public/directory/listing-no-mock.spec.ts` (390 half asserts the section bar is static)

### OL-216: /search result cards on the Direction D standard — MERGED
- **Status:** ✅ MERGED 2026-10-29, PR #6 (squash) `57d5e21e`; OL-208 closed with it. Prod-verify (run 40791590613): `/api/version` = `57d5e21e` (live 00:11:52 UTC, about 8 min after the merge), `/api/health` db=ok, `/search` 200 with footer @57d5e21, `/cleveland/assisted-living/beachwood` 200 with footer @57d5e21, public routes and 404s OK, `/operator` → login. Follow-ups: OL-218 (directory placeholder tile), OL-219 (/search a11y), OL-220 (Search Tips copy), OL-221 (waiver data in /api/search).
- **What:**
  - `SearchResultCard` is now the only result card on `/search`, in grid and list view. Grid is 3-up ≥ lg, 2-up md, 1-up < md; list is horizontal ≥ md and the grid card below md.
  - `/api/search` results reach it through `toSearchResultHome` (`src/components/search/adapters.ts`). The API payload is unchanged.
  - Card contents: photo or `HomeImagePlaceholder`; `AvailabilityBadge` (overlay) top-left over the image; Featured / Unclaimed chips; name, location, care chips; full `GoogleRatingBadge`; `PriceLine` with its source; the AI-match insights slot (% match, top three factor chips, Explain); save · Compare · View details.
  - Under the result count there's a source/date helper line. The skeleton matches the card footprint. The empty state is `ui/empty-state` ("No homes match these filters" + Clear filters).
  - The SEO directory `ListingCard` gets the same layout from shared pieces only. It stays server-rendered and keeps its price copy and "View listing →".
- **Dropped from the cards on purpose:** tagline, the description excerpt and amenities in the list view, and the full street address. The Direction D card is name + city/state; the listing page has the rest.
- **Not shown:** a Medicaid waiver line on `/search` cards. The search payload has no per-home waiver data, and the API is out of scope here. The card slot exists if the payload ever carries it.
- **Path:** `src/app/search/page.tsx`, `src/components/search/{SearchResultCard,adapters}.tsx`, `src/components/ui/skeleton-loader.tsx`, `src/components/directory/ListingCard.tsx`, `e2e/search-cards.spec.ts`

### OL-215: Render cron jobs never ran their jobs before 2026-10-28 — fixed; Monthly Reset unverified until Nov 1
- **Status:** 🟡 FIXED 2026-10-28 in the Render dashboard. Recorded in `render.yaml` by #4 (`aacd14c9`). One check is left (below).
- **What was wrong:** all seven Render cron jobs (Reminders Processor, On-Call Wave Dispatch, Credential Expiry Check, ride-reminders, Monthly Reset Cron, Tour Reminder, Recurring rides) used build `npm install; npm run build` (Reminders Processor used `yarn --frozen-lockfile install`) and start `npm run start`. `npm run start` is the web server's start: `migrate:deploy`, then `server.js`. So every run:
  - ran Prisma migrations against production;
  - booted a second web server until Render stopped it;
  - **never called its `/api/cron/*` endpoint.**

  After the repo switch, the missing `DATABASE_URL` made the migration step fail outright.
- **Fix:** build is `echo no-build-needed`. Start is the endpoint call: `node scripts/run-cron.js` for Reminders Processor, `curl -fsS` with the route's auth header for the other six. Env is the `carelinkai-shared` group (`CRON_SECRET`), plus `NEXT_PUBLIC_APP_URL` on Reminders Processor. Manual runs on 10/28 succeeded for six crons; Reminders Processor scheduled 0 and processed 0.
- **Consequence:** reminders, on-call waves, credential-expiry checks, ride/tour reminders, monthly application-count resets and recurring-ride spawning had not run from Render before 10/28. Reminder windows are 24h, so missed reminders won't fire late. Credential expiry and recurring rides catch up on their first runs.
- **Open:** **Monthly Reset Cron** (`/api/cron/reset-application-counts`, `0 0 1 * *`) was deliberately not run by hand, since that would reset counts on 10/28. Verify its first scheduled run on **2026-11-01 00:00 UTC** (Render log → "Cron job run finished successfully"), then close this loop.
- **Path:** `render.yaml` (cron blocks), `scripts/run-cron.js`, `src/app/api/cron/*`

### OL-207: Semantic tokens + reviewed hex cleanup — MERGED
- **Status:** ✅ MERGED 2026-10-28, PR #1 (squash) `d965c008` — the first PR on the new public repo. Prod-verify (runs 40721228064 + 40721382002): `/api/version` = `d965c008` (live 16:05:59 UTC, about 8 min after merge, auto-deployed), `/api/health` db=ok, `/search` 200 with footer @d965c00, `/homes/<id>` 200, `/concierge` 200, `/operator` and `/dashboard` (logged out) → 307 to `/auth/login`. The second run is red only because the workflow has no redirect check for `/dashboard`; the 307 is the expected result. Closes OL-205 and OL-209.
- **What:** additive tokens in `src/app/globals.css` (`--surface`, `--surface-raised`, `--surface-sidebar`, `--surface-ivory`(+`-deep`), `--text`, `--text-muted`, `--border`, `--ring`, `--brand`, `--brand-secondary`). Tailwind names: `surface`, `surface-raised`, `surface-sidebar`, `surface-ivory`, `ink`, `ink-muted`, `line`, `focus-ring`, `brand`, `brand-secondary`. SidebarShell + Direction D use them. No scale value changed.
- **Hex:** `context/HEX_CONVERSION_TABLE.md`: 797 literals, 134 CONVERT (exact scale match, UI chrome), 663 KEEP with a reason. Conversion commits only touched the layout, admin and misc groups; dashboard/search/homes/operator had no exact-match chrome hex.
- **Residual (LATER):** the off-scale values stay as they are: `#6B7280` ×37 (Tailwind's default gray-500, not this repo's), `#3167d4` ×9, `#10b981`, `#4f46e5`, … Normalising them changes colour and needs a design decision. Pre-existing axe violations on baseline pages are listed in the PR and not fixed.
- **Screenshots:** `assets/ol-207-screenshots` branch (never merge).

### OL-212: Demo / seed account passwords come from `DEMO_ACCOUNT_PASSWORD` — PR open
- **Status:** 🟢 BUILT 2026-10-28 `fix/demo-password-env` (off main `f059d6a0`, not merged).
- **Why:** the repo is going public, and every seed script, `/demo`, the e2e specs and the docs carried literal logins (`demo.*@carelinkai.test`, `admin@carelinkai.com`, `*+seed@carelinkai.com`, `*.test@carelinkai.com`, …).
- **Change:** one rule — `demoAccountPassword()` in `src/lib/admin/demo-identity.ts` reads `DEMO_ACCOUNT_PASSWORD` and throws when unset or < 12 chars (no fallback). Used by `runDemoSeed`, every `/api/dev/upsert-*` default, and (as a same-rule local copy, because plain `ts-node` can't resolve relative imports) every `prisma/seed*.ts`. JS twins / root scripts read the env var directly. `/demo` no longer shows a password. e2e: `demoPassword()` in `e2e/_helpers.ts`; the workflow sets a per-run value. Docs say "DEMO_ACCOUNT_PASSWORD". Dead `src/lib/auth-simple.ts`, `src/lib/auth-file-simple.ts`, `data/dev-users.json`, `test-bcrypt.js` removed (unimported; held a bcrypt of the old admin password).
- **Also:** `scripts/rotate-demo-passwords.ts` (dry-run default, `--force` to write) — changes only password hashes, deletes nothing.
- **Proof:** `npm run seed` without the var → refuses; with it → `admin@` / `demo.discharge@` hashes match the env value and not the old literal. Same for `seed:demo`. Rotation script: refuses without the var; dry-run lists; `--force` → hashes match the new value. tsc, lint, jest 147/147.
- **Founder action (after merge):** set `DEMO_ACCOUNT_PASSWORD` in Render, then from a Render shell: `npx tsx scripts/rotate-demo-passwords.ts` (dry-run lists the seeded logins it found) → `--force`. It sets every seeded login (DEMO_EMAIL_RE, `@example.com`, the fixed `admin@` / `operator@` / `family@` / `*.test@carelinkai.com` seeds) to the new value, so the old (now public) passwords stop working. Do **not** re-run `npm run seed` in prod — it also inserts mock caregivers and jobs.

### OL-213: Real credentials in git history and in tracked PDFs — founder rotation + history decision
- **Update 2026-10-28 (late):** history decision made. A fresh public `profyt7/carelinkai` was created with one squashed commit, and the old repo was archived private as `profyt7/carelinkai-archive`. Render was re-linked. The founder reported rotation done. Remaining: the CI gitleaks rules gap below.
- **Dead workflows removed 2026-10-28:** `.github/workflows-disabled/` (four old hook-based Render deploy files; GitHub never ran them) was deleted. The only secrets workflows use are `CRON_SECRET` and `E2E_NEXTAUTH_SECRET`.
- **Repo-move audit (2026-10-28):** main is protected (PR required, 0 approvals; 8 required checks: build-and-test, quality, e2e-auth-signup-verify, e2e-family (1)/(2), e2e-residents (1)/(2), e2e-operator-claim; force-push and deletion blocked; `enforce_admins` off, so an admin can still bypass). No workflow reads `DATABASE_URL` from secrets; every e2e job uses the local CI Postgres container. Actions secret names could not be listed from the agent sandbox (the proxy blocks that API), so the founder confirms in Settings → Secrets. Render serves this repo's commits (`/api/version` = `2b2426a5` before the merge). **The `assets/ol-202-screenshots` and `assets/ol-206-screenshots` branches did not survive the move.** The PNGs are in the vault; no action needed.
- **Status:** 🔴 OPEN 2026-10-28. Full scan (gitleaks over all 3,485 commits + PDF text + service-specific regexes) found live-looking credentials for several third-party services in history, and some are still in tracked `*.pdf` / one `.mjs` in the tree. Per-service list, files and commits are in the session report to Chris (deliberately not in this public file).
- **Needed:** (1) rotate every listed credential — removing files does not un-leak them; (2) delete the credential-bearing files from the tree; (3) decide before going public whether to rewrite history (`git filter-repo`) or publish a fresh squashed repo — history rewrite needs explicit founder sign-off.
- **CI gap:** the gitleaks CI scan reads neither PDFs nor `postgresql://user:pass@host` URLs; add custom rules.

### OL-210: Remove the GitHub Actions `migrate-deploy` job — PR open
- **Status:** 🟢 BUILT 2026-10-27 `chore/ol-210-remove-ci-migrate` (off main `1977ff6a`, not merged).
- **Why:** `.github/workflows/ci.yml` had a `migrate-deploy` job (`needs: build-and-test`). It ran `prisma migrate deploy` against `secrets.DATABASE_URL`, gated to `refs/heads/main` and a non-empty secret. Production already migrates on every Render deploy:
  - `render.yaml` `startCommand: npm start` → `npm run migrate:deploy && node .next/standalone/server.js`;
  - `render-build-verbose.sh` STEP 3 also runs `npx prisma migrate deploy` and exits non-zero on failure.

  So the Actions job was redundant. If the secret was set, it migrated production at merge time, ahead of the code that matches the schema.
- **Change:** the whole job is deleted. `build-and-test` is unchanged. No other workflow `needs:` it, and none is triggered from it by `workflow_run`.
- **Startup path untouched:** `scripts/migrate-deploy-with-timeout.js` is unchanged. A failed migration exits non-zero, so `&&` never starts the server: the child's exit code passes through, 124 on timeout (`MIGRATE_DEPLOY_TIMEOUT_SEC`, default 60), 1 on a signal or spawn error.
- **Founder action:**
  - After merge, no workflow references `secrets.DATABASE_URL`; the e2e jobs use the local postgres service. Remove the repo secret by hand (Settings → Secrets and variables → Actions → `DATABASE_URL`).
  - If `migrate-deploy` was ever made a required status check on main, remove it there too (Settings → Branches / Rules).
- **Path:** `.github/workflows/ci.yml`

### OL-209: Header user name + role badge duplicates the sidebar footer block
- **Status:** ✅ MERGED 2026-10-28 with OL-207 (#1 `d965c008`). At ≥ lg the header button is avatar + chevron only (the menu still opens). md–lg keeps the name because the sidebar is an icon rail there with the footer name sr-only. < md unchanged.
- **Problem:** since OL-206, the signed-in user's name and role badge appear twice at ≥768px: in the header user-menu button (`DashboardLayout`) and in the `SidebarShell` footer block.
- **Fix:** keep one. Likely the sidebar footer on desktop, with the header button reduced to avatar + chevron (the menu itself stays). Check the phone drawer, which shows the footer block too.
- **Path:** `src/components/layout/DashboardLayout.tsx` (header user menu), `src/components/layout/SidebarShell.tsx` (`user` footer)

### OL-208: Care Advisor chat bubble covers the mobile "More" tab
- **Status:** ✅ MERGED 2026-10-29 with OL-216 (#6 `57d5e21e`). Bottom bars publish their height (including the safe-area inset) as `--bottom-stack-offset` on `<body>` (`src/hooks/useBottomStackOffset.ts`; the app shell's tab bar via `SidebarShell reserveBottomStack`). Care Advisor and Report Bug sit at that offset plus their old spacing; it's 0 for guests with no bar. `e2e/role-navigation.spec.ts` now opens More with a real pointer click.
- **Problem:** at 390px the fixed "Ask a Care Advisor" bubble (and the round Report Bug button above it) sits over the bottom-right of the mobile tab bar. A tap on "More" (and partly the 4th tab) hits the bubble, so phone users can't open the full menu by tapping. Visible in the OL-206 before/after 390 screenshots for every role.
- **Fix (own PR):** lift the floating widgets above the tab bar on pages with `.mobile-tab-bar` (bottom offset of 4rem + safe-area), or dock them into the header / More drawer below 768px. Then add an e2e that clicks (not keyboard-activates) "More navigation" at 390. `e2e/role-navigation.spec.ts` uses the keyboard today because of this.
- **Path:** `src/components/CareConcierge.tsx` ("Ask a Care Advisor"), `src/components/bug-report/BugReportButton.tsx`, `src/components/layout/SidebarShell.tsx` (tab bar)

### OL-206: Role-specific navigation on the real app shell — MERGED
- **Status:** ✅ MERGED 2026-10-27, PR #807 (squash) `1977ff6a`. Prod-verify passed: `/api/version` = `1977ff6a`, `/api/health` db=ok, `/search` and a `/homes/<id>` page returned 200. `/dashboard` sits behind login and was not checked directly.
- **What changed:** `DashboardLayout` no longer renders one all-roles collapsible menu. It renders `SidebarShell` with that role's navigation:
  - navy shell for OPERATOR / STAFF / ADMIN / DISCHARGE_PLANNER;
  - light shell for FAMILY / CAREGIVER / PROVIDER / AFFILIATE.
- **Config:** `src/config/navigation/` holds one file per shell (`family`, `professional`, `caregiver`, `dischargePlanner`, `provider`, `affiliate`, plus `admin` and `shared`).
  - `getNavForRole(role, { paidFeatures, marketplaceEnabled })` applies roleRestriction, paidFeature and the marketplace flag.
  - `getMobileTabIds` keeps each role's old 4 bottom tabs.
  - ADMIN = professional + an "Admin" group holding all 20 old `/admin/*` items, plus Affiliate Dashboard.
- **Guarantees:**
  - `context/NAV_ROUTE_MAPPING.md` maps every old href to its new place.
  - The jest parity test asserts the per-role `{href, role}` sets equal the frozen old array. The one declared addition is ADMIN `/admin/caregivers`: the old `getComputedHref` sent that link to `/operator/caregivers`.
  - `e2e/role-navigation.spec.ts` covers all 8 roles.
- **SidebarShell:** gained collapsible groups (persisted in `carelinkai-nav-collapsed`), rail flyouts, a controlled drawer, `linkAs`, `data-tone`, and opt-outs for its own top bar / backdrop / `<main>`. Flat items (Direction D previews) render as before.
- **Revision (Chris, #807 review):** every non-professional shell ends with a collapsed-by-default "More" group (id `more`) holding the carried-over links (Search Homes, Saved Homes, Marketplace, Family, Calendar, Help and a few role links). Hrefs, roleRestrictions and mobile tabs are unchanged; the parity test passes without edits.
- **Revision 2 (Chris):** every group starts collapsed in the sidebar (Communities, Inquiries & Tours, Staffing, Operations, Reports & Insights, Admin, Hire a Caregiver, More). The group holding the active route opens on load, and a saved manual toggle wins on later visits. Rail flyouts and the phone drawer are unchanged.
- **Follow-ups (not in this PR):**
  - Whether those roles need the "More" links at all is a product call; removing them changes reachability.
  - The bottom bar now shows below 768px (was 640px), matching the shell's md breakpoint.
  - OL-208: the Care Advisor bubble covers the bottom-bar "More" tab.
- **Path:** `src/config/navigation/`, `src/components/layout/{SidebarShell,DashboardLayout}.tsx`, `context/NAV_ROUTE_MAPPING.md`

### OL-202: Direction D — "CareLinkAI Signature" on /design-preview — MERGED
- **Status:** ✅ MERGED 2026-10-27 — PR #806 (squash), `24537cee`. Screenshots stay on the `assets/ol-202-screenshots` branch.
- **What it is:** an in-repo, code-level spec of the approved direction, with four framed previews, each with a Desktop 1280 / Tablet 820 / Mobile 390 toggle:
  - family public search (logged out);
  - family logged-in home;
  - facility profile;
  - operator dashboard.
- **The direction:** B's navy sidebar for professional roles; C's airy layout on A's ivory (background/hero only) for family roles.
- **Built from real components over real data states:** `AvailabilityBadge`, `pricingView` → `PriceLine`, `GoogleRatingBadge`, `HomeImagePlaceholder`, `StatCard`, `EmptyState`. Fixtures run through the real server helpers. Half of every grid is the no-photo / no-price case.
- **New primitives for the rollout** (no production page imports them yet): `SidebarShell`, `SearchResultCard`, `PriceLine`, `NeedsAttentionList`. `StatCard` gained an opt-in AA `delta` slot.
- **Page hygiene:** `/design-preview` is now `noindex` and disallowed in robots.txt; it was already login-gated by middleware.
- **Rollout:** Batches 1–3 in `04_CareLinkAI/UI_Signature_Review_2026_10_26.md`, each its own PR.

### OL-200: Search cards must never show capacity-derived availability — MERGED
- **Status:** ✅ MERGED 2026-10-27 — PR #805, merge `3cf48cec`.
- **Problem:** `/search` cards (grid and list) fell back to `capacity − currentOccupancy` when availability wasn't freshly verified. Unclaimed and seeded homes showed "22 Available" or "Waitlist" with nobody having verified either.
- **Fix:** every family- and planner-facing availability label is now `AvailabilityBadge`, built from `availabilityView`. Exactly two states:
  - "Verified {date} · N open" (fresh, QA-approved);
  - "Contact to confirm availability" (everything else).
- **New pieces:** an optional `tone="overlay"` (white/90 pill over photos) and an `UNVERIFIED_AVAILABILITY` fallback for surfaces with no server view.
- **Fixed:**
  - `/search` grid and list cards;
  - the compare modal on `/search` (it showed "Available Beds N of M");
  - AI Match results (`/dashboard/find-care/results/[id]`, "N beds available" / "Waitlist only");
  - discharge-planner search results (the "Available Beds" tile, plus a "Refresh Availability" button that labelled capacity math "● Live");
  - the chat care concierge's `search_homes` tool ("N spots available" / "Waitlist");
  - the AI Match explanation prompt ("limited availability" from capacity math);
  - the DP scoring prompt (now gets the verified label instead of `availableBeds`).
- **Left as is:**
  - operator and admin views (the operator's own numbers);
  - the `availability` number in the `/api/search` payload (the filter and map read it; tracked as OL-201);
  - the operator-triggered AI profile generator, whose copy mentions capacity-derived spaces;
  - the unrouted `src/app/search/page_clean.tsx`.

### OL-197: /api/search pages without an ORDER BY — e2e `/search` demo-filter test red on main
- **Status:** 🔴 OPEN 2026-10-26. Found on PR #803's CI; it reproduces on main `df622f2a` (E2E run 40353390797, job `e2e-public-directory`, 3/3 attempts).
- **Symptom:** `e2e/search-demo-filter.spec.ts:77`: the rendered `/search` never shows `E2E Live Directory Home` within 30s. The API tests in the same describe pass (`/api/search?limit=50` lists it).
- **Cause:** `prisma.assistedLivingHome.findMany` in `src/app/api/search/route.ts` takes `skip/take` (10) with **no `orderBy`**, and relevance sorting runs in memory only on that page. Which 10 homes land on page 1 is whatever Postgres returns. Once enough homes are seeded in the job, the spec's home can fall off page 1. The same tree passed on the #802 PR run, so this is order-dependent rather than a code change.
- **Production impact:** paging can repeat or skip homes between pages, and relevance only ranks within an arbitrary page of 10.
- **Fix (proposed, own PR):** a stable DB order before paging, e.g. `orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]`, or rank in SQL. The spec could also search for its home by name.
- **Scale note (PR #804):** the in-memory ranking loads at most 1,000 homes (`SEARCH_FETCH_MAX`); move ranking database-side before the directory exceeds a few thousand listings.

### OL-196: Organization JSON-LD address + carelinkai.com → getcarelinkai.com — PR open
- **Status:** 🟢 BUILT 2026-10-26 `fix/ol-196-jsonld-email-domain` (off main `df622f2a`, not merged).
- **(a) Organization JSON-LD (`src/lib/seo/jsonld.ts`):**
  - Postal address: 6545 Market Ave North, STE 100, Canton, OH 44721. It was city-only "Cleveland".
  - Telephone: +12162459482. Email chris@getcarelinkai.com, on the Organization and its contactPoint.
  - `areaServed`: Cuyahoga, Lake, Geauga, Medina, Summit and Lorain counties. Portage was dropped.
  - The values come from `src/lib/contact.ts`, the same constants as /privacy and /terms.
  - Listings (LocalBusiness) still publish no email. `e2e/public/directory/structured-data.spec.ts` now expects the company email in the Organization block only.
- **(b) carelinkai.com → getcarelinkai.com:** every outward contact or sender address and link is changed:
  - support@, noreply@, legal@, opensource@, beta@ and dischargeplanner@ addresses;
  - VAPID `mailto:` fallbacks;
  - the Reply-To and From fallbacks in `transactional.ts`;
  - email templates and their links;
  - `public/offline.html`, README and docs.
- **Not changed:** seed, demo and e2e login identities (`admin@carelinkai.com`, `*+seed@carelinkai.com`, …). Nobody emails them, `demo-identity.ts` matches existing production rows on `+seed@carelinkai.com`, and e2e and `/api/dev/*` use them as fixed usernames.

### OL-195: e2e CI burns 30 minutes when the Playwright install hangs — PR open
- **Status:** 🟢 BUILT 2026-10-26 `ci/ol-195-playwright-cache` (off main `dc06f969`, not merged).
- **Problem:** every e2e job ran `npx playwright install --with-deps`, which installs Chromium, Firefox and WebKit plus all their apt packages. It hung four times on 10/25, each time until the 30-minute job timeout, before any test ran. The first CI run of this PR showed two causes:
  - **The browser cache never worked.** `PLAYWRIGHT_BROWSERS_PATH: ~/.cache/ms-playwright` in YAML `env:` is not shell-expanded. Playwright installed into `./~/.cache/ms-playwright` and every cache save failed with "Path Validation Error … no cache is being saved".
  - **The hang is apt.** It stalls mid-download ("Need to get 25.9 MB of archives", then silence) on the Azure Ubuntu mirror, and has no read timeout.
- **Fix (`.github/workflows/e2e-family.yml`, all six e2e jobs):**
  - `PLAYWRIGHT_BROWSERS_PATH` and the cache path are now the absolute `/home/runner/.cache/ms-playwright`, so the browser cache saves and restores.
  - The install step no longer uses apt. It runs `npx playwright install chromium`; both e2e configs run Chromium only.
    - The runner image already has every library Chromium needs. `--with-deps` only added fonts (CJK/Thai/Unifont) and upgraded libraries already present.
    - The browser downloads from Playwright's CDN, and on a cache hit the step is a no-op.
    - A second CI run with apt timeouts and retries still stalled on the fallback `archive.ubuntu.com` mirror, which is why apt is dropped entirely.
  - The install is retried once, and the step is capped at `timeout-minutes: 5`.

### OL-194: Credentials in logs (verification token, claim token, verification link) — PR open
- **Status:** 🟢 BUILT 2026-10-25 `fix/ol-194-redact-token-logs` (off main `46f6b400`, not merged).
- **Leaks fixed:**
  - `/api/auth/register` logged every new user's email-verification token in plain text (since #660, 2026-06-27).
  - Its "sanitized" request-body dump still contained `claimToken`, the signed founder claim link.
  - `/api/auth/send-verification` (a stub with no in-app caller) logged the full verification URL.
  - A dev-only log in `auth-file-simple.ts` printed the typed password and the stored hash.
  - Scripts printed a password hash (`check-password.js`), `set-cookie` (`test-caregivers-api.js`) and live claim/unsubscribe links in a preview (`send-claim-nudges.ts`).
- **Hardening:**
  - `src/lib/redact.ts` provides `redactSecrets`, `redactString` and `maskSecret`.
  - The structured logger now redacts nested keys and token-shaped strings, including `?token=`, `Bearer …`, `sk_live_`, `whsec_`, `re_` and `sk-ant-`.
  - Sentry's `scrubPhi` now drops credential keys as well.
- **Guard:** an `.eslintrc.json` `no-restricted-syntax` rule makes `next lint` fail on a `console.*` call that passes a token, secret, password, auth header or reset/verification/claim link, and on a `logger.*` template message that interpolates one. `__tests__/no-secret-logging.unit.test.ts` also lints `scripts/` and proves the rule fires.
  - **Allowlisted, with the reason inline:** one-time operator output that exists to show the value: `mint-claim-link.ts`, `batch2-send-prep.ts`, and the Stripe webhook secret in `stripe-setup.js` / `stripe-golive-setup.ts`.
- **Exposure in Render logs:**
  - **Verification tokens:** TTL 24h, and each is single-use and replaced on resend. Any token logged more than 24h ago is dead, so no rotation is needed.
  - **Claim tokens:** TTL 45 days. A logged one only works with a registration on the matching operator email. Rotating `NEXTAUTH_SECRET` would kill them, but it would also sign everyone out and break every claim link already sent, so it isn't recommended. If a specific claim looks abused, reset that home's claim instead.
  - **Render log retention:** limit who can read the service logs.
- **Path:** `src/lib/redact.ts`, `src/lib/logger.ts`, `src/lib/phi-scrubber.ts`, `.eslintrc.json`, `__tests__/no-secret-logging.unit.test.ts`
### OL-193: SMS consent gate on every outbound text — PR open
- **Status:** 🟢 BUILT 2026-10-25 `feat/ol-193-sms-consent-gate` (off main `46f6b400`, not merged).
- **Fix:**
  - `SMSService.send()` (`src/lib/sms/sms-service.ts`) is the one place the app sends an SMS. Before Twilio it calls `checkSmsConsent()` (`src/lib/consent/sms-consent-gate.ts`).
  - No consent → nothing sent, `{ sent: false, reason }` returned (never throws), `[SMS] skipped` logged with the number masked to the last 4. `sendSMS()` and every wrapper keep their boolean contract.
  - Consent = the latest `sms-*` `LeadConsent` row for the normalized number is an opt-in, and that user has no later revocation row. A failed lookup fails closed.
  - Availability poll uses its own opt-in (`purpose: 'availability'`: a listing with this `contactMobile`, `availabilityOptIn`, not do-not-call). Inbound STOP on that line already clears it.
  - `ADMIN_NOTIFY_MOBILE` is exempt (staff).
  - The on-call dispatcher's three direct Twilio sends (wave outreach, slot filled, confirmed) now go through `send()`. A skipped wave text marks the attempt `ERROR` with `SMS not sent: no_consent` and isn't counted as sent.
  - The `services/sms` stub (appointment reminders) returns `success:false` without consent.
- **Follow-ups:**
  - STOP on the main transactional line is not recorded: `/api/webhooks/twilio/sms` only handles caregiver shift replies. Twilio's carrier-level opt-out blocks the send, but no revocation row is written. Record STOP/START there (with Twilio signature validation) as revocation/opt-in rows.
  - The appointment-reminder stub still reports success without sending anything (pre-existing).
- **Path:** `src/lib/consent/sms-consent-gate.ts`, `src/lib/sms/sms-service.ts`, `src/lib/oncall/dispatcher.ts`, `src/lib/services/sms.ts`, `src/app/api/cron/availability-sms/route.ts`, `__tests__/sms-consent-gate.unit.test.ts`
### OL-192: Real company contact details on /privacy and /terms — PR open
- **Status:** 🟢 BUILT 2026-10-25 `fix/ol-192-contact-details` (off main `46f6b400`, not merged).
- **Fix:**
  - `src/lib/contact.ts` gains `COMPANY_ADDRESS` (6545 Market Ave North, STE 100, Canton, OH 44721), `COMPANY_EMAIL` (chris@getcarelinkai.com) and `COMPANY_MAILTO`. The phone was already there as the published OL-167d line, (216) 245-9482.
  - `/privacy` and `/terms` "Contact Us" blocks use these constants, with tel: and mailto: links.
  - The `/privacy` HIPAA inquiry address now uses the company email too.
- **Same placeholder block also fixed:** the "Need immediate assistance?" footer in `src/lib/email/inquiry-email-service.ts` had (555) 123-4567, support@carelinkai.com (wrong domain) and the onrender URL.
- **Reported, not changed:** see PR for the site-wide list. The main ones:
  - `support@carelinkai.com` (a domain we don't use) is the Reply-To fallback in `src/lib/email/transactional.ts`, and appears in other email templates and `public/offline.html`.
  - `legal@carelinkai.com` on `/operator/acceptance`.
  - The Organization JSON-LD address says Cleveland, not Canton.
- **Test:** `__tests__/legal-contact.unit.test.tsx`.
### OL-191: Featured ranking + badge (what a $79 featured window buys) — PR open
- **Status:** 🟢 BUILT 2026-10-25 `feat/ol-191-featured-ranking` (off main `46f6b400`, not merged). `FEATURED_LISTING_ENABLED` stays off — it gates *buying*; ranking + badge apply to any home with an open featured window.
- **Rule (one helper, `src/lib/directory/featured-rank.ts`):** featured is a tie-break inside a band, never a jump across one.
  - `/api/search` (relevance): bands of 5 points of ranking score (AI match 0–100 + fresh-availability 8 + transparent-pricing 6). Featured sorts first only within its band; a higher band always stays above.
  - `/cleveland` hubs (`fetchPublicListings`): band = availability-freshness tier (verified ≤ `AVAILABILITY_FRESH_DAYS`, older, never). Featured leads its tier; otherwise verified date → Google rating → name, unchanged. A second query loads active featured homes so one just outside the top rows can still lead its tier.
  - "Active" = `isFeatured && (featuredUntil null or in the future)` — `isFeaturedActive`, re-exported by `src/lib/billing/featured-listing.ts`.
- **Badge:** `FeaturedBadge` (text "Featured", star icon) on `/search` cards (grid + list), hub `ListingCard`, and the `/homes/[id]` header (`/api/homes/[id]` now returns `featured`).
- **Copy:** edit page now says "Get highlighted in family search results and Cleveland pages for 30 days." (was "Appear at the top of family search results").
- **Not changed:** `/api/homes/search` (unused by any page) still bubbles featured to the top. `docs/CARELINK_AI_MASTER_LAUNCH_PLAN.md` still says "top of search results" (internal plan, not user-facing).
- **Tests:** `__tests__/featured-ranking.unit.test.tsx`; `__tests__/public-listings.unit.test.ts` call index updated (two queries per fetch).

### OL-184: 10DLC SMS opt-in on every SMS phone field — PR open
- **Status:** 🟢 BUILT 2026-10-25 `feat/ol-184-10dlc-optin` (off main `777dee2b`, not merged).
- **Fix:**
  - One sentence in `src/lib/consent/sms-consent.ts` (version `sms-v1-2026-10-25`), rendered by `SmsConsentCheckbox`: unchecked by default and never required.
  - Wired on 8 forms: listing Send Inquiry, `/concierge`, `/auth/register`, `/settings/operator`, operator onboarding step 1, `/settings/profile`, `/settings/provider` and `/settings/family`.
  - Stored on `LeadConsent` with consentAt, version, phone, refs, IP and user agent. A row is written only when the box is checked. Account forms mirror the saved state, and unchecking a prior opt-in writes a revocation row.
  - Migration `20261025010000` adds `LeadConsent.userId` (nullable).
  - `/privacy` §13 and `/terms` §16 now have an "SMS Program" section that quotes the same sentence.
- **Follow-ups (not in this PR):**
  - (1) ~~SMS sending ignores consent entirely~~ → OL-193 gates every outbound SMS on the stored per-number consent.
  - (2) The availability-contact card's mobile (third-party contact; SMS stubbed pending the TCPA review) and admin-entered numbers have no checkbox.
  - (3) `/privacy` and `/terms` Contact Us still show a placeholder phone and a San Francisco address.
  - (4) The sentence is pending the same attorney review as OL-115.
- **Path:** `src/lib/consent/sms-consent*.ts`, `src/components/consent/SmsConsentCheckbox.tsx`, `src/components/legal/SmsProgramSection.tsx`

### OL-190: Featured listing as a standalone purchase — PR open
- **Status:** 🟢 BUILT 2026-10-25 `feat/ol-190-featured-checkout` (off main `777dee2b`, not merged). Behind `FEATURED_LISTING_ENABLED` (off).
- **Fix:** operators without an ACTIVE subscription (no plan, trialing founder cohort, past due) buy a featured window by one-off Stripe Checkout (inline `price_data`, `FEATURED_LISTING_FEE_CENTS`). Nothing is featured until the Stripe webhook sees `checkout.session.completed` (paid, metadata type `FEATURED_LISTING`); then `featuredUntil = max(now, featuredUntil) + 30d` and one COMPLETED `FEATURED_LISTING_FEE` payment (unique on the session id, so replays don't extend twice). ACTIVE subscribers keep the invoice-item path. The old "featured immediately + PENDING payment, no customer" path is gone.
- **Files:** `src/lib/billing/featured-listing.ts`, `src/lib/billing/fees.ts`, `src/app/api/operator/homes/[id]/featured/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/app/operator/homes/[id]/edit/page.tsx`, `__tests__/featured-listing-checkout.unit.test.ts`, `e2e/operator-featured-listing.spec.ts` (e2e-operator-claim job, flag on for that job only).
- **FOUNDER — decide before turning it on:** featured placement is not visible to families today. Only `/api/homes/search` sorts featured first, and no page calls it; `/search` (`/api/search`) ranks by match score + availability/pricing boosts, and the Cleveland hub pages order by availability-verified date then Google rating. No featured badge on public listings. The edit-page copy promises "top of family search results". Wire featured into `/api/search` and the hub pages (separate PR) before selling it.

### OL-189: Retire CareLinkAI Plus (family subscription) — PR open
- **Status:** 🟢 BUILT 2026-10-25 `chore/ol-189-retire-family-plus` (off main `777dee2b`, not merged). Founder decision 2026-10-24: families are free.
- **Removed:** `/api/family/billing/subscribe` + `/portal`; the Plus nav item, settings card, family-dashboard banner / "Priority Care Concierge" card / upsell; the `FAMILY_PLUS` switch (registry + `/admin/checkout-preflight` now list nine); `STRIPE_PRICE_FAMILY_PLUS` and `FAMILY_PLUS_ENABLED` from `.env.example`; Plus MRR on `/admin`; Plus FAQ copy in `/learn`.
- **Kept:** `/settings/family/billing` → redirect to `/settings`. `Family.isPlus` / `plusStatus` / `plusPeriodEndsAt` stay as dead data (no migration).
- **Plus-gated features:** none in code — "priority matching", "unlimited saves" and "priority concierge" were copy only. Saved homes were never limited.
- **Webhook:** family `customer.subscription.*` events → 200 + log, no write.
- **Founder:** if any live Plus subscription or price exists in Stripe, cancel / archive it in the dashboard.
- **Path:** `src/app/settings/family/billing/page.tsx`, `src/app/api/webhooks/stripe/route.ts`, `src/lib/billing/paid-features.ts`, `__tests__/retire-family-plus.unit.test.ts`

### OL-183: Listing Update agent caller ID — PR open
- **Status:** 🟢 BUILT 2026-10-25 `fix/ol-183-elevenlabs-caller-id` (off main `777dee2b`, not merged).
- **Finding:** no code started outbound calls. The weekly batch is launched by hand in the ElevenLabs dashboard from the CSV at `/api/admin/availability/call-list`, and the caller number is picked there.
- **Fix:**
  - New env `ELEVENLABS_PHONE_NUMBER_ID`, expected `phnum_5301m5qnzd3tejtr4yjej69ph6k6` (+1 216 677 3569), documented in `.env.example`.
  - `src/lib/elevenlabs/outbound.ts` is the one outbound path. `submitListingUpdateBatch` sends `agent_phone_number_id` and the Listing Update agent to the ElevenLabs batch-calling API. It fails closed: with no id (or no `ELEVENLABS_API_KEY`) it makes no request, logs an error plus a Sentry event, and returns `{ ok: false, reason }` instead of throwing. Nothing calls it yet.
  - The call-list JSON reports `callerId { display, phoneNumberId, configured }` and logs an error when the id is unset.
  - Agent ids moved to the dependency-free `src/lib/elevenlabs/agents.ts`; `post-call.ts` re-exports them.
- **Founder:** set `ELEVENLABS_PHONE_NUMBER_ID` in Render. Until programmatic submit is wired, choose +1 216 677 3569 as the caller number on every dashboard batch.
- **Path:** `src/lib/elevenlabs/outbound.ts`, `src/lib/elevenlabs/agents.ts`, `src/app/api/admin/availability/call-list/route.ts`, `__tests__/elevenlabs-outbound.unit.test.ts`

### OL-188: Fragile start command (five migrate resolves on every boot) — PR open
- **Status:** 🟢 BUILT 2026-10-25 `fix/ol-188-start-command` (off main `777dee2b`, not merged).
- **Problem:** `npm run migrate:deploy` ran five `prisma migrate resolve --rolled-back …` steps before `prisma migrate deploy` on every boot, and each one takes Prisma's advisory lock. The auto-deploy of `777dee2b` hung after the first, and Render timed out with no port bound after about 25 minutes. Those resolves are one-time repairs from Dec 2025 / Jan 2026 and are already applied in production.
- **Fix:**
  - `migrate:deploy` = `node scripts/migrate-deploy-with-timeout.js`, which runs `npx prisma migrate deploy` only.
  - The wrapper kills the whole process group after `MIGRATE_DEPLOY_TIMEOUT_SEC` (default 60), logs `[migrate-deploy] ERROR: timed out…`, and exits 124. Prisma's own non-zero exit passes through.
  - `npm start` is unchanged otherwise: `npm run migrate:deploy && node .next/standalone/server.js`. It stays on the standalone server, not `next start`.
  - The five resolves moved to `scripts/one-time/resolve-rolled-back-migrations.sh`, with a README marking them historical.
- **Not changed:** `render-build-verbose.sh` still runs a plain `npx prisma migrate deploy` at build time. A hang there is a build failure Render already reports, and with no pending migrations it is a no-op.
- **Path:** `package.json`, `scripts/migrate-deploy-with-timeout.js`, `scripts/one-time/`

### OL-182: Auth rate limiter 500s NextAuth (Sentry CARELINK-AI-1A) — PR open
- **Status:** 🟢 BUILT 2026-10-25 `fix/ol-182-auth-rate-limit` (off main `777dee2b`, not merged).
- **Bug:** `limiter.check()` threw inside `/api/auth/[...nextauth]`, so NextAuth's own error page returned 500. One sign-in (3–4 GETs + 2–3 POSTs) plus session polling from any open tab shared one 10/min bucket and tripped it.
- **Fix:**
  - New non-throwing `consume()` on `rateLimit()` returns `{ limited, retryAfterSec }`. `check()` is unchanged for the routes that catch its throw (claim, concierge, messages).
  - `src/lib/auth-rate-limit.ts` answers over-limit requests with **429 + Retry-After** and never throws.
  - GET `session` / `csrf` / `providers` / `error` are never counted.
  - POST `signin/*` + `callback/*` share a 10/min-per-IP bucket.
  - Every other `/api/auth` action has its own 60/min bucket.
  - `ALLOW_DEV_ENDPOINTS=1` still bypasses the limiter.
- **Path:** `src/lib/auth-rate-limit.ts`, `src/lib/rate-limit.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `__tests__/auth-rate-limit.unit.test.ts`

### OL-187: Revenue register corrections — MERGED
- **Status:** ✅ MERGED #789 → main `777dee2b`. Deployed 10/25 10:36 ET after one Render start-command timeout (see OL-188).
- **Built:** 2026-10-25 `fix/ol-187-register-corrections` (off main `599ba2e7`).
- **Fix:**
  - The Stripe webhook maps a subscription's price back to its plan through `planForPriceId` (`src/lib/operator-plans.ts`), so `STRIPE_PRICE_AGENCY` → AGENCY. Before, a paid Agency sub with no `metadata.plan` kept the wrong plan.
  - `MARKETPLACE_HIRE_FEE_CENTS` has one default, $99 (9900), read only in `src/lib/billing/fees.ts`. It used to be 25000 in the shift-bid service and 9900 in the two hire routes.
  - `PLACEMENT_FEE_CENTS` now defaults to 250000 ($2,500), read in the same file and documented in `.env.example`. It stays off until `PLACEMENT_FEE_ENABLED` is set and the attorney signs off. Affiliate commissions are a % of this value, so they rise 5× too (gated separately by OL-185).
  - Discharge-planner billing removed:
    - both `/api/discharge-planner/billing/*` routes;
    - the webhook's DP subscription sync;
    - `scripts/archive-dp-stripe-prices.ts` and `scripts/report-dp-subscriptions.ts` (already run in prod, OL-103);
    - the DP price names in `.env.example`.
  - `/discharge-planner/billing` still redirects to the free dashboard.
- **Leftover (no migration):** the DP billing columns on `DischargePlannerProfile` (`stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, `licenseType`, `seatCount`, `trialEndsAt`, `currentPeriodEndsAt`) and the `DischargePlannerLicenseType` enum. These are unused by billing now; drop them in a later schema cleanup.
- **Founder:** archive the two old DP prices in the Stripe dashboard (OL-103 item 1) if not already done.
- **Path:** `src/lib/billing/fees.ts`, `src/lib/operator-plans.ts`, `src/app/api/webhooks/stripe/route.ts`
### OL-185: Payout and pay-out holes (ship before any live revenue) — PR open
- **Status:** 🟢 BUILT 2026-10-25 `fix/ol-185-payout-holes` (off main `599ba2e7`, not merged). Found by `context/REVENUE_REGISTER.md` (S1–S3).
- **(a) Self-serve payouts:**
  - Operator: the amount is checked against a server-computed balance = COMPLETED Care Wallet booking payments (DEPOSIT / MONTHLY_FEE) for the operator's homes − prior OPERATOR_PAYOUT rows (PENDING / PROCESSING / COMPLETED).
  - Above the balance → 400. The payout row is reserved under a per-operator advisory lock before the transfer. The transfer uses an idempotency key, and every transfer is logged with its basis.
  - Migration `20261025000000` adds `PaymentType.OPERATOR_PAYOUT`.
  - Caregiver: no funded ledger (timesheets are never charged to the operator) → 503 `payouts not enabled`, before Stripe is touched.
- **(b) `/api/timesheets/[id]/pay`:** no operator-charge step exists → gated behind `TIMESHEET_PAYOUTS_ENABLED` (default off → 503).
- **(c) Affiliate commission:** accrues only when `PLACEMENT_FEE_ENABLED` is on, the lane is FEE_ELIGIBLE, and the placement-fee Stripe invoice item was created. Nothing is backfilled.
- **Founder action:** run `npx tsx scripts/count-pending-affiliate-payouts.ts` on Render to see how many PENDING affiliate payouts the old code already wrote. The count is unknown from the sandbox (no prod DB access).
- **Path:** `src/lib/payouts/`, `src/app/api/{caregiver,operator}/payouts/request/route.ts`, `src/app/api/timesheets/[id]/pay/route.ts`, `src/lib/services/inquiry-conversion.ts`

### OL-180: One ElevenLabs post-call webhook URL — PR open
- **Status:** 🟢 BUILT 2026-10-24 `fix/ol-180-elevenlabs-router` (off main `1b4dcc59`, not merged).
- **Why:** ElevenLabs posts every agent's post-call events to one workspace URL. Neither existing route dispatched by `agent_id`: `call-result` 400'd Front Desk calls (no homeId); `inbound-lead` turned Listing Update calls into fake "other caller" leads.
- **Fix:**
  - `POST /api/webhooks/elevenlabs` verifies the HMAC once (`ELEVENLABS_WEBHOOK_SECRET`; 503 unset, 401 bad), then dispatches on `data.agent_id`: Front Desk → inbound-lead, Listing Update → call-result.
  - Unknown agent → a homeId in the payload ⇒ call-result, else inbound-lead.
  - Agent ids come from `ELEVENLABS_AGENT_ID_FRONT_DESK` / `ELEVENLABS_AGENT_ID_LISTING_UPDATE` (defaults = current agents).
  - The old routes call the same handlers (`src/lib/elevenlabs/post-call.ts`).
  - An empty `callback_phone` falls back to `system__caller_id`.
- **Founder action after merge:** in ElevenLabs, set the workspace post-call webhook to `https://getcarelinkai.com/api/webhooks/elevenlabs` and copy its secret to `ELEVENLABS_WEBHOOK_SECRET` in Render.
- **Path:** `src/app/api/webhooks/elevenlabs/route.ts`, `src/lib/elevenlabs/post-call.ts`, `src/lib/leads/inbound-lead.ts`

### OL-179: Tour requests on unclaimed homes black-holed — MERGED #785 `1b4dcc59`
- **Status:** 🟢 BUILT 2026-10-24 `fix/ol-179-unclaimed-tour-requests` (off main `f3a132fe`, not merged).
- **Found:**
  - (1) On `/homes/[id]`, "Schedule a Tour" did nothing on real listings. The `TourRequestModal` only ever rendered inside the old mock branch (removed in OL-175).
  - (2) The listing form's step-2 tour date was stripped by the Zod schema and never saved, although `Inquiry.tourDate` exists.
  - (3) `/api/family/tours/request` on an unclaimed home only called the paused claim drip.
- **Fix:**
  - "Schedule a Tour" opens the modal for a signed-in FAMILY and the listing form for everyone else.
  - `tourDate` is now validated (a bad value is dropped, never a 400) and saved.
  - Both tour paths on unclaimed homes go through `routeUnclaimedInquiry`. The queue row gets source `WEB_TOUR_REQUEST` and is tagged "web tour request" in `/admin/inbound-leads`.
  - The admin alert carries name, email, phone, home, requested date/time (ET), and the payer lane only when the family gave one (latest Inquiry or PlacementSearch answer).
  - The family confirmation (email + modal/screen) says "A CareLinkAI advisor will follow up." The modal reads `unclaimed` from the API, so find-care results get the right copy too.
  - Migrations: `20261024000001` (enum value) and `20261024000002` (`tourRequestId` unique).
- **Sweep of family-side forms:**
  - `/api/family/waitlist`: no UI posts to it, and it notifies no one for any home. Left as is and flagged.
  - Not leads to a home: favorites/save, reviews, the post-tour quote survey (tokenized, goes to CareLinkAI), AI match, "Chat with a Care Advisor", marketplace `/api/leads` (aides/providers only).
  - DP concierge tour: already routed to admin (OL-083-era).
  - No other form found.
- **Path:** `src/lib/leads/web-inquiry-lead.ts`, `src/app/api/family/tours/request/route.ts`, `src/app/api/inquiries/route.ts`, `src/lib/inquiries/schema.ts`, `src/components/tours/TourRequestModal.tsx`, `src/app/homes/[id]/page.tsx`

### OL-181: Dead email paths (EmailService mock fallthrough) — PR open
- **Status:** 🟢 BUILT 2026-10-24 `fix/ol-181-dead-email-paths` (off main `1b4dcc59`, not merged).
- **Why:** `src/lib/email-service.ts` picked its provider from `EMAIL_PROVIDER`. `sendgrid` isn't a known value, so it used the mock provider and these five callers sent **nothing**: `/api/demo-request`, `/api/marketplace/applications`, `/api/marketplace/applications/[id]`, `lib/services/reminders.ts`, `lib/services/family.ts` (mention emails).
- **Fix:**
  - all five now use `sendEmail` from `src/lib/email/transactional.ts` (guarded Resend, house from-address, category tags);
  - user-typed values are HTML-escaped (`escapeHtml`) in those templates;
  - demo-request alerts go to `ADMIN_NOTIFY_EMAIL` (it used to fall back to `EMAIL_FROM`, the noreply sender);
  - `src/lib/email-service.ts` (SES/SMTP/mock branches) and `test-email-service.js` are deleted;
  - `docs/EMAIL_SETUP.md` is marked superseded.
- **Render:** `EMAIL_PROVIDER`, `EMAIL_SERVER_*`, `SENDGRID_*` and `SMTP_*` are unread and can be deleted. `.env.example` never listed them.
- **Path:** `src/lib/email/transactional.ts`, the five callers

### OL-186: Paid-feature kill switches, all default OFF — PR open
- **Status:** 🟢 BUILT 2026-10-25 `feat/ol-186-paid-kill-switches` (off main `599ba2e7`, not merged). From `context/REVENUE_REGISTER.md`: several paths would charge the moment `STRIPE_SECRET_KEY` went live, with no flag.
- **Fix:** one registry, `src/lib/billing/paid-features.ts`. Each flag defaults off; `1/true/yes/on` turns it on.
  - With a flag off, the API returns **503** with a plain message, and the matching buttons, pages and nav links are hidden.
  - The client reads the flags from `GET /api/paid-features` (booleans only) through `usePaidFeatures`. Every flag reads as off until that call answers.
  - `/admin/checkout-preflight` gained a "Paid features" section with each flag's ON/OFF state.
- **Flags:**
  - `RIDES_PAYMENTS_ENABLED`: instant-book checkout + `/api/rides/[id]/pay`. A plain ride request still works.
  - `CARE_WALLET_ENABLED`: deposit, deposit-intent, pay-from-wallet.
  - `COMPLIANCE_KITS_ENABLED`: kit purchase. Kits already bought stay visible.
  - `FEATURED_LISTING_ENABLED`: `enable` only. `disable` always works.
  - `BACKGROUND_CHECKS_ENABLED`: the three order POSTs. Past results and the payment-confirm PUTs are not gated.
  - `MARKETPLACE_HIRE_FEE_ENABLED`: hiring always works. When off, no fee is queued or recorded (direct hire, application HIRE, shift-bid accept).
  - `OPERATOR_PLANS_ENABLED`: subscribe + switch-plan. `/plans` returns nothing purchasable, and onboarding step 4 offers "Complete setup" without a plan.
  - `CAREGIVER_PRO_ENABLED`, `FAMILY_PLUS_ENABLED`, `PROVIDER_LISTING_ENABLED`: their `/billing/subscribe` routes.
- **Never gated:** Stripe webhook, refunds, cancellations, every billing portal. Existing subscribers still get "Manage". Concierge (`CONCIERGE_CHECKOUT_ENABLED`) and the placement fee (`PLACEMENT_FEE_ENABLED`) are unchanged.
- **Founder action:** none to stay safe. Set a flag to `1` in Render only when that path should take money.
- **Path:** `src/lib/billing/paid-features.ts`, `src/hooks/usePaidFeatures.tsx`, `src/app/api/paid-features/route.ts`, `.env.example`

### OL-178: Listing map tiles — OpenStreetMap 403 → MapTiler — MERGED #784 `f3a132fe`
- **Status:** 🟢 BUILT 2026-10-24 `fix/ol-177-178-inquiries-maptiler` (off main `3af16f2c`, not merged).
  - **Cause:** OSM blocked every tile in production with a 403 ("Access blocked / tile usage policy"). Their policy blocks heavy app use and requests without a referrer, and the middleware sent `Referrer-Policy: no-referrer` on every page.
  - **Fix:** `src/lib/maps/tiles.ts` now builds MapTiler streets-v2 256px tile URLs with a `{r}` (@2x) suffix, keyed by `NEXT_PUBLIC_MAPTILER_KEY`. It carries the MapTiler + OSM attribution and the MapTiler logo control (free plan terms). Tiles use `referrerPolicy: strict-origin-when-cross-origin`, and the site header is now `strict-origin-when-cross-origin` (origin only cross-origin — no paths or tokens leave).
  - **No key:** maps show a static "Map unavailable" placeholder (the listing's address + Get Directions stay) with one console warning.
  - **Sweep:** `SimpleMap` (listing + `/search`) and the unused `InteractiveMap` now use MapTiler; the old `NEXT_PUBLIC_MAP_TILE_URL/_ATTRIBUTION` override and every OSM/CARTO tile URL are gone; `.env.example` and the PWA doc are updated.
  - **Tests:** e2e `listing-map-tiles.spec.ts` (fake key, `api.maptiler.com` intercepted, asserts no OSM/CARTO request and an origin-only Referer), unit tests, and a placeholder render test.
- **Founder action:** set `NEXT_PUBLIC_MAPTILER_KEY` in Render; it's build-time, so redeploy after. Restrict the key to the getcarelinkai.com origin in MapTiler Cloud. Check the free-tier tile quota in MapTiler Cloud; a paid plan would be over the $20/mo flag line.
- **Path:** `src/lib/maps/tiles.ts`, `src/components/search/SimpleMap.tsx`, `src/components/search/InteractiveMap.tsx`, `src/middleware.ts`

### OL-177: Inquiries on unclaimed homes black-holed — MERGED #784 `f3a132fe`
- **Unclaimed-home inquiry count since launch: NOT RUN.** The agent has no production DB access. Chris: run this read-only query in Render's shell (psql) and paste the totals here. It gives home, date and email domain only:
  ```sql
  SELECT h.name AS home, i."createdAt"::date AS created,
         split_part(lower(coalesce(i."contactEmail", fu.email)), '@', 2) AS email_domain
  FROM "Inquiry" i
  JOIN "AssistedLivingHome" h ON h.id = i."homeId"
  JOIN "Operator" o ON o.id = h."operatorId"
  JOIN "User" u ON u.id = o."userId"
  LEFT JOIN "Family" f ON f.id = i."familyId"
  LEFT JOIN "User" fu ON fu.id = f."userId"
  WHERE u.email = 'directory-unclaimed@carelinkai.system'
  ORDER BY h.name, i."createdAt";
  -- totals per home:  SELECT h.name, count(*) … same joins … GROUP BY h.name ORDER BY 2 DESC;
  ```
  Caveat: this counts homes that are still unclaimed; inquiries on homes claimed since then moved with the home.
- **Status:** 🟢 BUILT 2026-10-24 `fix/ol-177-178-inquiries-maptiler`.
- **Before:** `POST /api/inquiries` created the `Inquiry` (+ `LeadConsent`, and FollowUp rows only for URGENT/later stages). The operator SMS/email was skipped for unclaimed homes (placeholder account). `notifyUnclaimedHomeInquiry` → claim drip is paused (`CLAIM_DRIP_ENABLED` unset), so **nobody was notified**. The family screen claimed "we've sent your inquiry to {home}"; no family email existed.
- **Now:**
  - an unclaimed-home inquiry also creates an `InboundLead` (source `WEB_INQUIRY`, callerType FAMILY, conversationId `web-inquiry:<inquiryId>`) in `/admin/inbound-leads`, with a "web inquiry" flag, email and a link to the Inquiry;
  - `ADMIN_NOTIFY_EMAIL` is emailed through the shared `sendAdminLeadEmail` (guarded Resend) with family name, email, phone, home, payer lane and timeframe only;
  - the family gets a confirmation email, and the screen says "A CareLinkAI advisor will follow up." with no time promise.
- **Migration** `20261024000000_inbound_lead_web_inquiry` (additive: enum `InboundLeadSource`, `source` default CALL, `contactEmail`, `homeId`, `inquiryId` unique, `callbackPhone` nullable).
- **Env:** `ADMIN_NOTIFY_EMAIL` is **not set** in Render per the vault (Decisions_Queue 10/17: "No ADMIN_NOTIFY_EMAIL in Render"); context/ only ever says "confirm". Until it's set, alerts go to `CLAIM_NOTIFY_EMAIL` or else `chris@getcarelinkai.com`.
- **Not covered here:** the family tour modal (`/api/family/tours/request`) on unclaimed homes has the same gap (claim drip only).
- **Path:** `src/lib/leads/web-inquiry-lead.ts`, `src/lib/leads/inbound-alerts.ts`, `src/app/api/inquiries/route.ts`, `src/app/admin/inbound-leads/page.tsx`

### OL-176: Unverified claims on /homes/[id] (amenities, description, gender, contact) — MERGED
- **Status:** ✅ MERGED 2026-10-24 #783 `3af16f2c`; prod-verify run 40102205609 green (`/homes/cmql0xbos0006r7jcitqgqhds` → 200, footer `@3af16f2`).
- **Status:** 🟢 BUILT 2026-10-24 `fix/ol-176-unverified-amenities` (off main `3c08889d`, not merged).
  - **Amenities:** stored as one `String[]` per home, verified from the EntityEvent log as a whole list (an OPERATOR / ADMIN / VA_CALL write). Unverified lists render under the heading "Reported features — confirm on your tour" with plain bullets, no checkmarks. I picked relabel over hide because the list has no per-item source.
  - **Sweep:**
    - an unverified description gets a "written from public sources" note, and the tagline is hidden;
    - "All genders welcome" no longer appears by default (the API turned an empty column into 'ALL'); gender shows only when an accountable source set it;
    - an unclaimed listing's "Facility Contact" no longer shows the directory placeholder account (company, name and system email); the API returns `operator: null` for unclaimed homes;
    - an imported price range is labeled "Estimated range";
    - "What's typically included" became "Ask what the monthly rate includes";
    - the "within 24 hours" reply promise was removed.
  - **Provenance:** `PROVENANCE_FIELDS` += `description`, `genderRestriction`; operator home-create records them too.
  - **prod-verify:** gained the `footer_pages` and `sitemap_paths` inputs (read-only).
  - **Tests:** unit tests plus the e2e `listing-unverified-claims.spec.ts` (unclaimed fixture via the dev seed's new `unclaimed` / `amenities` / `description` / `tagline` fields).
- **Data note:** the three batch-2 homes enriched by `scripts/enrich-batch2-held-homes.ts` (Windsor Heights, Bloom at Rocky River, Meadow Falls) keep their copy; it now renders labeled. Making it render as fact takes an operator claim+edit or an admin save.
- **Path:** `src/lib/homes/listing-facts.ts`, `src/app/homes/[id]/page.tsx`, `src/app/api/homes/[id]/route.ts`, `src/app/api/dev/upsert-operator/route.ts`, `.github/workflows/prod-verify.yml`

### OL-175: OL-171…OL-174 follow-ups — MERGED
- **Status:** ✅ MERGED 2026-10-24 #782 `3c08889d`; the deploy was verified (Post-deploy revalidate covered all 20 suburbs; prod-verify checked the five new suburb pages and `/homes/cmql0xbos0006r7jcitqgqhds` at 200 with footer `@3c08889`, plus the sitemap).
- **Status:** 🟢 BUILT 2026-10-24 `fix/listing-mock-learn-suburbs` (off main `bfba374c`, not merged). It does four things: removes the listing page's mock mode; gives `/learn` the "Financing option (CareCredit)" wording plus the not-affiliated line, shared with the listing; offsets the listing's sticky bar and sidebar by `--site-header-h`; adds suburb pages for Lyndhurst, Mayfield Heights, Shaker Heights, Euclid and Solon (Cleveland Heights skipped, 1 roster home).
- **Still open from the OL-171…174 list:** operator-edited listings show "contact to confirm" for capacity until the operator saves once; Google Rich Results Test on Beachwood; skim the fifteen newer suburb intros for local accuracy.
- **Path:** `src/app/homes/[id]/page.tsx`, `src/lib/financing/carecredit.ts`, `src/components/site/SiteHeader.tsx`, `src/lib/directory/suburbs.ts`

### OL-171…OL-174: public brand shell, SEO pass, listing fixes, concierge polish — MERGED
- **Status:** ✅ MERGED 2026-10-24 (authorized by Chris), one at a time, squash, branches deleted: #777 `ba7d9ba3` → #778 `972c8b63` → #779 `83367965` → #780 `3c29ad10`. Each stacked branch was brought up to date with a merge from main (not a rebase — no force-push); the squash-vs-original OL-171 conflicts resolved to main's version, the concierge-page import conflict kept both imports. Follow-ups below go into one follow-up PR.
- **Status:** 🟢 BUILT 2026-10-24 — **#777 OL-171** `feat/ol-171-brand-shell` (base main): shared `SiteHeader`/`SiteFooter`/`SiteShell`/`BrandHero` (`src/components/site/`), zero client JS (native `<details>` menu); `/cleveland/*` + `/concierge` layouts and `PublicShell` (search, listing) use it; hero band, brand buttons, homepage card style; Lighthouse a11y + SEO 100 on Beachwood after site-wide fixes (pinch-zoom, badge contrast, advisor button name, robots `Host`). · **#778 OL-172** `feat/ol-172-seo-pass` (stacked on #777): one title suffix site-wide, ≤60/140–155 lengths, OG + Twitter everywhere, branded `next/og` images per page type, BreadcrumbList / FAQPage / ItemList, sitewide Organization (no price), care-type hubs list real homes or a named fallback, ten new suburbs (Mentor, Cuyahoga Falls, Rocky River, Medina, Hudson, North Olmsted, Avon, Twinsburg, Chardon, Stow), nearby-suburb + listing back-links. · **#779 OL-173** `fix/ol-173-listing-page` (stacked on #777): OSM tiles + StrictMode double-init fix, no unverified capacity/availability/staffing, amenities labeled, CareCredit "partnered" removed (plain link, no agreement), waiver line on the listing. · **#780 OL-174** `feat/ol-174-concierge-polish` (stacked on #777): free + private-pay lane cards (price client-side only, never for federal payers), phone + promise by the CTA, FAQ + FAQPage.
- **Merge order:** #777 first; then #778, #779, #780 in any order (each needs "Update branch"). #778 and #780 both add one import line to `src/app/concierge/page.tsx` — whichever merges second resolves a one-line conflict (keep both imports).
- **Follow-ups:** the first four items below are handled in OL-175. `/learn` still says "partnered with CareCredit"; listing page mock mode (`carelink_mock_mode=1` cookie) renders invented data; operator-edited listings show "contact to confirm" for capacity until the operator saves once (event-log provenance); listing page's own sticky bar may slide under the sticky site header; Google Rich Results Test on Beachwood after deploy; skim the ten new suburb intros for local accuracy.
- **Path:** `src/components/site/`, `src/lib/seo/page-meta.ts`, `directory-faq.ts`, `og-image.tsx`, `listing-meta.ts`, `src/lib/directory/suburbs.ts`, `care-type-listings.ts`, `src/lib/homes/listing-facts.ts`, `src/lib/maps/tiles.ts`, `src/app/concierge/ConciergeLaneCards.tsx`, `src/lib/concierge/faq.ts`

### OL-169: Post-deploy revalidate raced the Render rollover — MERGED
- **Status:** ✅ MERGED 2026-10-22 #775 `caff286b`.
- **Status:** 🟢 BUILT 2026-10-22 `fix/ol-169-post-deploy-revalidate` — run 39652136961 on `5d5fb05` failed "footer sha … is @fcdeebf, expected @5d5fb05": the step purged + fetched once right after the FIRST `/api/version` hit that carried the new sha, while the old instance was still answering page requests (the page is `force-dynamic`, so no Next cache was involved). Fix: `scripts/post-deploy-verify.sh` (was inline bash) waits for 3 consecutive `/api/version` matches, purges, asserts the purged list contains `/` + ≥ 9 `/cleveland/*` pages, then checks the footer sha on `/`, every `/cleveland/*` page and `/concierge` with retries (5 min each, one re-purge halfway); one summary annotation. Workflow gains a `pull_request` trigger (verify-only against production, no secret) and a `dry_run` dispatch input; `__tests__/revalidate.unit.test.ts` pins the script's page list to `hubRevalidatePaths()`. Merge-preview run green; local dry run showed `/` and `/cleveland/assisted-living` checked.
- **Path:** `scripts/post-deploy-verify.sh`, `.github/workflows/post-deploy-revalidate.yml`

### OL-167: Inbound phone lane (a–d) — MERGED
- **Status:** ✅ MERGED 2026-10-21 (authorized by Chris) — a #768 `0f1b2ba8` · b #771 `481a463d` · c #772 `fcdeebf3` · d #770 `5d5fb05d`. All head branches auto-deleted. Residual: founder actions below (env names + ElevenLabs agent webhook).
- **Status:** 🟢 BUILT 2026-10-21 — **a** #768 `feat/ol-167a-inbound-lead` (base main): `InboundLead` model + enums (`InboundCallerType`, `InboundLeadUrgency`, `InboundLeadStatus`), `AvailabilitySource.AI_CALL_INBOUND`, `EntityType.INBOUND_LEAD` (migrations `20261021000000`, `20261021000001`), `POST /api/webhooks/elevenlabs/inbound-lead` (same HMAC verifier + `ELEVENLABS_WEBHOOK_SECRET`, 503 unset, idempotent on `conversation_id`), FACILITY lane → `AvailabilityObservation` matched by caller phone (unmatched → InboundLead FACILITY "unmatched facility update"), `src/lib/phi-guard.ts` (reason → `[redacted — possible PHI]` + `phiFlag`). · **b** #771 `feat/ol-167b-inbound-alerts` (stacked on a): PLANNER → SMS `ADMIN_NOTIFY_MOBILE` (Twilio) + email `ADMIN_NOTIFY_EMAIL` (Resend); FAMILY/OTHER email only; FACILITY nothing; SMS never carries reason/transcript; fire-and-forget. · **c** #772 `feat/ol-167c-inbound-leads-admin` (stacked on a): `/admin/inbound-leads` + `GET /api/admin/inbound-leads`, `PATCH /api/admin/inbound-leads/[id]` (contacted/close), PLANNER daily count on `/admin/concierge/metrics` (`plannerLeads`), dev seed `/api/dev/inbound-lead`, e2e `inbound-leads.spec.ts`. · **d** #770 `feat/ol-167d-publish-number` (base main): (216) 245-9482 on footer, new `/contact`, `/concierge` both lanes, `/llms.txt`, Organization JSON-LD `telephone` (`src/lib/contact.ts`).
- **Merge order:** #768 → #771 and #772 (either order, each needs "Update branch") · #770 and #769 independent.
- **Founder actions after merge:** set `ADMIN_NOTIFY_MOBILE` (E.164) and confirm `ADMIN_NOTIFY_EMAIL` in Render; point the ElevenLabs inbound agent's post-call webhook at `/api/webhooks/elevenlabs/inbound-lead` with data-collection keys `caller_type, caller_name, organization, callback_phone, urgency, reason` (+ `beds_available, starting_price, medicaid_waiver` for facility callers); `ELEVENLABS_WEBHOOK_SECRET` still unset (OL-163 residual).
- **Decisions:** callback number falls back to the caller-id number, no number at all → 400 `callback_phone_required`; facility match = last-4 `contains` then exact E.164; telephone on the Organization JSON-LD (the listing LocalBusiness nodes keep the facility's own phone); `/contact` page created (none existed); admin default view "open" (new + contacted).
- **Path:** `src/lib/leads/`, `src/lib/phi-guard.ts`, `src/lib/contact.ts`, `src/app/api/webhooks/elevenlabs/inbound-lead`, `src/app/api/admin/inbound-leads`, `src/app/admin/inbound-leads`, `src/app/contact`

### OL-168: Homepage copy pass (verification framing) — MERGED
- **Status:** ✅ MERGED 2026-10-21 #769 `2a2eba26` (after OL-167d the FAQ number renders from `CONTACT_PHONE_DISPLAY`; visible text unchanged).
- **Status:** 🟢 BUILT 2026-10-21 `feat/ol-168-homepage-copy` (base main) — H1 "Verified Cleveland senior living. Free for families.", verification subhead, no "AI" in any h1/h2/subhead/CTA, five FAQ answers replaced verbatim + three new entries (Medicaid, "How do you know a bed is really open?", "Can I call someone?" with the number); copy-rules test extended to the hero + FAQ. Decision: feature-card names ("AI Resident Matching Engine" etc.) left as product names. `src/app/HomePageClient.tsx`, `__tests__/concierge-screener.unit.test.ts`.

### OL-163: AI availability-call agent (a–e) — PRs #750–#754 open (stacked), DO NOT MERGE until Chris reviews
- **Status:** ✅ MERGED 2026-10-21 — #750 `42d6678` · #751 `32eac1f` · #752 `14fa505` · #753 `50dec00` · #754 `fd865ba`. Residual: set `ELEVENLABS_WEBHOOK_SECRET` in Render; run the pilot; OL-166c adds the AI_CALL price write.
- **Status:** 🟢 BUILT 2026-10-20 — a webhook #750 · b call list #751 · c QA queue #752 · d badge + agent keys #753 · e do-not-call + retry #754. Merge in order; each needs "Update branch" first. Chris: set `ELEVENLABS_WEBHOOK_SECRET` in Render; map the agent's data-collection fields to the observation keys; 12-home pilot Tue–Thu; Elizabeth QAs at `/admin/call-qa`. Decision: price from calls stays on the observation (add `PriceSource.AI_CALL` later?).
- **Path:** `src/lib/availability/call-result.ts`, `call-rules.ts`, `call-qa.ts`, `src/app/api/webhooks/elevenlabs/call-result`, `src/app/api/admin/availability/call-list`, `src/app/admin/call-qa`, `prisma/migrations/20261020000000_*`, `20261020000001_*`

### OL-159: hub staleness — PR #756 open
- **Status:** ✅ MERGED 2026-10-21 `b750d9b`. Prod-verify after `fd865ba` found the footer sha fresh (= main) — staleness did not reproduce; keep watching `post-deploy-revalidate.yml`.
- **Status:** 🟢 BUILT 2026-10-20 — static hub pages `revalidate = 3600`, `POST /api/admin/revalidate`, import-script purge, `post-deploy-revalidate.yml` asserts footer sha = main + waiver lines after every deploy and dumps cache headers (if `cf-cache-status: HIT` shows up, the fix is an edge-cache rule, not code).

### OL-160: cron diagnostics — PR #755 open
- **Status:** ✅ MERGED 2026-10-21 `1f30ff6`.
- **Status:** 🟢 BUILT 2026-10-20 — `src/lib/cron-auth.ts`; DP Follow-ups workflow + `scripts/run-cron.js` name "auth 401 — CRON_SECRET mismatch" vs "5xx — app error". Found + fixed: reminders cron routes were fail-open when `CRON_SECRET` was unset.

### OL-161: POST /_error — PR #759 open
- **Status:** ✅ MERGED 2026-10-21 `ed63db0` (prod `POST / → 405` check runs in verification #2).
- **Status:** 🟢 BUILT 2026-10-20 — middleware 405 for non-GET on page routes; e2e `POST / → 405`.

### OL-162: checkout preflight — PR #757 open
- **Status:** ✅ MERGED 2026-10-21 `b8835e5`.
- **Status:** 🟢 BUILT 2026-10-20 — `/admin/checkout-preflight` booleans only; `isCheckoutEnabled` refuses on mismatch (live key in production, price id, webhook secret, admin email).

### OL-166: Concierge / pricing / email follow-ups (a–d) — MERGED
- **Status:** ✅ MERGED 2026-10-21 — a Terms disclosure `991a666` · b free-lane hero `0abc011` · c AI_CALL price `adc04a4` · d /api/email/send → Resend `9ff47d5` (Render `SENDGRID_API_KEY` unused). Residual: none; #766 (prod-verify checks) awaiting review.

### OL-165: Family Concierge v2 copy (five-mistakes framing) — PR #761 open, stacked on #749
- **Status:** ✅ MERGED 2026-10-21 `1ee4d49` (#749 `63e394e` first). Residual → OL-166a (Terms disclosure back) and OL-166b (free-lane hero).
- **Status:** 🟢 BUILT 2026-10-20 — copy + structure only from the vault v2 offer doc: headline on the $5,000 mistake, guarantee subhead, "Free for families" above the fold, nine deliverables, verbatim not-included list, homepage / dashboard card / Terms §15 aligned; copy-rule tests (no "AI", no "legwork", no promised outcome, no facility fee). Residual: the free lane sees the "$5,000 mistake" H1 (not a price) — Chris to confirm. `src/lib/concierge/offer.ts`.

### OL-155: Sprint W5 batch — six stacked PRs open (#743–#748), merge in order
- **Status:** ✅ MERGED 2026-10-20 — #743 `32b9422` · #744 `99fb3b3` · #745 `ab88429` · #746 `81fa7d9` · #747 `8fe9a0b` · #748 `f47326d`, each verified live via `prod-verify.yml` (12 cards, /concierge, listing page, ping). Follow-up #749 (not-sure lane both, OL-158 copy, Terms Ohio, CI split) open.
- **Prior status:** 🔴 OPEN (2026-10-17) — #743 OL-154 flake · #744 EntityEvent history · #745 Medicaid waiver + acceptance + WRAAA import · #746 paid concierge · #747 Rich Results fix · #748 operator contact card. Each retargets to `main` when its base merges. Post-merge: run the Rich Results test on `/cleveland/assisted-living` (expect Carousel valid); check `/admin/homes/<id>` History tab renders.
- **Update 2026-10-17 (later):** all six green. #748 head `667645d` moved `e2e/operator-availability-contact.spec.ts` into the `e2e-operator-claim` job (the portal compile tipped the shared concierge dev server over its memory ceiling). Merge train runs one at a time with `prod-verify.yml` (dispatched from `feat/w5-followup`, which adds the card-count / `/concierge` / listing-page checks) because this sandbox's network policy denies `getcarelinkai.com`. Branch protection requires up-to-date branches → each stacked PR gets a branch update + CI rerun before its merge. Follow-up PR (`feat/w5-followup`: not-sure lane both, OL-158 copy, Terms Ohio, CI split) opens after #748 is live. `chore/post-merge-checks-w4` deletion is blocked from this session (403) — Chris deletes it in the UI.
- **Path:** the six branches; `context/DEV_SESSION_SUMMARIES.md` 2026-10-17 entry

### OL-156: WRAAA waiver import — production dry run + apply (founder, after #745)
- **Status:** 🔴 FOUNDER — Render shell: `npx tsx scripts/import-waiver-baseline.ts` (dry run) → paste matched / unmatched / would-change counts, then `--apply`. The two rows without an ODH license (Middleburg-Legacy Place, 740 Hepburn Rd; Echelon Assisted Living, 635 North Huntington, Medina) match by normalized street + city only — the report lists them under "address match" or "unmatched". Unmatched rows are printed by name for a manual look (likely missing `odhLicenseNumber` or a different `address.street` spelling). Ambiguous licenses are never written.
- **Path:** `scripts/import-waiver-baseline.ts`, `src/lib/medicaid/waiver-import.ts`, `data/medicaid/wraaa_alw_2026_10_16.csv`

### OL-157: Paid Family Concierge go-live checklist (ships OFF in #746)
- **Status:** 🔴 FOUNDER — (1) create a one-time $399 Price in the Stripe dashboard (code never creates products/prices) → `STRIPE_PRICE_FAMILY_CONCIERGE` on Render; (2) add `checkout.session.completed`, `checkout.session.expired`, `charge.refunded` to the existing webhook endpoint (same `STRIPE_WEBHOOK_SECRET`); (3) `CONCIERGE_CHECKOUT_ENABLED=1` when ready (unset = "Request the concierge", unpaid); (4) optional `CONCIERGE_MONTHLY_CAP` (default 4; counts PAID + REQUESTED_UNPAID this calendar month). Admin "paid" email goes to `ADMIN_NOTIFY_EMAIL`. Terms §13 governing law → Ohio / Cuyahoga County on `feat/w5-followup` (was California / SF).
- **Path:** `src/lib/concierge/orders.ts`, `src/app/api/concierge/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `.env.example`

### OL-158: Fee-model wording after the family-paid concierge (decision)
- **Status:** 🟢 BUILT on `feat/w5-followup` (2026-10-17; Chris decided the points: free to search / contact homes; homes never pay to be listed or ranked; optional $399 flat concierge for private-pay families with the 2-business-day refund; Medicaid / Medicare / VA help always free; no facility move-in fee mentioned). Closes when the follow-up PR merges after #748.
- **Prior status:** 🟡 DECISION — `FEE_MODEL_LINE` (`src/lib/seo/jsonld.ts`, published in `/llms.txt` + Organization JSON-LD + every listing's "Free Medicaid lane" property) still reads "Flat fee, paid by the facility, private-pay placements only" (the OFF placement fee). With #746 the public offer is a family-paid $399 concierge; the screener copy was updated, `llms.txt` was not. Decide the one-line public fee statement and update in one place.
- **Path:** `src/lib/seo/jsonld.ts`, `src/lib/seo/llms-txt.ts`

### OL-148: Sprint W4 batch — six PRs open (#733–#738), stacked on W3; merge W3 first
- **Status:** ✅ CLOSED 2026-10-16/17 — W3 + W4 merged in order (final `adbbaec`), deploy verified. OL-150 residual: the operator-portal contact card now exists (#748). OL-141 residual: the Rich Results test found the Carousel invalid → fixed in #747 (re-test after merge). OL-146 closed by #741 (`next/font/local`); the dev-server memory-restart flake remains (one re-run on #745's push run on 2026-10-17). OL-149/OL-122: `.env`/`.env.local` untracked + gitleaks CI (#740), backups deleted (#742) — key rotation + history scrub still founder.
- **Prior status:** 🔴 OPEN (2026-10-13 evening) — #733 concierge intake (base #730) · #734 claim re-send list (base #727) · #735 suburb guard + Beachwood/Lakewood (base #731) · #736 availability ping (main) · #737 facility accept/decline (main) · #738 concierge metrics (base #737). The brief assumed W3 was merged; it is not — stacked PRs retarget to `main` automatically when their base branch is deleted on merge. Nothing to set in Render. Post-merge checks: #735 `npx tsx scripts/check-suburb-listings.ts` on Render; #734 read the `listed` count on `/admin/claim-resend`; #736 `select count(*) from "AvailabilityContact"` = 0 until someone opts in.
- **Path:** the six branches; `context/DEV_SESSION_SUMMARIES.md` 2026-10-13 (evening) entry

### OL-149: Tracked `.env.local` carries a real-looking Resend key — **founder, with OL-122**
- **Status:** 🔴 FOUNDER — `git ls-files` shows `.env.local` is committed (last touched in #660) with `RESEND_API_KEY=re_Z…` (not the `re_placeholder…` the committed `.env` has). `next dev` loads `.env.local` over `.env`, so any local e2e run (CI is safe — no key) can deliver real mail: the 0a local run on 2026-10-13 likely sent a "new concierge request" notification to the admin notify inbox. Rotate the key in Resend, untrack the file, scrub history together with OL-122. Until then run local dev with `RESEND_API_KEY=re_placeholder_key_set_on_render` (never empty — `email.ts` constructs `new Resend()` at import and throws on an empty key).
- **Path:** `.env.local` (tracked), `.env`, `src/lib/email.ts:20`

### OL-150: One-tap availability ping — go-live checklist (ships OFF in #736)
- **Status:** 🔴 FOUNDER — to turn on: (1) `COMPANY_POSTAL_ADDRESS` set (already the claim-drip gate); (2) `CRON_SECRET` set on Render (fail-closed); (3) `PING_ENABLED=1`; (4) uncomment the schedule in `.github/workflows/availability-ping.yml` (Mondays 14:00 UTC) or `workflow_dispatch` once; (5) enter the 15 Tier-A warm opt-ins via `/admin/availability-pings` → "Add a contact (opt-in captured on a call)" (source `admin_call` — the only way an unclaimed listing is pinged); (6) optional: wire an inbound-email provider to `POST /api/availability/ping/inbound` with `PING_INBOUND_SECRET` so plain replies parse too. SMS stays a stub (`SMS_PING_ENABLED` + no provider) until the TCPA review (Haran). Operator-portal UI for the contact is API-only (`PUT /api/operator/availability-contact`) — decide whether a card on the operator home page is wanted.
- **Path:** `src/lib/availability/ping-engine.ts`, `src/app/api/cron/availability-ping/route.ts`, `.github/workflows/availability-ping.yml`

### OL-140: Sprint W3 batch — six PRs open, merge in order 726 → 727 → 728 → 729 → 730 → 731
- **Status:** 🔴 OPEN (2026-10-13) — #726 Sentry trace volume · #727 agency cohort landing + `ClaimRequest` + cohort claim links (+ `/claim` made public) · #728 listings on `/cleveland/assisted-living` · #729 suburb pages (base = #728's branch) · #730 `/concierge` · #731 JSON-LD + `/llms.txt` (base = #729's branch). #729/#731 retarget to `main` when their base branch is deleted on merge. Verify after #726: Sentry Explore `transaction:"middleware GET" is_transaction:true` over 1h is empty. After #727: `select count(*) from "ClaimRequest"` works on Render (migration applied).
- **Path:** the six branches; `context/DEV_SESSION_SUMMARIES.md` 2026-10-13 entry

### OL-141: Google Rich Results test for #731 (founder paste, post-deploy)
- **Status:** 🔴 FOUNDER — the sandbox has no egress, so the test was not run pre-merge. After #731 deploys: https://search.google.com/test/rich-results on one claimed ACTIVE listing (`/homes/<id>` → expect "Local Business", no errors) and on `/cleveland/assisted-living` (expect no errors; ItemList has no rich-result card). Paste into #731.
- **Path:** `src/lib/seo/jsonld.ts`, `src/app/homes/[id]/layout.tsx`

### OL-142: Concierge price + real intake (decisions for #730)
- **Status:** 🟢 BUILT in #733 (2026-10-13 evening) — fee model decided and rendered ($2,500 flat, facility-paid, private-pay only, families pay nothing; `CONCIERGE_FEE_MODEL`), CTA is a real form into the DP concierge queue (`source=concierge_page`). Residual decision: whether the fee is ever charged (no Stripe product/price; `PLACEMENT_FEE_ENABLED` still unset). Previously: `/concierge` shipped with no price and a placeholder CTA into `/get-started`. Decide (a) the flat fee and where it renders (the `concierge-fee-model` block is ready; keep the screener gate), (b) the real intake: a dedicated concierge request form (new table, like `ClaimRequest`) or the DP concierge queue reused for families. No Stripe product/price exists; do not create one until (a).
- **Path:** `src/app/concierge/ConciergeScreener.tsx`, `src/lib/concierge/screener.ts` (`CONCIERGE_REQUEST_PATH`)

### OL-143: Claim-nudge links were dead for new operators until #727 (`/claim` behind the login wall)
- **Status:** 🟡 LIST BUILT in #734 (2026-10-13 evening) — `/admin/claim-resend` + CSV lists every nudged-never-registered operator with a fresh 45-day cohort-preserving link, warm leads first; **nothing is sent** and claim-drip.yml stays disabled. Residual decision: hand-send the batch (count from the page after deploy). Previously: `/claim?token=` (used by `scripts/send-claim-nudges.ts`) redirected logged-out visitors to `/auth/login`; only operators who already had an account could use the link. Fixed in #727 (`/claim` in `PUBLIC_PAGE_PREFIXES`). Decide whether to re-send to nudge recipients who never registered (`ClaimLinkVisit` has no rows for them). claim-drip.yml stays disabled regardless.
- **Path:** `src/lib/routing/public-routes.ts`, `scripts/send-claim-nudges.ts`

### OL-122: Committed `.env` contains live secrets (credential exposure) — **founder, first**
- **Status:** 🔴 OPEN — rotation + history scrub is Chris's (explicitly reserved). Nothing in sprint W2 touched `.env` or history.
- **Path:** `.env` (tracked), `.gitignore`, `.github/workflows/*.yml` (`SENTRY_DSN: ""` overrides depend on this staying as-is until rotated)

### OL-124: Placement-fee invoice path is LIVE on inquiry→resident conversion and ignores the payer lane (AKS)
- **Status:** 🟢 GATED — merged 2026-10-10 as `0df4b18` (#721): `PLACEMENT_FEE_ENABLED` unset = OFF, and even when on only `FEE_ELIGIBLE` lanes bill; skipped decisions log `placement_fee_skipped`. **Residual:** review the legacy `PLACEMENT_FEE` Payment rows the old path wrote (`scripts/report-placement-fee-payments.ts`, read-only). History: `triggerPlacementFee()` used to run after every conversion: creates a `PLACEMENT_FEE` Payment (`PLACEMENT_FEE_CENTS`, **$1,500 in Render per OL-030**, $500 default) and queues a Stripe invoice item when the operator has a `stripeCustomerId`; never reads `payerSource`/`deriveFeeLane()`. Built as OL-014 (April) before the AKS firewall (OL-114) and the OL-102 "do NOT build" parking existed — the two decisions contradict and this is the live one. Audit + tripwire test on PR #716. Proposed fix: `PLACEMENT_FEE_ENABLED` flag (default off) + `FEE_ELIGIBLE`-only gate.
- **Path:** `src/lib/services/inquiry-conversion.ts` (`triggerPlacementFee`), `src/app/api/operator/inquiries/[id]/convert/route.ts`, `docs/audits/OL-114_PAYER_SOURCE_AUDIT_2026-10-05.md`, `__tests__/payer-lane.audit.test.ts`

### OL-125: `/cleveland/*` landing pages were auth-gated; unknown paths bounced to login
- **Status:** ✅ MERGED 2026-10-10 `4f95aec` (#714), verified live: five /cleveland* pages 200 + indexable, /zzz-nope + /.env 404. `/cleveland` added to the public list; first-segment-unknown paths now 404 via `/_not-found` before `withAuth`; `/monitoring` (Sentry tunnel) un-gated. Unit + e2e (`e2e/public-routes.spec.ts`, in the `e2e-concierge` job).
- **Path:** `src/middleware.ts`, `src/lib/routing/public-routes.ts`

### OL-126: Render memory restarts (10/5 04:05 UTC, 9/13 15:40 UTC)
- **Status:** ✅ MERGED 2026-10-11 `b0b4078` (#715), verified live (/api/ping 200). Two founder settings still open (OL-138). Finding: 71 `PrismaClient` instances with per-request `$disconnect()`, a 4 GB heap cap on a smaller instance (922 MB RSS observed), and the health check rendering `/` (~40K traced `GET /` a day). Fix: one client per process, `NODE_HEAP_MB` heap cap (default 1024), `GET/HEAD /api/ping`, `tracesSampler` dropping pollers/bots.
- **Path:** `src/lib/prisma.ts`, `src/lib/sentry/trace-sampling.ts`, `src/app/api/ping/route.ts`, `package.json` (`start`), `docs/MEMORY_RESTARTS_2026-10-05.md`

### OL-127: Sentry CARELINK-AI-19 — 401s reported as errors
- **Status:** ✅ MERGED 2026-10-11 `b402dd5` (#718), verified live. `captureError()` drops `UnauthenticatedError`/`UnauthorizedError`; pipeline/convert/status routes short-circuit to `handleAuthError()`; client fetchers redirect to login on 401 (the stale-tab SWR poll was the logged-out caller).
- **Path:** `src/lib/sentry.ts`, `src/app/api/operator/inquiries/pipeline/route.ts`, `src/hooks/useInquiries.ts`, `__tests__/pipeline.auth-401.api.test.ts`

### OL-128: Prisma cold start — `prisma:client:detect_platform` p95 8.9 s
- **Status:** ✅ MERGED 2026-10-11 `97e6583` (#719), verified live. Confirm in Sentry over the next week that `prisma:client:detect_platform` is gone from request traces. `binaryTargets` was already pinned; Prisma always runs the probe once per client, so the fix is one client + a boot-time `warmPrisma()` from `instrumentation.ts`. Confirm in Sentry after deploy: span gone from request traces.
- **Path:** `src/lib/prisma-warmup.ts`, `src/instrumentation.ts`, `docs/PRISMA_COLD_START_2026-10-05.md`

### OL-129: `isDemo` gaps in the public directory APIs (OL-112 follow-through)
- **Status:** ✅ MERGED 2026-10-11 `189dd8d` (#717), verified live. `/api/search` already filtered; `/api/homes/search` did not; `/api/homes/[id]` served demo homes logged-out. Jest + e2e (`e2e/search-demo-filter.spec.ts`). **Residual:** live Cleveland listing count still to be read by Chris (`curl 'https://getcarelinkai.com/api/search?location=Cleveland&limit=1' | jq .pagination.totalResults`) — agent env cannot reach prod.
- **Path:** `src/app/api/homes/search/route.ts`, `src/app/api/homes/[id]/route.ts`, `src/app/api/dev/upsert-operator/route.ts`

### OL-138: Render health-check path + heap env (founder settings for #715)
- **Status:** 🔴 FOUNDER — #715 is live, so this is now actionable: Render → Settings → Health Check Path: **`/api/ping`** (any uptime monitor too); set **`NODE_HEAP_MB`** per plan (Starter 256 · Standard 1024 default · Pro 2560). `render.yaml` still says `healthCheckPath: /` — update it in the same move (left untouched per "no Render settings changes").
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

### OL-214: CI minutes trim (path filters, cancel superseded runs, real Next.js cache) — PR open
- **Status:** 🟢 BUILT 2026-10-28 `chore/ci-trim-minutes` (off main `f059d6a0`, not merged).
- **Change:** a `changes` job in `ci.yml`, `quality.yml` and `e2e-family.yml` lists the PR's files; docs-only PRs (`*.md`, `*.pdf`, `docs/`, `context/`) skip build-and-test / quality / all six e2e jobs. Skipped (via `if:`), never a workflow-level `paths:` filter, so required checks still report; if the file list can't be read it runs everything. `quality.yml` cancels a superseded PR run (main still runs to completion). `ci.yml` no longer also runs on `chore/**` pushes (the PR run covers them). Next.js build cache added to `ci.yml` / `quality.yml`, and its key now includes the source hash everywhere (the old lockfile-only key was saved once and never refreshed).
- **Already in place (#808):** e2e skips draft PRs and runs on push only for main/master; per-ref `cancel-in-progress` on CI / e2e / secret-scan.
- **Not done (needs branch-protection info):** `quality.yml` and `ci.yml` run the same lint + type-check + jest + build on every PR. Dropping one halves that cost, but only safe once we know which is a required check.

## 🟡 LATER (backlog, ordered roughly by leverage)

### OL-222: PhotoGallery's slide counter overlaps the photo caption
- **Status:** 🟡 open (found 2026-10-29 during OL-217; already on main, see the OL-217 baseline `home-claimed-guest-1280`).
- **What:** on `/homes/[id]` the gallery's bottom-left "1 / 3" counter is drawn over the "Photo 1" caption text, so both are hard to read. OL-217 froze PhotoGallery internals, so it wasn't touched there. Fix: give the caption and counter separate slots (or drop the generic "Photo N" caption when there's no real one).
- **Path:** `src/components/homes/PhotoGallery.tsx`

### OL-223: Claimed gallery shows two "see all photos" buttons
- **Status:** 🟡 open (found 2026-10-29 in the OL-217 review; not fixed in #8).
- **What:** at ≥ md, a home with photos shows PhotoGallery's own "View All" on the hero and OL-217's "All photos" on the second tile. Both open the same lightbox. Keep one: either drop "All photos" (smallest) or hide PhotoGallery's button when the page provides its own (needs a PhotoGallery prop, since its internals were frozen in OL-217).
- **Path:** `src/app/homes/[id]/page.tsx` (gallery grid), `src/components/homes/PhotoGallery.tsx`

### OL-224: Compact limited-data states on the facility profile (mobile)
- **Status:** 🟡 open (found 2026-10-29 in the OL-217 review; not fixed in #8).
- **What:** thin listings (most unclaimed homes) read long on phones:
  - The no-photo hero (`HomeImagePlaceholder`) is `md:h-80`; make it shorter at ≥ md.
  - Tighten sections with little or no data: "Reported features" with a single item, an empty Reviews block, and no inspections on file.
  - Keep the honest copy. Never imply a zero; don't hide the section headings the section nav links to.
- **Path:** `src/app/homes/[id]/page.tsx`, `src/components/homes/HomeReviews.tsx`, `src/components/homes/InspectionHistory.tsx`

### OL-225: One support control on mobile instead of two floating buttons
- **Status:** ⚪ idea, not scheduled (future refinement, raised 2026-10-29 in the OL-217 review).
- **What:** on phones the Care Advisor bubble and Report Bug button stack in the bottom-right and need clearance logic around every bottom bar (OL-208, OL-217). Consider merging them into one expandable "Help" control (Ask a Care Advisor · Report a problem). This needs product input on bug-report visibility for families.
- **Path:** `src/components/CareConcierge.tsx`, `src/components/bug-report/BugReportButton.tsx`, root layout

### OL-218: SEO directory card shows a remote stock photo when a home has no real photo
- **Status:** 🔴 OPEN 2026-10-29 (OL-216 follow-up).
- **Problem:** `ListingCard` (`/cleveland/*` pages) renders `photoUrl` even when `photoIsPlaceholder` is true, i.e. a remote stock image captioned "Representative photo for …". `/search` cards show the shared `HomeImagePlaceholder` tile ("Photos coming soon") instead.
- **Fix:** when `photoIsPlaceholder` (no genuine listing photo), render `HomeImagePlaceholder` (server-safe, no hooks), and keep real facility photos unchanged. Distinguish a genuinely missing image (`photoIsPlaceholder` from `public-listings.ts`) from a valid remote image that only failed to load (e.g. Cloudinary blocked in a test sandbox). The card stays server-rendered with no client JS, so there's no onError swap there. Check the JSON-LD `image` behaviour stays as is (`jsonld.ts` already omits placeholders).
- **Path:** `src/components/directory/ListingCard.tsx`, `src/lib/directory/public-listings.ts`

### OL-219: /search pre-existing accessibility leftovers
- **Status:** 🔴 OPEN 2026-10-29. Pre-existing on main and outside the card; found by axe during OL-216 (both remain after it).
- **Problem:** (1) the icon-only search submit button (`button.rounded-r-lg` next to the natural-language input) has no accessible name (`button-name`); (2) the active Grid/List/Map toggle (white text on `primary-500`) fails 4.5:1 (`color-contrast`), on both the desktop and mobile toggles.
- **Fix:** `aria-label="Search"` on the submit button; active toggle on `primary-600`+ or the D toggle style. Re-run axe on `/search` at 1280/390 and expect 0.
- **Path:** `src/app/search/page.tsx`

### OL-220: Search Tips copy over-claims AI
- **Status:** 🔴 OPEN 2026-10-29 (copy).
- **Problem:** the Search Tips box under the results ends with "Our AI will understand your needs and find the best matches."
- **Fix:** drop that sentence and keep only the natural-language examples. `src/app/search/page_clean.tsx` carries the same line, but it looks like a dead copy; confirm and delete it rather than edit it.
- **Path:** `src/app/search/page.tsx` (Search Tips block)

### OL-221: /api/search has no per-home Medicaid waiver fields
- **Status:** 🔴 OPEN 2026-10-29 (small backend item; OL-216 follow-up).
- **Problem:** `SearchResultCard` has a waiver line slot (`medicaidWaiver`), but `/api/search` results don't carry waiver data, so `toSearchResultHome` sets it to null and `/search` cards never show it. The directory card and `/homes/[id]` do show it.
- **Fix:** add a `medicaidWaiver` public view (the same shape `public-listings.ts` uses) to each `/api/search` result, add it to the `SearchResultItem` type, and map it in `src/components/search/adapters.ts`. Unit-test the adapter, plus one e2e assert on a waiver-status home.
- **Path:** `src/app/api/search/route.ts`, `src/lib/searchService.ts`, `src/components/search/adapters.ts`, `src/lib/medicaid/waiver.ts`

### OL-203: Next.js 15 — route handlers read `params.id` without `await`
- **Status:** 🔴 OPEN 2026-10-27. Seen as server warnings in PR #805's e2e log; non-fatal today, since requests still work.
- **Where:** `src/app/api/family/match/[id]/route.ts` (~L38) and `src/app/api/homes/[id]/route.ts` (~L163) use `params.id` synchronously. Next 15 makes `params` a Promise.
- **Fix:** `const { id } = await params` (type `params: Promise<{ id: string }>`). Sweep other `[id]` routes for the same pattern. Own small PR, not bundled with OL-202.

### OL-205: Production StatCard trend text and GoogleRatingBadge compact "· Google" fail 4.5:1 contrast
- **Status:** ✅ MERGED 2026-10-28 with OL-207 (#1 `d965c008`). `ui/StatCard` and `dashboard/MetricCard` (the card the operator/admin dashboards actually render) use success-700 / error-700 / neutral-600 for trend text. The top accent is primary-500 unless `alert` (error-500), and Critical Incidents is the only alert card. GoogleRatingBadge compact keeps "· Google" (Maps attribution) at neutral-600 / 12px. axe color-contrast on the operator/admin dashboard went 13 → 1 (the remaining one is pre-existing `text-neutral-400`).
- **Where:** `src/components/ui/StatCard.tsx`: the `trend` text uses success-600 (~3.3:1 on white), and `trend.label`/`subtitle` use neutral-400 (~2.6:1). `src/components/homes/GoogleRatingBadge.tsx`: the compact variant's "· Google" is neutral-400. Both fail WCAG AA 4.5:1 for small text.
- **Fix:** in the nav/token batch, not in OL-202. Use success-700 / neutral-500+ (or semantic tokens), then re-run axe on the operator dashboard and the SEO cards. D sidesteps both today: StatCard's opt-in `delta` line, and the full rating variant.

### OL-204: Operator how-to copy still says occupancy drives "spots available"
- **Status:** 🔴 OPEN 2026-10-27 (docs). `src/app/learn/howto/content.ts` tells operators that Current Occupancy "drives the 'spots available' families see". That's stale after OL-200: families only see verified availability. Reword to point operators at the weekly availability ping / verified update instead.


### OL-144: Next suburb pages + listings/ItemList on the other care-type pages
- **Status:** 🟡 HALF DONE — Beachwood + Lakewood shipped in #735 (five suburbs; empty-state guard logs a WARN with the live count + filter; `scripts/check-suburb-listings.ts` reports per suburb). Prod count for the two new pages unverified from the sandbox — run the script on Render after merge (OL-152). Remaining: listings/ItemList on the other care-type pages. `/cleveland/memory-care`, `/independent-living`, `/nursing-homes` still only link to search (no server-rendered listings, no ItemList JSON-LD) — same pattern as #728 with `careLevel` MEMORY_CARE / INDEPENDENT / SKILLED_NURSING. If a live suburb page shows the empty state, the roster seed lacks `careLevel: ASSISTED` or the `address.city` spelling differs (`cities` tweak).
- **Path:** `src/lib/directory/suburbs.ts`, `src/app/cleveland/{memory-care,independent-living,nursing-homes}/page.tsx`

### OL-145: Public read API + MCP endpoint for listings (spec only — in #731's description)
- **Status:** 🟡 OPEN — `GET /api/public/v1/listings` (+ `/{id}`), same fields as the JSON-LD (`PublicListing` view), ACTIVE + non-demo only, API key header, 60/min per key (10/min anonymous single-read), 5-min cache + ETag; MCP = two tools over the same endpoint. Not built per the brief.
- **Path:** `src/lib/directory/public-listings.ts` (the view to expose)

### OL-146: CI flakes to fix at the root — `next/font` Google fetch + dev-server memory restart
- **Status:** 🟡 OPEN — seen 2026-10-10/11, twice on 2026-10-13 (#726 `e2e-operator-claim`, #729 `e2e-auth-signup-verify`) and once more on #733 `e2e-concierge` (build step) the same evening — one re-run each: `npm run build` dies in `@next/font/google/loader.js` (`Cannot read properties of null (reading '1')`) on a cache-miss runner before any test runs. Options: self-host the two Google fonts (`next/font/local`) or set `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` in CI. Separately the `e2e-concierge` dev server still restarts on memory mid-run (socket hang up / timeouts on `/search`) — raise `NODE_OPTIONS` for the webServer or run that job against `next start` once OL-121's static-asset caveat is solved. The third 10/13 failure (seeded homes crowding `search-demo-filter` off page 1) is fixed by the dev `DELETE` cleanup + `afterAll` in every `e2e/public/` spec.
- **Path:** `src/app/layout.tsx` (fonts), `.github/workflows/e2e-family.yml`, `src/app/api/dev/upsert-operator/route.ts`

### OL-147: `ClaimRequest` has no admin view
- **Status:** 🟡 OPEN — cohort claim requests land in the table with `status NEW`; read them on the Render shell (`select * from "ClaimRequest" where cohort='CLEVELAND_AGENCIES' order by "createdAt" desc;`) until an `/admin/claim-requests` list + status change exists.
- **Path:** `prisma/schema.prisma` (`ClaimRequest`), `src/app/admin/`

### OL-151: Facility accept/decline — contact source, reminders, admissions contact
- **Status:** 🟡 OPEN (#737) — the facility email goes to `home.contactEmail` → claimed operator login → `outreachEmail`; once #736 merges, prefer the home's `AvailabilityContact` (admissions/availability person) first. No reminder for an unanswered link (30-day token, status stays SENT/OPENED); no admin "re-send link". `observedAcceptanceCriteria` is stored but not yet surfaced on the operator profile or used by matching.
- **Path:** `src/lib/concierge/facility-response-engine.ts` (`pickFacilityContact`), `src/app/admin/concierge/[id]/page.tsx`

### OL-152: Verify Beachwood/Lakewood have ≥1 live listing in production (#735)
- **Status:** 🟡 FOUNDER/OPS — after #735 deploys run `npx tsx scripts/check-suburb-listings.ts` in the Render shell (or watch logs for `suburb-empty-state`). If a suburb is empty the WARN names the filter — likely a `careLevel`/status/`address.city` spelling on the two Lakewood roster rows (`HAVEN AT LAKEWOOD`, `LAKEWOOD HEALTH CARE CENTER`).
- **Path:** `scripts/check-suburb-listings.ts`, `src/lib/directory/suburb-guard.ts`

### OL-153: e2e-concierge red on main push runs (dev-server restarts) — MERGED
- **Status:** ✅ MERGED 2026-10-22 #774 `b3a6b298` (first main run: e2e-concierge green in 8 min).
- **Status:** 🟢 BUILT 2026-10-22 `fix/ol-153-e2e-concierge` — traces of main runs 39652136954 (`5d5fb05`) / 39603169138 (`2361e04`): `connect ECONNREFUSED ::1:3000` + `read ECONNRESET` in `facility-response.spec.ts` (3/3 attempts) with one-off failures in `medicaid-waiver` / `event-log` in the same window = the shared `next dev` server's memory-watchdog restart; plus "Clicking the checkbox did not change its state" in `operator-availability-contact.spec.ts` = a late second `load()` (StrictMode double effect + lazy API compile) resetting the form. Fix: the e2e-concierge job runs its specs against the production standalone server (`E2E_WEB_SERVER` in `playwright.e2e.config.ts`, static + public copied in, dual-stack bind, `--reporter=line,github`); `AvailabilityContactCard.load()` drops stale responses and never overwrites edited fields. Local: 34 specs in 1.9 min, no retries. Original crowding note kept below.
- **Status (original):** 🟡 OPEN — hit in W3 (#728/#729) and again in W4 (#734 first run): `search-demo-filter.spec.ts` expects its own home on page 1 of `/search` (10 per page) and the shared `e2e-concierge` job runs `e2e/public/*` alphabetically before it. Every W3/W4 spec now cleans up (`DELETE /api/dev/upsert-operator` on the W3 lineage, `DELETE /api/dev/nudge-seed` / `placement-search`, ping `cleanup`). Root fix: make `search-demo-filter` search by its own name (`?q=`) or run it first; consolidate the three dev cleanup handlers into one once W3 merges.
- **Path:** `e2e/search-demo-filter.spec.ts`, `e2e/public/*.spec.ts`, `.github/workflows/e2e-family.yml`

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
- **Status:** ✅ RESOLVED 2026-10-05 — #715 now carries #711's Sentry hunks verbatim; both merge orders verified clean. #711 also blanks DSNs in `e2e-family.yml`, which #712 already did (now redundant).
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
