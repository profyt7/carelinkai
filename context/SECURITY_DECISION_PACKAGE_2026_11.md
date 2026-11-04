# CareLinkAI security decision package (November 2026)

_Prepared 2026-11-04 from main `80061f75` (#50). **Read-only.** Nothing was implemented, nothing was run against production, no production data was read, and no restore was performed. Every claim cites `file:line` on that commit. The findings marked **[verified]** were re-read by hand after the automated sweep; the rest come from a full code read and should be confirmed by whoever fixes them._

_This is a public repository. The package therefore names **classes** of exposure and code paths; it contains no credentials, no personal data and no per-service secret lists (those stay with Chris, as OL-213 already does)._

**Legend.** **PUB** public · **PII** personal data · **PHI-c** PHI-candidate (health/care detail tied to an identifiable person). **P0** fix now (live exposure or account-takeover class) · **P1** this month · **P2** this quarter. Effort is engineer-hours for one person.

---

## 0. Decision summary — what to approve

### P0 — live exposure today (recommend a stop-ship hotfix PR, each small)
| # | Finding | Evidence | Effort |
|---|---|---|---|
| P0-1 | **Account-takeover data in an API response.** `GET /api/operator/inquiries/[id]/convert` returns `family.user` and `convertedBy` as **full `User` rows** (password hash, 2FA secret, backup codes, reset token) for **any inquiry id**; the only gate is the `inquiries.view` permission, which OPERATOR, FAMILY, STAFF, PROVIDER and DISCHARGE_PLANNER all hold. **[verified]** | `src/app/api/operator/inquiries/[id]/convert/route.ts:115-140` → `src/lib/services/inquiry-conversion.ts:476-500` (`user: true`, `convertedBy: true`); `src/lib/permissions.ts:65,179,257,282,295,303` | 1–2 h (select safe fields + tenant check) |
| P0-2 | **2FA is bypassed at login.** With 2FA on and no code sent, `authorize()` still returns a user object, so NextAuth issues a full session; the login page never sends a code; `signIn` always returns `true`. **[verified]** | `src/lib/auth.ts:164-179`, `:360-363`; `src/app/auth/login/page.tsx:97` | 4–6 h (with proper two-step login) |
| P0-3 | **Self-join into any family.** `GET /api/family/notes` and `GET/PUT /api/family/emergency` **auto-create an ACTIVE `FamilyMember`** for any caller-supplied `familyId`, which then unlocks family documents, downloads and resident summaries. **[verified]** | `src/app/api/family/notes/route.ts:38-76`; `src/app/api/family/emergency/route.ts:47-72` | 1–2 h |
| P0-4 | **Cross-tenant resident list / CSV export.** A caller-supplied `homeId` replaces the operator's scope (`where.homeId = where.homeId ? … : {in: allowed}`); a FAMILY user with no linked residents gets **no filter**. The CSV includes DOB, medications, allergies, conditions. **[verified]** | `src/app/api/residents/route.ts:44-52`, `:76-83`, query `:186` | 1–2 h |
| P0-5 | **Generic `/api/documents/*` has no ownership check.** List, read, search, classify, process, reclassify, review and validate check only "signed in"; OCR `extractedText` is returned; upload accepts any `residentId`. **[verified for classify]** | `src/app/api/documents/route.ts:30-48`; `[id]/route.ts:25`; `search/route.ts:104`; `[id]/classify/route.ts:22-43`; `upload/route.ts:43,103` | 3–4 h |
| P0-6 | **Platform-wide reports and dashboards for non-operators.** `POST /api/reports/generate` treats an empty `homeIds` as "all homes" and does not validate supplied ids (AFFILIATE, PROVIDER, DP, STAFF, OPERATOR can run it); `/api/dashboard/*` and `/api/operator/dashboard` give FAMILY/CAREGIVER/PROVIDER/DP the global view with resident and family names. | `src/lib/services/reports.ts:38,65,163,252-261`; `src/app/api/reports/[id]/download/route.ts:24`; `src/app/api/dashboard/activity/route.ts:31-45,63,91,115,139`; `src/app/api/operator/dashboard/route.ts:37-41,84` | 3–5 h |
| P0-7 | **Unsigned Twilio webhooks that write.** `voice/accept` (no auth at all) confirms/declines any shift attempt by id; `sms` fills a shift from a forged "YES"; `status` writes `coverageAttempt`. Only `twilio/availability` verifies `X-Twilio-Signature`. **[verified]** | `src/app/api/webhooks/twilio/{sms,status,voice,voice/accept}/route.ts`; good pattern `twilio/availability/route.ts:46-61` | 1–2 h |

### P1 — this month
Unscoped resident write routes (§4 list items 8–13) · identifiable care data sent to Anthropic without a guard or a confirmed BAA/zero-retention term (§2) · Sentry probably receives request bodies, headers/cookies and the signed-in user's email (§5) · no session revocation / role changes not live (§3) · anonymous `POST /api/inquiries` echoes operator email/phone and, given a `familyId`, that family user's name and email **[verified]** (`src/app/api/inquiries/route.ts:58,88-113,214-217`) · DP legacy "direct" placement emails patient name/age/conditions to operators and has no ownership check (`src/app/api/discharge-planner/placement-request/route.ts:47,160-204`) **[verified]** · `/api/admin/metrics` ignores the result of its role check (`src/app/api/admin/metrics/route.ts:26`; `src/lib/rbac.ts:60-77`) **[verified]** · `enforce_admins` off + secret scan only on PRs (§7) · Node 20.11.0 (EOL) (§7) · no backup/restore runbook (§6).

### P2 — this quarter
CSP tightening, Dependabot + audit gate, impersonation step-up and design, MFA enforcement for privileged roles (after P0-2), allowlist-first logging schemas, GA4 path id-collapsing, non-prod `checkFamilyMembership` bypass, cron-secret fallbacks.

### Decisions only Chris can make
1. **Approve the P0 hotfix batch** (≈15–25 h total), one small PR per item, tests included.
2. **Anthropic data terms:** confirm whether a BAA / zero-data-retention agreement exists. If not, decide per feature (§2) whether to stop sending resident data, redact first, or pause the feature.
3. **Incident follow-up:** whether to have counsel review the facts in §8 (this package draws **no** reportability conclusions).
4. **Whether privileged sessions get idle/absolute limits** (§3) and the values (suggested 30 min idle / 12 h absolute).

---

## 1. Data-flow map

Shared chokepoints:

| Third party | Code path | What it can receive |
|---|---|---|
| Anthropic | client `src/lib/ai/claude.ts:7-20`; 16 call sites (§2) | See §2; several send PHI-c |
| Resend | `guardedResendSend` `src/lib/email.ts:70-90` (suppression-checked). **Direct `new Resend()` bypasses**: `discharge-planner/placement-request/route.ts:98,198`, `src/lib/email/inquiry-email-service.ts:24,45`, `auth/register`, `cron/credential-expiry`, `rides/*`, `webhooks/stripe` | Per workflow below |
| Twilio SMS | `src/lib/sms/sms-service.ts:56` (consent-checked at `:50`) | Names, home names, shift notes |
| ElevenLabs | inbound webhooks `src/lib/elevenlabs/post-call.ts`; outbound `src/lib/elevenlabs/outbound.ts:70` (**not called anywhere**) | Callers' own words (stored at ElevenLabs) |
| Sentry | `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts` | See §5 |
| GA4 | `src/lib/analytics/ga-mp.ts:44-76` via `api/analytics/track` | Allowlisted props + sanitized path |
| Stripe | Payment Link URL only (`src/lib/concierge/pay-when-ready.ts:54-57`) | Family email (`prefilled_email`), order id |
| S3 | `src/lib/storage.ts:31` (`AWS_S3_BUCKET`), router `src/lib/storage/router.ts:12-16` ("PHI→S3, PII/PUBLIC→Cloudinary") | Resident documents, photos, family documents |
| Cloudinary | `src/lib/storage/router.ts`, `api/upload`, `api/documents/upload` | Caregiver/provider docs, **inquiry-linked documents labelled PII**, family-document fallback |

### 1.1 Public directory — search, `/homes/[id]`, `/cleveland`
- Routes: `src/app/api/search/route.ts`, `src/app/api/homes/search/route.ts`, `src/app/api/homes/[id]/route.ts`.
- Fields: filters (PUB); `residentProfile` JSON query param (`search/route.ts:763`, content unclear; stripped from Sentry as a query string).
- Stored: `AnalyticsEvent` funnel rows (`api/analytics/track/route.ts:51-58`).
- Third parties: GA4 allowlisted props (`src/lib/analytics/events.ts:73-104`). **GA4 page paths keep ids**: `FunnelTracking.tsx:22` → `ga-mp.ts:55-57` sends e.g. `/concierge/shortlist/<token>` (a bearer link) when analytics consent is given (P2).

### 1.2 Listing claim
- Routes: `src/app/api/homes/[id]/claim-request/route.ts` → `src/lib/claims/self-serve.ts:57-90`; `src/app/api/admin/home-claims/[id]`; `src/app/api/admin/homes/[id]/claim/route.ts` → `src/lib/claims/assign-home.ts:58`; `src/app/api/admin/homes/[id]/claim-link/route.ts`; `src/app/api/claim-link/visit/route.ts`; `src/app/api/operator/claim/route.ts`; `src/app/api/claim/request/route.ts`.
- Fields: org name (PUB), contact name/email/phone (PII), message (free text). No PHI.
- Stored: `ClaimRequest`, `HomeClaim`, `ClaimLinkVisit`, `AssistedLivingHome.operatorId`.
- Third parties: Resend to admin (home, operator name/email) `src/lib/email.ts:213-274,463-479`; decision email to operator `:489-507`.
- Note: claim tokens are signed with `NEXTAUTH_SECRET || ''` (`claim-link/route.ts:124`, `operator/claim/route.ts:43`) — an empty-key fallback if the env var were ever missing (P2).

### 1.3 Family inquiry / tour request
- Routes: `src/app/api/inquiries/route.ts` (public POST; schema `src/lib/inquiries/schema.ts:7-41`); `src/app/api/family/tours/request/route.ts`; `src/app/api/inquiries/[id]/generate-response/route.ts`; `src/app/api/follow-ups/process/route.ts` (6-hourly, `.github/workflows/process-followups.yml:5-6`).
- Fields: contact name/email/phone (PII); `careRecipientName`, `careRecipientAge` (PII); `careNeeds[]`, `additionalInfo`, `message`, `familyNotes` (**PHI-c** with the name).
- Stored: `Inquiry`; `LeadConsent`; `FollowUp`; `InquiryResponse` (Claude text); `TourRequest.familyNotes`; for unclaimed homes `InboundLead` (`src/lib/leads/web-inquiry-lead.ts:208`).
- Third parties:
  - **Anthropic**: `src/lib/ai/inquiry-response-generator.ts:31-80` — contact name, care recipient name + age, care needs, free text (§2 A3).
  - **Twilio**: operator SMS with family **and care recipient** names (`sms-service.ts:89`); follow-up SMS of Claude text to the family (`src/lib/followup/followup-processor.ts:120-124`).
  - **Resend**: generic operator alert (`email.ts:736-770`); admin alert for unclaimed homes with family contact + payer lane + timeframe (`web-inquiry-lead.ts:118-155,229`); Claude reply to the family through the **suppression-bypassing** `inquiry-email-service.ts:45`, inserted into HTML unescaped (`:76`).
- **Response exposure [verified]:** the anonymous POST returns `inquiry` with `home.operator.user.{firstName,phone,email}` and, when the caller supplies a `familyId`, that family user's name and email (`src/app/api/inquiries/route.ts:58,88-113,214-217`).

### 1.4 Concierge order
- Routes: `src/app/api/concierge/request/route.ts`; `src/app/api/admin/concierge/[id]`; `src/app/api/admin/concierge/orders/[orderId]`; `src/app/api/webhooks/stripe/route.ts:169-187`; `src/app/api/cron/concierge-orders`. `/checkout` returns 410.
- Fields (`src/lib/concierge/intake-schema.ts:16-29`): contact name/email/phone (PII); location, timeline; `careNeeds`, `notes` (**PHI-c**).
- Stored: `PlacementSearch.queryText` (care needs + location + timeline) and `patientInfo` JSON (`src/lib/concierge/intake.ts:97-124`); `ConciergeOrder`; `FacilityResponse.summary`.
- Third parties: **Anthropic** "suggest homes" gets `queryText` (care needs, no name) (`src/lib/concierge/manual-shortlist.ts:154-180`); **Stripe** gets the email in the Payment Link URL; **Resend**: family emails carry no case details (`src/lib/concierge/family-emails.ts`); facility accept/decline email carries care level, payer lane and a 60-char timeline (`src/lib/concierge/facility-response.ts:146-178`). `isTest` safety controls from #37 apply (`src/lib/concierge/test-orders.ts`).

### 1.5 Discharge-planner placement request
- Routes: `src/app/api/discharge-planner/search/route.ts`; `src/app/api/discharge-planner/concierge/route.ts`; legacy `src/app/api/discharge-planner/placement-request/route.ts` (still reachable; `PlacementRequestModal.tsx:70-72`).
- Fields: free-text patient description (**PHI-c**); `patientName`, `patientAge`, `gender`, `medicalNeeds`, `additionalNotes` (**PHI-c**).
- Stored: `PlacementSearch.queryText`, `parsedCriteria` (conditions, mobility, cognition), `searchResults`, `patientInfo`; `PlacementRequest.patientInfo`.
- Third parties: **Anthropic** parse + score (`search/route.ts:88-93,243-248`); **Resend** legacy path emails **patient name, age, gender, medical needs, notes** to the operator, cc the DP **[verified]** (`placement-request/route.ts:160-204`); **Render logs**: raw query and parsed criteria (`search/route.ts:52,106/110`) **[verified line 52]**.

### 1.6 Resident records (operator)
- Routes: `src/app/api/residents/**`, `src/app/api/operator/residents/**`, `src/app/api/upload/route.ts`, `src/app/api/documents/**`, `src/app/api/operator/ask/route.ts`.
- Fields: name, DOB, gender (PII → PHI-c together); conditions, medications, allergies, diet, care needs, notes, incidents, assessments, DNR preferences (**PHI-c**) — `prisma/schema.prisma:726-944`.
- Stored: Postgres; S3 `uploads/…` (`upload/route.ts:79`), `residents/<id>/photo/…`; **Cloudinary for inquiry-linked/unlinked documents labelled PII** (`documents/upload/route.ts:26-30,77-89`); family documents fall back to Cloudinary when S3 is unavailable, with no production check (`family/documents/route.ts:521-524`).
- Third parties: **Anthropic** intake PDF (full record) **[verified]**, operator "Ask" (names + conditions + medications), document classification (first 1000 chars of OCR) — §2.

### 1.7 Operator staffing
- Routes: `src/app/api/operator/caregivers/**`, `src/app/api/operator/shifts/**` (incl. `autofill`), `src/app/api/timesheets/**`, `src/app/api/marketplace/**`, `src/app/api/operator/compliance/scan`, `src/app/api/provider/credentials`.
- Fields: caregiver name/email/phone, home lat/lng, background-check status and report URL (PII); shift/timesheet notes (free text).
- Third parties: **Anthropic** smart search, shift auto-fill, compliance summary, credential review (§2 A7, A9, A11, A12); **Twilio** on-call SMS includes free-text shift notes (`src/lib/oncall/messages.ts:12-20`); **Resend** marketplace application notice; **Stripe** payout metadata (ids only, `timesheets/[id]/pay/route.ts:191-201`).

### 1.8 Front-desk call (ElevenLabs inbound)
- Routes: `src/app/api/webhooks/elevenlabs/route.ts` and `/inbound-lead/route.ts` → `src/lib/elevenlabs/post-call.ts:85-136`. HMAC-SHA256 with timing-safe compare and a 30-minute replay window; refuses when the secret is unset (`post-call.ts:43-54`; `src/lib/availability/call-result.ts:34-59`).
- Fields: caller type, name, organization, callback phone (PII); `reason` free text (**PHI-c**).
- Stored: `InboundLead` (`src/lib/leads/inbound-lead.ts:304-318`) or `AvailabilityObservation` (`:251-267`). Recordings/transcripts stay at ElevenLabs.
- Third parties: Resend to admin (name, org, phone, urgency, links — **no reason text**) `src/lib/leads/inbound-alerts.ts:156-179`; Twilio to the admin mobile for planners `:99-112`.

### 1.9 Outbound availability call / ping
- Routes: `src/app/api/admin/availability/call-list`; call-result webhook (`src/lib/availability/call-result.ts:240-403`); `src/app/api/cron/availability-ping`; `src/app/api/cron/availability-sms`; `src/app/api/availability/ping/**`; `src/app/api/webhooks/twilio/availability` (signed).
- Fields: facility business contacts (PII), beds, price, waiver, call notes, **full transcript JSON** (stored unguarded, `call-result.ts:336-403`).
- Third parties: ElevenLabs batch API would get homeId/name/city/phone (unused); Twilio availability SMS; Resend ping email.
- Note: `cron/availability-sms` skips auth if `CRON_SECRET` is unset (`route.ts:25`); `follow-ups/process` falls back to `'dev-secret'` **[verified]** (`src/app/api/follow-ups/process/route.ts:12`) (P2).

---

## 2. AI prompt audit

**Provider:** Anthropic only (`@anthropic-ai/sdk`; no live OpenAI or other LLM code in `src/`). **No PHI guard runs before any Anthropic call**: `src/lib/phi-guard.ts` is used only by the ElevenLabs lead parser and facility decline notes; `scrubPhi` only by Sentry. Whether a BAA or zero-retention term covers the API key is **not determinable from the repo**.

| # | Feature / call | Model | Fields that can enter the prompt | Identifiable care data? |
|---|---|---|---|---|
| A1 | CareBot `src/app/api/carebot/chat/route.ts:171-207` | haiku-4.5 | user chat text; client-supplied user name/role added to system prompt | **Possibly** (free text). No auth or rate limit on the route |
| A2 | Care-concierge chat `src/app/api/care-concierge/route.ts:97-158` | haiku-4.5 | client-supplied history (roles not validated); public home data from tools | **Possibly** (free text). No auth |
| A3 | Inquiry reply drafting `src/lib/ai/inquiry-response-generator.ts:31-146` | sonnet-4.6 | contact name, care recipient name + age, care needs, `additionalInfo`, urgency, home | **Yes.** Trigger has **no tenant check** (`generate-response/route.ts:22-44`); stored with metadata mislabeled `aiModel: 'gpt-4'` (`:65`) |
| A4/A5 | DP search parse + score `src/app/api/discharge-planner/search/route.ts:67-93,219-248` | sonnet-4.6 | DP free-text patient description; parsed age/gender/conditions/mobility/cognition | **Likely.** Raw query also in Render logs (`:52`) |
| A6 | Concierge suggest-homes `src/lib/concierge/manual-shortlist.ts:155-180` | sonnet-4.6 | `queryText` (care needs; DP free text for DP rows) | **Possibly** |
| A7 | Shift auto-fill `src/lib/ai/shift-autofill.ts:41-95` | haiku-4.5 | shift description; up to 50 caregivers' names, rates, background-check status (includes caregivers with no employment) | Caregiver PII; residents only via free text |
| A8 | Operator "Ask" `src/app/api/operator/ask/route.ts:80-207` | haiku-4.5 | up to 20 residents' names + `medicalConditions` + `medications` (operator-scoped) | **Yes** |
| A9 | Caregiver smart search `src/app/api/operator/caregivers/smart-search/route.ts:31,100` | haiku-4.5 | query; 40 marketplace caregivers (not operator-scoped) | Caregiver PII |
| A10 | Resident intake PDF `src/app/api/operator/residents/[id]/intake-pdf/route.ts:30-55` | haiku-4.5 | name, DOB, gender, admission, home, status, conditions, medications, allergies, diet, notes | **Yes — full record [verified]** |
| A11 | Compliance scan summary `src/app/api/operator/compliance/scan/route.ts:219-237` | haiku-4.5 | caregiver names + certification/background-check findings | Caregiver PII |
| A12 | Provider credential review `src/lib/ai/credential-review.ts:60-102` | haiku-4.5 | credential notes + **document URL fetched by Anthropic** (IDs, drug tests); can auto-verify | Provider PII/possibly health |
| A13 | Document classification `src/lib/documents/classification.ts:37-66` (auto after upload, `src/lib/documents/extraction.ts:88-97`) | sonnet-4.6 | file name + first 1000 chars of OCR/PDF text | **Yes** for medical/insurance documents |
| A14 | Family match explainer `src/lib/matching/openai-explainer.ts:51-114` | sonnet-4.6 | home data + family's `medicalConditions` | Health data, no identity |
| A15 | Tour scheduler `src/lib/tour-scheduler/ai-tour-scheduler.ts:165-196` | haiku-4.5 | slots, stats, free-text preferences | No (by design) |
| A16/A17 | Home profile / unclaimed descriptions `src/lib/profile-generator/*` | sonnet-4.6 | facility data, scraped site | No |

Representative prompt builders (verbatim, trimmed only of static instruction text):

```ts
// A10 src/app/api/operator/residents/[id]/intake-pdf/route.ts:30-42
const residentContext = `
Name: ${resident.firstName} ${resident.lastName}
Date of Birth: ${resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : 'N/A'}
Gender: ${resident.gender || 'N/A'}
Admission Date: ${…}
Home: ${resident.home?.name || 'N/A'}
Status: ${resident.status}
Medical Conditions: ${resident.medicalConditions || 'None documented'}
Medications: ${resident.medications || 'None documented'}
Allergies: ${resident.allergies || 'None documented'}
Dietary Restrictions: ${resident.dietaryRestrictions || 'None documented'}
Notes: ${resident.notes || 'None'}
`.trim();
```

```ts
// A3 src/lib/ai/inquiry-response-generator.ts:55-80
prompt += `- Contact: ${inquiry.contactName || 'the family'}\n`;
prompt += `- Care Recipient: ${inquiry.careRecipientName || 'their loved one'}`;
if (inquiry.careRecipientAge) { prompt += `, Age ${inquiry.careRecipientAge}`; }
if (inquiry.careNeeds && inquiry.careNeeds.length > 0) { prompt += `- Care Needs: ${inquiry.careNeeds.join(', ')}\n`; }
if (inquiry.additionalInfo) { prompt += `- Additional Information: ${inquiry.additionalInfo}\n`; }
```

```ts
// A4 src/app/api/discharge-planner/search/route.ts:67-86 (schema text trimmed)
const parsePrompt = `You are an expert in senior care placement. Extract structured criteria from the following request:
"${query}"
… { "timeline", "urgency", "paymentType", "gender", "age", "medicalConditions", "mobilityNeeds", "cognitiveStatus", … }`;
```

```ts
// A8 src/app/api/operator/ask/route.ts:80-103 (tool result fed back to the model)
select: { firstName, lastName, status, home: { name }, medicalConditions, medications } // up to 20 rows
```

**ElevenLabs.**
- Inbound front desk (`src/lib/elevenlabs/post-call.ts:85-136`, parser `src/lib/leads/inbound-lead.ts:155-212`): reads `data_collection_results` (caller type, name, organization, callback phone, urgency, `reason`/`summary`/`notes`, transcript/recording URLs, facility facts) — **not** `data.transcript`. `reason` goes through `guardFreeText` (`src/lib/phi-guard.ts:15-28,42-48`), which redacts on DOB/MRN/"diagnos"/SSN/Medicaid-Medicare id/ICD patterns but **not** condition names, ages, medications or patient names ("Mom Jane Doe, 84, has dementia" passes). Stored: `InboundLead` or `AvailabilityObservation`. Emailed to admin: name, org, phone, urgency, PHI flag, links — not the reason. SMS (planners): name, org, phone, urgency.
- Outbound listing-update results (`src/lib/availability/call-result.ts:240-403`): stores the **full transcript JSON** and notes on `AvailabilityObservation` with **no guard** (business calls, but staff may mention residents). An unknown agent id whose payload contains `homeId` is routed here (`post-call.ts:32-40`).
- 401 responses echo the signature failure reason (`post-call.ts:51`) — minor.
- `src/app/api/dev/inbound-lead/route.ts` writes leads unsigned when `ALLOW_DEV_ENDPOINTS=1` (not in `render.yaml`; confirm unset in Render).

**Recommendation (P1):** route every Anthropic call through one wrapper that (a) refuses resident/PHI-classified inputs unless an `ANTHROPIC_PHI_APPROVED` decision is recorded, (b) applies the stricter `guardDeclineText` patterns to free text, (c) logs only model, feature and token counts. Effort ≈ 6–10 h plus per-feature decisions.

---

## 3. Sessions

| Item | Today | Evidence |
|---|---|---|
| Strategy | NextAuth v4 **JWT**, 30-day `maxAge`, sliding (re-issued on each read), **no absolute limit** | `src/lib/auth.ts:29-56` |
| Cookie | `__Secure-next-auth.session-token`, httpOnly, sameSite=lax, secure in prod (unless `ALLOW_INSECURE_AUTH_COOKIE=1`) | `src/lib/auth.ts:41-51` |
| Middleware | `withAuth` → `authorized: !!token` (decode only, no role, no DB); **matcher skips `/api/` and `/auth/`** | `src/middleware.ts:138-284,311` |
| API routes | `getServerSession` (276 files); role read from the token | e.g. `src/app/api/admin/users/[id]/route.ts:12-14` |
| Token contents | id, email, name, role, emailVerified, twoFactorEnabled; **no status, operator/tenant ids, session version or auth time** | `src/lib/auth.ts:289-298` |
| Refresh from DB | only `profileImageUrl/firstName/lastName`, and only on `update` or missing image | `src/lib/auth.ts:301-327` |

**Do changes take effect before expiry?**
- User suspended/deactivated → **No** (status checked only in `authorize`, `src/lib/auth.ts:112-135`).
- Role changed/demoted → **No** for every check reading `session.user.role`.
- Operator removed / homes reassigned → **Partly**: yes where routes use `getUserScope` (`src/lib/auth-utils.ts:171-280`, re-reads the DB but never checks `status`); no elsewhere.
- Password reset / "sign out everywhere" → **No** (no session version exists).

**Impersonation:** `POST /api/admin/impersonate/start` writes an `ImpersonationSession` row + audit log but **never swaps identity** (the admin token stays ADMIN); no step-up; reason optional server-side (`src/app/api/admin/impersonate/start/route.ts:13,23,83-114`).

**2FA:** see P0-2. Also: TOTP secret and backup codes stored in plaintext (`setup-2fa/route.ts:258`; backup codes compared in plaintext `src/lib/auth.ts:189-192`); `/api/profile/2fa` toggles `twoFactorEnabled` with no secret or current code (`src/app/api/profile/2fa/route.ts:61-69`).

**Plan: server-side revocation + idle/absolute limits (ADMIN/STAFF/OPERATOR).**
1. Schema: `User.sessionVersion Int @default(0)` (additive migration; `npm start` already runs `migrate:deploy`, `package.json:10`).
2. `src/lib/auth.ts` `jwt` callback: on sign-in set `sv`, `authTime`, `lastSeen`; on later calls do **one** PK lookup (`status, role, sessionVersion, …`, replacing the existing image query) and mark the token revoked when status ≠ ACTIVE, `sv` mismatches, or (privileged roles) idle > 30 min / absolute > 12 h; refresh `role` from the DB.
3. `session` callback drops `user` for a revoked token; `src/middleware.ts` `authorized` rejects revoked/expired claims (claim reads only — Prisma can't run in Edge; Next 15.5 Node-runtime middleware is an option to test).
4. Bump `sessionVersion` in: `admin/users/[id]` (role/status/delete), `admin/users/bulk`, `auth/reset-password`, `profile/change-password`, `profile/password`, `auth/disable-2fa`, `profile/2fa`, operator/employment removal routes, new `POST /api/auth/sign-out-everywhere`.
5. Tests for the `jwt` callback.

**Effort:** ≈ 10–13 h; +4–6 h to fix 2FA properly in the same change (two-step login, encrypted secret, hashed backup codes, enforcement for privileged roles).

---

## 4. Tenant authorization inventory

**Good patterns to copy:** `findFirst` with `home: { operatorId }` in the `where` (`src/app/api/operator/residents/[id]/intake-pdf/route.ts:18-19`) or `requireResidentAccess` (`src/lib/auth-utils.ts:331-382`). Fewer than ten resident/document routes use either.

**Systemic issues**
- `/api/` is excluded from middleware; each route must enforce auth (`src/middleware.ts:25,311`).
- `requireAnyRole` returns `{error}` instead of throwing, and lets a session with **no role** through (`src/lib/rbac.ts:60-77`) **[verified]**; at least `admin/metrics` ignores the return.
- `checkFamilyMembership` / `hasPermissionToViewDocuments` return `true` whenever `NODE_ENV !== 'production'` (`src/lib/services/family.ts:93-95,480-492`) **[verified]** and ignore `FamilyMember.status`.

**Routes with NO / PARTIAL / UNCLEAR tenant checks, ranked**

| Rank | Route(s) | Problem | Evidence |
|---|---|---|---|
| 1 | GET `/api/operator/inquiries/[id]/convert` | full User rows (P0-1) | `inquiry-conversion.ts:476-500` |
| 2 | GET `/api/family/notes`, GET/PUT `/api/family/emergency` | auto-join any family (P0-3) | `family/notes/route.ts:68`; `family/emergency/route.ts:65` |
| 3 | GET `/api/residents` (+CSV) | `homeId` override; FAMILY with no residents unfiltered (P0-4) | `residents/route.ts:48-51,82,186` |
| 4 | `/api/documents`, `[id]`, `search`, `[id]/{classify,process,reclassify,review,validate}`, `upload` | session-only (P0-5) | `documents/route.ts:45-48`; `[id]/route.ts:25`; `search/route.ts:104`; `[id]/process/route.ts:34`; `upload/route.ts:103` |
| 5 | POST `/api/reports/generate`, GET `/api/reports/[id]/download` | all homes / no owner check (P0-6) | `reports.ts:38`; `reports/[id]/download/route.ts:24` |
| 6 | `/api/dashboard/{activity,alerts,charts,metrics}`, `/api/operator/dashboard` | non-operators get the global view (P0-6) | `dashboard/activity/route.ts:31-45`; `operator/dashboard/route.ts:37-41,84` |
| 7 | GET `/api/inquiries`, `/api/operator/inquiries/pipeline` | `homeId` overrides scope; other roles unfiltered; empty filter for 0-home operators | `inquiries/route.ts:267-309`; `pipeline/route.ts:30-46,72` |
| 8 | Resident PHI routes with role-only checks: `residents/[id]/notes` (GET/POST), `timeline`, `discharge`, `photo`, `compliance/[complianceId]`, `family/[contactId]`; `operator/residents/documents/[documentId]` DELETE; `operator/caregivers/[id]/documents/[docId]` DELETE (deletes any `Document`) | no tenant check | `notes/route.ts:18,55`; `timeline:31,56`; `discharge:23,35`; `photo:41,68,89,107`; `compliance/[id]:38,51`; `family/[id]:40,53`; `operator/residents/documents/[documentId]:24,37`; `operator/caregivers/[id]/documents/[docId]:47,61` |
| 9 | `residents/[id]` GET/PATCH, `admit`, `archive` | residents with no home open to any operator; PATCH `homeId` unvalidated; admit checks target home only | `residents/[id]/route.ts:23,78`; `admit:29-36`; `archive:44` |
| 10 | `assessments/[assessmentId]` PATCH, `incidents/[incidentId]` PATCH, `inquiries/[id]/follow-ups` PATCH | child id not matched to parent | `:49`, `:53`, `:321` |
| 11 | `inquiries/[id]/generate-response`, `operator/inquiries/[id]/status`, `operator/inquiries/[id]/convert` POST | no tenant check; convert creates a resident in another home and charges that operator | `generate-response:44,55,88`; `status:39,64`; `convert:45,54` |
| 12 | POST `/api/discharge-planner/placement-request` | no `search.userId` check; emails patient info | `:47,60,209` |
| 13 | `caregivers/[id]/documents`, `caregivers/[id]/assignments`, `operator/caregivers/[id]/assignments` POST | caregiver/resident not scoped | `:26,59`; `:26,71`; `:159` |
| 14 | `calendar/appointments` (OPERATOR sees all); license/inspection downloads (child id not bound to home); `admin/metrics` (aggregates; auth ignored); `operator/analytics/export` (aggregates) | lower risk | `calendar/appointments/route.ts:360`; `licenses/[licenseId]/download:23`; `inspections/[inspectionId]/download:24`; `admin/metrics/route.ts:26`; `analytics/export:29` |
| 15 | `/api/dev/*` (guarded only by `ALLOW_DEV_ENDPOINTS`; `upsert-family` returns a plaintext password); `src/lib/services/reports.ts` is a `'use server'` module with unauthenticated exports (reachability as server actions unclear) | environment-dependent | `src/app/api/dev/**`; `src/lib/services/reports.ts:1` |

Messages (`/api/messages/*`), DP dashboard/history/requests, concierge, `facility/respond` (HMAC token), family document routes (when membership is genuine) and the operator inquiry sub-routes scope correctly. Admin export routes are ADMIN-only by design.

**Recommendation:** after the P0 batch, add one shared `assertTenantAccess(model, id, session)` helper and a CI test that fails on `findUnique({ where: { id` in `src/app/api/**` for these models unless the file also calls an access helper (P1, ≈ 1–2 days for the remaining routes).

---

## 5. Logging

**What Sentry receives today** (production only; `sendDefaultPii: false` in all three configs; Replay removed; profiling on in the browser):
- Scrubbed by app code: query strings (except `view`/`page`), Prisma/Zod error text, console breadcrumbs dropped, and key-name redaction (`scrubPhi`) on **object** `request.data`, `extra` and breadcrumb data (`src/lib/sentry/scrub-event.ts:61-90`; `src/lib/phi-scrubber.ts:8-72`).
- **Not scrubbed:**
  1. `event.user` — `src/components/SentryProvider.tsx:18-22` sets the signed-in user's **id, email and name** on every browser event (mounted in `src/app/layout.tsx:229`).
  2. Request **headers, cookies** — in `@sentry/core` 10.38 the request-data integration includes cookies/headers by default; `sendDefaultPii` only drops the IP. The NextAuth session cookie may therefore be attached to server error events unless Sentry's server-side scrubbing removes it (project settings are not in the repo). _Inferred from SDK source; confirm on a real event._
  3. Request **bodies** — `@sentry/node-core` keeps up to 10 KB of the body as a **string**; `scrubPhi` returns strings unchanged (`src/lib/phi-scrubber.ts:71`). Inquiry, concierge and `/api/family/match` bodies may reach Sentry unscrubbed. _Inferred; confirm._
  4. `tags` get URL scrubbing only.
- `captureError` (`src/lib/sentry.ts:37-79`, 238 call sites) mostly passes ids/enums; no caller found passing emails in `extra`.

**What Render logs receive** (`src/lib/logger.ts` → stdout; redacts secret-named keys only, **no PHI scrub**; guard tests cover a subset of paths via `scripts/pii-log-scan.cjs:23-37`):
- Full health-bearing request body: `src/app/api/family/match/route.ts:45` (`JSON.stringify(body)`, includes `medicalConditions`), plus user email at `:40`.
- DP raw query and parsed criteria: `src/app/api/discharge-planner/search/route.ts:52,106`.
- Emails: `admin/homes/route.ts:13`, `admin/exports/history/route.ts:13`, `operator/caregivers/route.ts:18`, `operator/dashboard/route.ts:158`, `discharge-planner/placement-request/route.ts:206`, `family/members/invitations/[invitationId]/resend/route.ts:61`, `webhooks/resend/route.ts:92,98`.
- 457 `console.error(…, err)` calls in `src/app/api`; Prisma errors can echo submitted values.
- No route logs `req.headers`.

**GA4:** allowlisted events and props only; strings screened for emails/phones; no IP/UA/referrer (`src/lib/analytics/ga-mp.ts:44-76`; `events.ts:73-104`; `sanitize.ts:16-27`). Gap: ids/tokens in page paths (§1.1).

**Proposal — allowlist-first event schemas (P2, ≈ 1–2 days):**
1. **Sentry:** `beforeSend` rebuilds the event from an allowlist — `exception` (type + scrubbed message + frames), `transaction` (route template, not URL), `tags` from a fixed key list (`feature`, `route`, `status`, `role`), `extra` only if every key is in a per-feature allowlist (ids/enums/counts), `user: { id }` only. Set `sendDefaultPii: false` **and** `requestDataIntegration({ include: { cookies: false, headers: false, data: false, query_string: false } })` and `maxRequestBodySize: 'none'`. Remove `email`/`username` from `SentryProvider`.
2. **Logger:** `logger.event(name, fields)` with a typed registry of event names → allowed field names; unknown fields dropped and counted. Ban raw `console.*` in `src/app/api/**` via ESLint (allow `errorSummary(err)`).
3. Keep `scrubEvent`, `scrubPhi`, `redactSecrets` and the PII log-scan tests as the **second** layer.
4. Test: a fixture event full of PHI keys/strings produces an event containing only allowlisted keys.

---

## 6. Backup / restore

**What exists:** Postgres on Render (`carelinkai-db`, referenced by the cron jobs in `render.yaml:35-38,89-92,117-120,141-144,165-168,185-188,209-212`). `render.yaml` has **no `databases:` block**; the Postgres plan, PITR availability and retention are **not recorded in the repo**. **No backup script, no restore runbook** (only `scripts/one-time/README.md:15-33`, a P3009 migration-repair note). Prisma uses `DATABASE_URL` only (`prisma/schema.prisma:6-9`; no `DIRECT_URL`/`SHADOW_DATABASE_URL`).

**Critical behavior:** every boot runs migrations against whatever `DATABASE_URL` points at (`package.json:10` → `scripts/migrate-deploy-with-timeout.js`), and every build runs `prisma migrate deploy` (`render-build-verbose.sh:48`). `render-build.sh:101-107` (not the configured build) contains a `prisma db push --accept-data-loss` fallback.

**Runbook (document only — not run):**
1. **Confirm capability** in the Render dashboard → `carelinkai-db` → *Recovery*: plan supports Point-in-Time Recovery and the retention window. Record the plan here.
2. **Choose the target time** (UTC) before the bad event.
3. **Restore to a new instance** ("Restore" → new database, e.g. `carelinkai-db-restore-YYYYMMDD`). Never restore over production.
4. **Isolate it:** no web service, cron job or preview environment may point at it. Restrict inbound IPs to the operator's address (Render → Access Control).
5. **Validate from a laptop/shell only** (read-only role if available):
   - `psql "$RESTORE_URL" -c 'select max(finished_at), count(*) from _prisma_migrations;'` and compare with the expected latest migration in `prisma/migrations/`.
   - Row counts for core tables (`"User"`, `"AssistedLivingHome"`, `"Inquiry"`, `"Resident"`, `"PlacementSearch"`, `"ConciergeOrder"`) vs. the last known figures.
   - Spot-check the newest `createdAt` per table against the chosen restore time.
   - `npx prisma migrate status` with `DATABASE_URL=$RESTORE_URL` (status only — **do not** `deploy`).
6. **Decide:** export the needed rows (`pg_dump --data-only -t …`) for a targeted repair, or (true disaster) promote.
7. **To promote:** set the service to maintenance; **suspend all cron jobs and the Stripe/Resend/ElevenLabs webhooks** (they would act on restored data, e.g. re-send reminders); update `DATABASE_URL` on the web service **and every cron job**; expect `npm start` to run pending migrations on boot (a restored DB behind the code will be migrated forward; failed-migration rows cause P3009 and a failed start — see `scripts/one-time/README.md`); verify with prod-verify; resume crons last.
8. **Afterwards:** delete or retain the restore instance per policy; record the drill (time to restore, data loss window).

**Recommendation (P1):** run this as a quarterly drill into an isolated instance; add the plan/PITR facts and the drill log to this file. Effort ≈ 2–3 h per drill.

---

## 7. Cheap fixes

| Fix | State today | Effort | Rank |
|---|---|---|---|
| Twilio inbound signature validation on `sms`, `status`, `voice`, `voice/accept` | Missing **[verified]** | 1–2 h | **P0** (P0-7) |
| Branch protection `enforce_admins` | Off per the 2026-10-28 audit (`context/CARELINKAI_TECH_OPEN_LOOPS.md:396`) | 5 min (GitHub settings) | P1 |
| Secret scan on push to main | gitleaks runs on `pull_request` only (`.github/workflows/secret-scan.yml:16-18`) **[verified]**; no PDF / `postgresql://` rules (OL-213) | 30 min | P1 |
| Node patch | `NODE_VERSION 20.11.0` (`render.yaml:10-11`) **[verified]** — Node 20 is end-of-life; CI mixes 18 and 20 (`ci.yml:65`) | 1–2 h + regression run | P1 |
| Admin MFA enforcement | None; and 2FA bypassable (P0-2) | 4–6 h with P0-2 | P1 (after P0-2) |
| Dependabot + `npm audit` gate | No `.github/dependabot.yml` **[verified]**; no audit step | 45 min + triage | P2 |
| CSP enabled/tightened | Middleware CSP only when `NEXT_PUBLIC_ENABLE_CSP=1` (`src/middleware.ts:324`), not set in `render.yaml` (state in Render unclear); `script-src 'unsafe-inline'`, `connect-src https:`; not applied to `/api/*` or `/auth/*` | 1–2 h for static headers in `next.config.js`; 1–2 days for nonce CSP | P2 |
| Impersonation step-up | None; reason optional; no real identity swap | 2–3 h step-up | P2 |
| Housekeeping | Captured local test artifacts tracked at the repo root (`operator.token.txt`, `*.cookies.txt`, `*.csrf.json`; cookie files are empty headers, the token file holds a token-like value of unknown origin) | 15 min to delete + treat as rotated if it was ever a prod value | P1 |
| Stale clones | Local clones may still carry the pre-squash history via stale `origin/*` refs (326 in the audit clone). **Checked: the public remote has 63 branches, none from the old history** (6 orphan screenshot branches created after 2026-10-28) | prune local clones | P2 |

---

## 8. Incident records (draft)

_Facts only, from `context/`, the repo and git history (including pre-squash commits still present in local clones). No conclusions on reportability. **Field list is provisional** — to be reformatted to the field list from ChatGPT's review once Chris pastes it._

### INC-2026-05-18 — Operator dashboard tenant scoping
| Field | Record |
|---|---|
| Dates | Introduced: unknown. Detected: on or before 2026-05-18. First fix commit: `9934e0c6` (2026-05-19 00:43 UTC, not on main). Follow-up audit: 2026-05-31 (`4e9653cf`, 14:31 UTC). Fix on main: `ec6c12e7` (#539, 2026-05-31 19:25 -0400) |
| Summary (quoted) | "All 4 dashboard API routes (/metrics, /charts, /alerts, /activity) ran Prisma queries with no operator scope, returning platform-wide aggregate counts to any logged-in operator." (`9934e0c6`). Follow-up: "/api/operator/leads — completely unscoped for OPERATOR role… all leads from all accounts were visible"; pipeline fallback to platform-wide stats; legacy dashboard empty `homeFilter {}` (`4e9653cf`) |
| Detection | "Prompted by a brand-new operator account seeing 8 residents/57 caregivers/3 inquiries" (`eea7e8a0`) |
| Systems / data | Operator dashboard APIs; aggregate counts; follow-up found unscoped leads, pipeline and legacy dashboard routes |
| Individuals involved | One named operator test/real account per `9934e0c6`/`47a97feb` (name withheld here) |
| Duration | "live 12 days" (`ec6c12e7`) |
| Containment / fix | Scoped queries in 7 routes; regression suite `e2e/operator-dashboard-scoping.spec.ts:4-6,20,47,62,76` |
| Classification recorded at the time | "Inference-channel disclosure (counts only, no PHI fields)" with attorney confirmation requested (`47a97feb`, OL-052/F1) |
| Open items | OL-052 attorney confirmation still listed (`context/CARELINKAI_TECH_OPEN_LOOPS.md:927`). **Note:** §4 of this package finds the same class of issue still present in `/api/dashboard/*` and `/api/operator/dashboard` for **non-operator** roles (P0-6) |
| Evidence | Commits above; `e2e/operator-dashboard-scoping.spec.ts`; vault `HIPAA_AUDIT_READINESS.md` (not read for this package) |

### INC-2026-10-28 — Credentials in repository history (Chris's date: 10-27)
| Field | Record |
|---|---|
| Dates | Scan and repo move recorded 2026-10-28 (`context/CARELINKAI_TECH_OPEN_LOOPS.md:394-399`; `context/DEV_SESSION_SUMMARIES.md:2518-2526`). Exposure start: unknown (history spans 3,485 commits) |
| Summary (quoted) | "Full scan (gitleaks over all 3,485 commits + PDF text + service-specific regexes) found live-looking credentials for several third-party services in history, and some are still in tracked `*.pdf` / one `.mjs` in the tree." (`OPEN_LOOPS.md:397`) |
| Related | OL-212 literal demo logins in seeds/docs/e2e (`:385-391`); earlier OL-122 committed `.env` (`:891-893`), OL-149 tracked `.env.local` Resend key (`:867`) |
| Detection | Session security pass, 2026-10-28 |
| Containment | New public `profyt7/carelinkai` from one squashed commit; old repo archived private as `carelinkai-archive`; Render re-linked; "The founder reported rotation done" (`:394`). Per-service list kept out of the public repo (sent to Chris) |
| Verified for this package | Public remote has no pre-squash branches (§7) |
| Open items | Rotate every listed credential (reported done); delete credential-bearing files from the tree; history-rewrite decision; gitleaks rules for PDFs and `postgresql://` URLs (`:398-399`); `DEMO_ACCOUNT_PASSWORD` rotation via `scripts/rotate-demo-passwords.ts` (`:385-391`); untracked-token housekeeping (§7) |
| Evidence | `OPEN_LOOPS.md:385-399`; `DEV_SESSION_SUMMARIES.md:2518-2526`; root commit `e477b640` |

### INC-2026-10-31 — Test concierge order emailed a real facility
| Field | Record |
|---|---|
| Dates | Fix commit `67f6009a` 2026-10-31 19:32 -0400; merged as #37 (recorded 2026-11-01). Exact send time: not recorded in the repo |
| Summary (quoted) | "saving TEST ORDER A's shortlist sent an accept/decline request to Heritage of Lyndhurst. Chris apologized to them." (`context/CARELINKAI_TECH_OPEN_LOOPS.md:62`) |
| Root cause (quoted) | "saving a shortlist emailed every curated home (DP and family requests alike) with no test flag and no confirmation. Re-saves also re-emailed homes that hadn't answered." (`:63`) |
| Data in the email | Facility accept/decline request: care level, payer lane, short timeline, signed response link (`src/lib/concierge/facility-response.ts:146-178`); no family name or contact (`src/lib/concierge/family-emails.ts` header) |
| Detection | Noticed during the live payment acceptance test |
| Containment / fix | `isTest` on `PlacementSearch`/`ConciergeOrder` (migration `20261101020000_concierge_is_test`), test contacts logged "suppressed (test)", confirmation step before emailing homes, no re-email of notified homes (`:65-69`; `src/lib/concierge/test-orders.ts:8-17`; `src/app/api/admin/concierge/[id]/route.ts:237`) |
| Communication | Chris apologized to the facility (`:62`) |
| Open items | DP re-notified on every re-save; manual release re-sends the family email; no admin cancel/refund (`:73-76`). TEST ORDER A/B closed 2026-11-02 (`:72`) |
| Evidence | `OPEN_LOOPS.md:61-76`; `DEV_SESSION_SUMMARIES.md:2883-2902`; `CARELINKAI_TECHNICAL_STATE.md:33-37`; commit `67f6009a` |

---

## 9. Ranked list (all items)

| Rank | Item | Section |
|---|---|---|
| P0 | P0-1 convert route returns full User rows | §0, §4 |
| P0 | P0-2 2FA bypass | §0, §3 |
| P0 | P0-3 family self-join | §0, §4 |
| P0 | P0-4 resident list / CSV `homeId` override | §0, §4 |
| P0 | P0-5 `/api/documents/*` session-only | §0, §4 |
| P0 | P0-6 reports + dashboards global for non-operators | §0, §4 |
| P0 | P0-7 unsigned Twilio webhooks | §0, §7 |
| P1 | Remaining unscoped resident/inquiry/caregiver routes (ranks 7–13) + shared helper + CI guard | §4 |
| P1 | Anthropic: PHI wrapper + per-feature decision + BAA/ZDR confirmation | §2 |
| P1 | Sentry: drop request body/headers/cookies and `user.email/name` | §5 |
| P1 | Session revocation + privileged idle/absolute limits | §3 |
| P1 | Anonymous inquiry POST response leak | §1.3 |
| P1 | DP legacy direct placement email + ownership | §1.5, §4 |
| P1 | `requireAnyRole` return ignored / no-role pass-through | §4 |
| P1 | Render-log PHI (`family/match` body, DP query) | §5 |
| P1 | `enforce_admins`, push secret scan, Node upgrade, MFA enforcement, token-file cleanup | §7 |
| P1 | Backup/restore runbook + first drill | §6 |
| P2 | Allowlist-first logging schemas | §5 |
| P2 | CSP, Dependabot/audit, impersonation step-up/design | §7, §3 |
| P2 | GA4 path id-collapsing; cron/claim secret fallbacks; non-prod family bypass; ElevenLabs guard parity + transcript guard; Cloudinary for inquiry documents | §1, §2, §4 |

_No code was changed for this package._
