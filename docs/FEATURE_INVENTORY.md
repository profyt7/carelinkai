# CareLinkAI — Feature Inventory (canonical map)

_Compiled 2026-06-12 from a full pass over `src/app/**` (pages + API routes),
`src/lib/**`, `prisma/schema.prisma`, and git history. Goal: leave no feature
undocumented. Companion to `docs/SHIFT_FILL_ENGINE_AUDIT.md` (OL-070)._

**Caveats.** Statuses are inferred from code (presence of TODO/mock/stub/graceful
fallback), not from a running prod instance — **prod env config is unverified**
(can't see Render). Where a feature only works with an env var set, that's noted.
Git per-file dates before commit **`543cf74a`** (a squash/import root) are
unreliable and shown as "≤import root".

### STATUS legend
- **LIVE** — wired and works in prod (assuming its env vars are set)
- **DORMANT** — built + wired but inert in prod (needs env/cron not known to be configured, or gated off)
- **STUBBED** — placeholder / mock / TODO
- **PARTIAL** — some pieces real, some stub

---

## ⚑ Headline findings (read first)

1. **OL-070 shift-fill engine** — large, mostly-LIVE on-call dispatcher + points + household lane that was undocumented until 2026-06-12. Full audit in `docs/SHIFT_FILL_ENGINE_AUDIT.md`. Two CNOS-conflicting behaviors are now **gated off by env flags** in PR #562 (`feat/gate-cnos-frozen-lanes`): the household-employer lane and unaffiliated on-call dispatch.
2. **CNOS freeze only partially enforced.** The broader **unaffiliated-caregiver marketplace** (`/api/marketplace/caregivers`, `/marketplace/listings`, `/marketplace/applications`, `/marketplace/hires`) is **LIVE and NOT gated** — only the dispatcher's unaffiliated branch and the `HouseholdShift` lane are gated. If CNOS intends the whole unaffiliated marketplace frozen, browse/apply/hire still needs a decision. **(Flag for Chris/attorney.)**
3. **Security gaps worth a pass:** Twilio webhooks have **no signature verification**; several cron endpoints **soft-fail when `CRON_SECRET` is unset**; `/api/test-sentry*`, `/api/network-test`, `/api/version`, `/api/health` are **public**; on-call `CoverageAttempt` is recorded `SENT` even when Twilio is unconfigured and **no SMS is actually sent**.
4. **Dormant-in-prod likelihood:** on-call SMS, follow-ups, and tour SMS all **no-op gracefully when `TWILIO_*` is unset**, and no Render cron registration is committed for several `/api/cron/*` endpoints — so parts of scheduling/notifications may be inert in prod. Verify in Render.

---

## By user type

### FAMILY
| Feature | Pages | Key API | Models | Env (unset behavior) | Status |
|---|---|---|---|---|---|
| Family profile / care context | `/family` | `GET/PATCH /api/family/profile` | Family | — | LIVE |
| Family members (invite/roles) | `/family/residents` | `/api/family/members*` | FamilyMember | — | LIVE |
| Documents (+comments) | resident pages | `/api/family/documents*` | FamilyDocument, DocumentComment | AWS_S3_* (PHI; upload fails if unset) | LIVE |
| Care notes (+comments) | resident pages | `/api/family/notes*` | FamilyNote, NoteComment | — | LIVE |
| Shared gallery / albums | resident pages | `/api/family/gallery*` | SharedGallery, GalleryPhoto | AWS_S3_*/CLOUDINARY_* | LIVE |
| Emergency preferences | `/family/emergency` | `/api/family/emergency` | EmergencyPreference | — | LIVE |
| Activity feed | dashboard | `GET /api/family/activity` | ActivityFeedItem | — | LIVE |
| Resident summary/timeline/contacts | `/family/residents/[id]` | `/api/family/residents/[id]/*` | Resident, ResidentNote, ResidentContact | — | LIVE |
| Home comparison | — | `GET /api/family/homes/compare` | AssistedLivingHome | — | LIVE |
| Tours (request/slots) | `/dashboard/tours` | `/api/family/tours*` | TourRequest, TourSlot | ANTHROPIC_API_KEY (AI time suggestions; no-op if unset) | LIVE |
| Waitlist | — | `/api/family/waitlist` | WaitlistEntry | — | LIVE |
| Background checks (order) | — | `/api/family/background-checks*` | BackgroundCheckInvitation/Order | STRIPE_SECRET_KEY, CHECKR_API_KEY (mock if unset) | LIVE |
| Family Plus billing | `/settings/family/billing` | `/api/family/billing/*` | Family (plusStatus) | STRIPE_SECRET_KEY, STRIPE_PRICE_FAMILY_PLUS | LIVE |
| **Household shift scheduling** | `/marketplace/hires` (`/dashboard/household` → redirect) | `/api/family/household*` | HouseholdShift, MarketplaceHire | **NEXT_PUBLIC_ENABLE_HOUSEHOLD_EMPLOYER_LANE** | **DORMANT (gated off, #562)** |
| Inquiries (submit/track) | `/dashboard/inquiries*` | `/api/inquiries*` | Inquiry, InquiryResponse, FollowUp | ANTHROPIC_API_KEY (AI responses) | LIVE |

### OPERATOR
| Feature | Pages | Key API | Models | Env | Status |
|---|---|---|---|---|---|
| Dashboard | `/operator` | `GET /api/operator/dashboard` | Operator, Home, Inquiry, Resident, License | — | LIVE |
| Onboarding (company/BAA/DPA/claim+enrich) | `/operator/onboarding/[step]` | `/api/operator/onboarding/*`, `/api/operator/claim` | Operator, Home, Address, HomePhoto | ANTHROPIC_API_KEY, GOOGLE_PLACES_API_KEY (enrichment no-op if unset) | LIVE |
| BAA/DPA acceptance gate | `/operator/acceptance` | `POST /api/operator/acceptance` | Operator (baa/dpa fields) | — | LIVE |
| Homes CRUD + photos/licenses/inspections/alerts/analytics/featured | `/operator/homes*` | `/api/operator/homes*` | AssistedLivingHome, Address, HomePhoto, License, Inspection | CLOUDINARY_*/AWS_S3_* | LIVE |
| Caregiver roster/hire/assignments/certs/docs/at-risk/smart-search | `/operator/caregivers*` | `/api/operator/caregivers*` | Caregiver, CaregiverEmployment, CaregiverCertification, CallOff | S3/Cloudinary | LIVE |
| Inquiries pipeline (assign/convert/notes/docs/tour/status/priority) | `/operator/inquiries*` | `/api/operator/inquiries*` | Inquiry, InquiryDocument, FollowUp, Resident | RESEND_API_KEY (reminders), AWS_S3_* | LIVE |
| Leads (family→aide/provider) | `/operator/leads*` | `/api/operator/leads*` | Lead | — | LIVE |
| Residents (admit/discharge/transfer/archive/assessments/incidents/compliance/docs/notes/timeline) | `/operator/residents*` | `/api/residents*` | Resident, AssessmentResult, ResidentIncident, ResidentComplianceItem, ResidentDocument | AWS_S3_* (PHI), HIPAA audit | LIVE |
| Shifts (CRUD/open/assign/bids/calloff/autofill) | `/operator/shifts*`, `/shifts` | `/api/shifts*`, `/api/operator/shifts*`, `/api/scheduling/needs*` | CaregiverShift, ShiftBid, ShiftNeed, CoverageAttempt | TWILIO_* (no-op if unset), **ENABLE_UNAFFILIATED_DISPATCH** | LIVE (unaffiliated branch gated off, #562) |
| Tours (confirm/reschedule/cancel) | `/operator/tours` | `/api/operator/tours*` | TourRequest, TourSlot | RESEND_API_KEY, TWILIO_* | LIVE |
| Compliance scan + kits | `/operator/compliance*` | `/api/operator/compliance/scan`, `/api/operator/compliance-kits` | License, Cert, ComplianceKitPurchase | STRIPE_SECRET_KEY (kits) | LIVE |
| Billing / subscription | `/operator/billing` | `/api/operator/billing/*` | Operator (subscription) | STRIPE_SECRET_KEY, STRIPE_PRICE_* (AGENCY = OL-055), STRIPE_WEBHOOK_SECRET | LIVE |
| Reviews of caregivers | `/operator/reviews` | `/api/reviews/caregivers*` | CaregiverReview | — | LIVE |

### CAREGIVER
| Feature | Pages | Key API | Models | Status |
|---|---|---|---|---|
| Dashboard | `/caregiver` | (aggregate) | Caregiver | LIVE |
| Applications to listings | `/caregiver/applications`, `/marketplace/...` | `/api/marketplace/applications*` | MarketplaceApplication | LIVE |
| Open shifts / claim / bid / my shifts | `/shifts` | `/api/shifts/{open,my,[id]/claim,[id]/bid}` | CaregiverShift, ShiftBid | LIVE |
| Timesheets (start/end/approve→points/pay) | `/shifts` | `/api/timesheets*` | Timesheet | LIVE |
| Points / tiers | `/caregiver/points` | `/api/caregiver/points` | CaregiverPoints, PointTransaction | LIVE |
| Verification / background check | `/caregiver/verification` | `/api/caregiver/background-checks` | BackgroundCheckOrder | LIVE |
| Pro membership billing | `/settings/billing` | `/api/caregiver/billing/*` | Caregiver (isPro) | LIVE |
| Reliability score | profile | (computed) `caregiver-reliability.ts` | Caregiver.reliabilityScore | LIVE |
| Retention score | — | (computed, no route) | — | DORMANT |

### PROVIDER (transport/NEMT)
| Feature | Pages | Key API | Models | Env | Status |
|---|---|---|---|---|---|
| Provider dashboard | `/provider` | (aggregate) | Provider | — | LIVE |
| Credentials (insurance/license/NEMT/inspection/BGC) | `/settings/provider/credentials` | `/api/provider/credentials*` | ProviderCredential | CLOUDINARY_*, CHECKR_API_KEY (mock if unset) | LIVE |
| Provider BGC order | — | `/api/provider/credentials/order-background-check` | ProviderBackgroundCheckOrder | STRIPE_SECRET_KEY | LIVE |
| Listing fee billing | `/settings/provider/billing` | `/api/provider/billing*` | Provider | STRIPE_PRICE_PROVIDER_LISTING | LIVE |
| Reliability score (rides) | dashboard | `rideStats.ts` | Ride | — | LIVE |
| Marketplace provider profile + reviews | `/marketplace/providers*` | `/api/marketplace/providers*`, `/api/reviews/providers` | Provider, ProviderReview | — | LIVE |

### DISCHARGE PLANNER
| Feature | Pages | Key API | Models | Env | Status |
|---|---|---|---|---|---|
| Placement search (AI) | `/discharge-planner/search` | `POST /api/discharge-planner/search` | PlacementSearch | ANTHROPIC_API_KEY | LIVE |
| Placement requests (RFP) | `/discharge-planner/requests` | `/api/discharge-planner/{requests,placement-request}` | PlacementRequest | RESEND_API_KEY | LIVE |
| History / analytics / availability / dashboard | `/discharge-planner/*` | `/api/discharge-planner/*` | PlacementSearch, PlacementRequest | — | LIVE |
| Billing (incl. department tier) | `/discharge-planner/billing` | `/api/discharge-planner/billing/*` | DischargePlannerProfile | STRIPE_PRICE_DISCHARGE_PLANNER[_DEPT] | LIVE |

### ADMIN
| Feature | Pages | Key API | Models | Status |
|---|---|---|---|---|
| Dashboard / health / analytics / metrics / settings | `/admin*` | `/api/admin/{health,analytics,metrics,settings}` | many | LIVE |
| User mgmt (+bulk) | `/admin/users` | `/api/admin/users*` | User, AuditLog | LIVE |
| Caregiver / home / inquiry / provider mgmt (+bulk, verify, claim-link) | `/admin/*` | `/api/admin/{caregivers,homes,inquiries,providers}*` | resp. models, AuditLog | LIVE |
| Provider credentials review | `/admin/credentials` | `/api/admin/{provider-credentials,credentials}*` | ProviderCredential | LIVE |
| Broadcast communications | `/admin/communications` | `/api/admin/communications/*` | Message, Notification | LIVE |
| Audit logs (+export) & **PHI access dashboard** | `/admin/{audit-logs,phi-access}` | `/api/admin/{audit-logs,phi-access}*` | AuditLog | LIVE |
| Exports (users/caregivers/inquiries/homes/residents/audit) | `/admin/exports` | `/api/admin/exports/*` | ExportHistory | LIVE |
| Impersonation (1h, audited) | — | `/api/admin/impersonate/*` | ImpersonationSession | LIVE |
| Affiliate materials | `/admin/affiliates` | `/api/admin/affiliate/materials` | AffiliateMaterial | LIVE |

### AFFILIATE
| Feature | Pages | Key API | Models | Status |
|---|---|---|---|---|
| Dashboard (code/commission/referrals) | `/affiliate/dashboard` | `GET /api/affiliate/dashboard` | Affiliate, AffiliateReferral | LIVE |
| Marketing materials | dashboard | `GET /api/affiliate/materials` | AffiliateMaterial | LIVE |

---

## Cross-cutting domains

### Auth / Accounts
NextAuth JWT (30-day), credentials provider, rate-limited (10/min/IP). Registration + email verification (Resend), password reset, **2FA TOTP + backup codes**, session list/revoke, profile/photo, account deactivation, claim tokens. RBAC via `lib/auth/rbac.ts` + `requirePermission`. — **LIVE**. Env: `NEXTAUTH_URL/SECRET`, `RESEND_API_KEY` (email no-op if unset), `ALLOW_INSECURE_AUTH_COOKIE` (test only).

### Payments / Billing / Stripe
Operator/caregiver-pro/provider-listing/family-plus/discharge-planner subscriptions; placement fee (`PLACEMENT_FEE_CENTS`, default $1,500 per OL-030); marketplace hire fee (`MARKETPLACE_HIRE_FEE_CENTS`, $250); ride payments; compliance-kit one-time. Stripe webhook **verifies signature**. — **LIVE**. Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (checkout **hard-fails** if a price var is unset — e.g. `STRIPE_PRICE_AGENCY` = OL-055). Stripe **Connect/payouts not implemented** (caregiver payout rail absent).

### Messaging / Chat
User↔user messages (rate-limited 30/min), threads, conversations, unread, mark-read, **SSE live updates** (`/api/sse`). — **LIVE**.

### Notifications (email / SMS / push)
In-app notifications; multi-provider **email** (`EMAIL_PROVIDER` default `mock`; Resend/SES/SendGrid/Nodemailer; retry + rate-limit); **SMS** via Twilio (**no-op if unset** → PARTIAL); **web push** via VAPID (no-op if unset → PARTIAL); scheduled notifications via cron. Env: `RESEND_API_KEY`, `EMAIL_FROM`, `TWILIO_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `CRON_SECRET`.

### AI / Enrichment
Claude (Anthropic) powers: CareBot/Care-Concierge chat, operator profile auto-population (scrape + extract + photo classify + Google Places address fallback — see autopopulate-cohort.ts), inquiry AI responses, document classification, discharge-planner search, home matching (MatchRequest/Result/Feedback). All **no-op / fall back** gracefully when `ANTHROPIC_API_KEY` unset (some routes 400). Env: `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`. — **LIVE** (degraded without keys).

### Scheduling / Shift-Fill — see `docs/SHIFT_FILL_ENGINE_AUDIT.md`
On-call dispatcher (ShiftNeed → CoverageAttempt, wave SMS, ranking), shift bidding/claim, call-off, autofill, points/tiers. **LIVE** but: SMS no-ops without Twilio (attempt still marked `SENT`); unaffiliated branch gated off (#562); wave cron present but Render registration unverified.

### Marketplace / Hiring
Browse caregivers (`isVisibleInMarketplace`) + providers; favorites; listings (post); applications; hires; categories; reviews. **LIVE and NOT gated** — ⚠ see headline #2 (CNOS unaffiliated-marketplace freeze only partially enforced).

### Transport / Rides (NEMT)
Create/estimate/pay/confirm/start/complete; shared rides (PARTIAL); recurring rides + ride reminders via cron; 12% commission; ride stats; provider reliability. — **LIVE**. Env: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `CRON_SECRET`.

### Background Checks / Compliance
Checkr integration (BASIC free; ENHANCED/MVR/PREMIUM paid via Stripe); **mock fallback when `CHECKR_API_KEY` unset**; Checkr webhook **verifies HMAC**; provider credential expiry cron. — **LIVE** (mock without key).

### HIPAA / Security
Immutable audit logging (7-yr retention), PHI scrubbing, PHI-resource tagging + admin PHI-access dashboard, RBAC scoping, bcrypt (12 rounds), JWT/HttpOnly/SameSite cookies, CSRF (NextAuth), rate limiting, 2FA, BAA/DPA acceptance tracking, impersonation + export audit. PHI documents → S3 (BAA bucket; **no Cloudinary fallback for PHI**). — **LIVE**. Env: `AUDIT_LOGGING_ENABLED` (default true), `AUDIT_LOG_RETENTION_DAYS` (2555), `AWS_S3_*`.

---

## Cron jobs (`/api/cron/*` + `/api/follow-ups/process`)
| Endpoint | Drives | Guard | Render cron |
|---|---|---|---|
| `oncall-waves` | re-dispatch FILLING ShiftNeeds after cooldown | `CRON_SECRET` | every 10 min (per code comment) — **registration unverified** |
| `recurring-rides` | spawn next recurring rides | `CRON_SECRET` | `0 7 * * *` (OL-039 says registered) |
| `ride-reminders` | 24h ride reminder emails | `CRON_SECRET` (soft-fail) | unverified |
| `tour-reminders` | 24h/2h tour reminders (SMS) | `CRON_SECRET` (soft-fail) | unverified |
| `credential-expiry` | expire provider creds + warn | `CRON_SECRET` | `0 6 * * *` (registered per OL-043) |
| `reset-application-counts` | monthly caregiver app-cap reset | `CRON_SECRET` | `0 0 1 * *` (registered per OL-031) |
| `reminders/{schedule,process}` | scheduled-notification queue | `CRON_SECRET` | unverified |
| `follow-ups/process` | inquiry follow-ups | `CRON_SECRET` (defaults `'dev-secret'` if unset → weak) | unverified |

⚠ Several guards **allow the request when `CRON_SECRET` is unset** (soft-fail) — confirm `CRON_SECRET` is set in prod.

## Dev / test endpoints
`/api/dev/*` (whoami, login, activate-user, create-inquiry, upsert-{admin,family,caregiver,operator}, seed-family-resident, mock-upload, notifications/publish) — gated by **`ALLOW_DEV_ENDPOINTS=1`** (must be **unset in prod**; these write to the DB — this is how the e2e test homes leaked). Public diagnostics: `/api/{version,health,network-test,test-sentry*,sentry-tunnel,admin/health(ADMIN)}`.

## Webhooks
| Webhook | Signature verified? |
|---|---|
| Stripe (`/api/webhooks/stripe`) | ✅ yes (`constructEvent`) |
| Checkr (`/api/webhooks/checkr`) | ✅ yes (HMAC) |
| Twilio SMS / status / voice / voice-accept | ❌ **none** — security gap |

## Env vars (what breaks if unset)
`DATABASE_URL` (everything) · `NEXTAUTH_URL/SECRET` (auth) · `ANTHROPIC_API_KEY` (AI degrades/no-op) · `RESEND_API_KEY`+`EMAIL_FROM` (email no-op) · `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER` (SMS no-op, attempts still `SENT`) · `CLOUDINARY_*` (public images fail) · `AWS_S3_*` (PHI doc upload fails) · `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_*` (billing hard-fail) · `CHECKR_API_KEY` (mock BGC) · `GOOGLE_PLACES_API_KEY` (address/website discovery no-op) · `CRON_SECRET` (crons soft-fail open if unset) · `ALLOW_DEV_ENDPOINTS` (**must be unset in prod**) · VAPID keys (push no-op) · feature flags (below).

## Feature flags
| Flag | Default | Effect |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_HOUSEHOLD_EMPLOYER_LANE` | OFF | household lane API 404 + UI hidden (PR #562) |
| `ENABLE_UNAFFILIATED_DISPATCH` | OFF | dispatcher contacts operator's own caregivers only (PR #562) |

---

## Undocumented / decision-conflicting (action items)

- **OL-070 shift-fill engine** — was undocumented in `context/`; now audited (`docs/SHIFT_FILL_ENGINE_AUDIT.md`) and partially gated (#562). Remaining CNOS questions C1–C4 are on the attorney agenda.
- **Unaffiliated-caregiver marketplace (browse/listings/applications/hires) is LIVE + ungated** despite the CNOS freeze — only the dispatcher branch + household lane are gated. **Decision needed:** does the freeze extend to the whole `/marketplace` caregiver flow? (Not gated by #562.)
- **Twilio webhooks unsigned** — add signature verification before SMS/on-call go live.
- **`CoverageAttempt` marked `SENT` when no SMS is sent** (Twilio unconfigured) — misleading dispatch metrics.
- **Cron soft-fail-open** when `CRON_SECRET` unset (esp. `follow-ups/process` default `'dev-secret'`).
- **No caregiver payout rail** (Stripe Connect/wages/tax) despite timesheets + points implying payment — see audit C3/C4.
- Several features absent from `context/CARELINKAI_TECHNICAL_STATE.md` (e.g. 2FA, impersonation, household lane, on-call engine, discharge-planner depth) — worth folding into the technical-state doc + risk register.

_This is a living document — update it as features land so it stays the canonical map._
