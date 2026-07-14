# Shift-Fill / Scheduling Engine — Audit (OL-070)

_Audited 2026-06-12 from `/home/user/carelinkai`. This documents a previously
**undocumented**, largely-built "Phoebe-style" shift-fill / on-call dispatch
system. It is written for engineering + the attorney consult (see §7)._

> **TL;DR.** There is a real, working operator-facing **On-Call AI dispatcher**
> (SMS/Twilio auto-outreach to fill open shifts), a reliability **points/call-off**
> system, and — separately — a **direct family→caregiver household-shift lane**
> (`HouseholdShift`). Two of these conflict with the CNOS decision (no
> household-employer lane; frozen unaffiliated-caregiver marketplace). The
> dispatcher also contacts **unaffiliated** caregivers. These are flagged for
> legal review in §7. Nothing here is wired to a Render cron / Twilio creds that
> we can confirm in prod (see §5).

---

## 1. How it landed (git history)

| Feature | Commit | Date | Notes |
|---|---|---|---|
| On-Call AI auto-outreach (dispatcher, ShiftNeed/CoverageAttempt, Twilio webhooks, operator UI) | `093cf9a1` | ~2026-04-25 | Single large drop (~20 files) |
| Reliability: call-offs, gamification points, shift bidding | `e5dcd3bb` | ~2026-04-25 | Builds on dispatcher |
| **Household shift scheduling for FAMILY users ("Option B")** | `ad251e9c` | 2026-05-07 | Adds `HouseholdShift` + `/api/family/household` + UI — **the household-employer lane** |

It was never added to the technical-state docs or the open loops, which is why
it surfaced as a surprise. (`HouseholdShift` landing commit `ad251e9c` verified;
dispatcher attribution per the audit.)

---

## 2. Data model (`prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `ShiftNeed` | An open shift at a home needing coverage; tracks dispatch `currentWave`, `status` (`OPEN/FILLING/FILLED/UNFILLED/CANCELED`), `filledByCaregiverId`. |
| `CoverageAttempt` | One SMS/voice contact attempt per caregiver per wave; `channel` (SMS/VOICE/EMAIL), `outcome` (SENT/CONFIRMED/DECLINED/ERROR/NO_RESPONSE), `messageSid` (Twilio), `wave`. |
| `CallOff` + `CallOffType` (`NO_SHOW/LATE_ARRIVAL/EARLY_DEPARTURE/CALLED_OFF`) | Reliability incidents → score/points penalty. |
| `CaregiverPoints` + `PointTransaction` + `PointsTier` (`BRONZE/SILVER/GOLD/PLATINUM`) | Gamification / reliability incentives. |
| `ShiftBid` | Caregivers bid on open shifts; operator accepts/declines. |
| **`HouseholdShift`** | **A shift scheduled directly between a FAMILY user and a hired caregiver.** `familyUserId` (the employer), `hireId → MarketplaceHire`, `scheduledStart/End`, `status` (free-string). |
| `MarketplaceHire` | Hire relationship. Links optionally to `MarketplaceListing` (a family-posted job), `CaregiverShift` (operator shift), `Payment`, and `HouseholdShift[]`. Bridges the operator and family models. |
| `MatchRequest/MatchResult/MatchFeedback` | **Separate** family→facility *placement* search (ranks homes by fit). Not part of shift dispatch. |

---

## 3. Backend surface

**On-call dispatch (operator-gated):**
- `src/lib/oncall/dispatcher.ts` — `dispatchWave(shiftNeedId)` (selects + ranks caregivers, sends SMS, records attempts, advances wave) and `handleCaregiverReply(messageSid, reply)` (parses YES/NO, atomically fills the shift + assigns the `CaregiverShift`, notifies others).
- `src/lib/oncall/ranker.ts` — weighted scoring (credentials, skills, Haversine proximity, reliability, experience, inverse hourly-rate, BG check).
- `src/lib/oncall/rules.ts` — hardcoded defaults (`parallel_batch: 8`, `wave_cooldown_minutes: 10`, `max_waves: 3`, channels `['SMS']`). **Not runtime-configurable.**
- API: `GET/POST /api/scheduling/needs`, `GET/PATCH /api/scheduling/needs/[id]`, `POST /api/scheduling/needs/[id]/start`, `.../cancel`.
- Cron: `POST /api/cron/oncall-waves` (guarded by `CRON_SECRET`) re-dispatches `FILLING` needs after cooldown.
- Twilio webhooks: `/api/webhooks/twilio/sms` (inbound reply → dispatcher). `/status`, `/voice`, `/voice/accept` are **stubs**.

**Reliability / points:** `POST /api/operator/shifts/[id]/calloff`, `/api/caregiver/points`, shift-bid routes. Points wired into timesheet approval + review creation.

**Marketplace / payroll:** `GET /api/marketplace/hires`, `GET /api/timesheets`, `GET /api/payroll/summary` (aggregates `CAREGIVER_PAYMENT` via `marketplaceHire.shift.home.operatorId` — assumes the **operator** is payor).

**Household (family-gated):** `GET/POST /api/family/household`, `PATCH/DELETE /api/family/household/shifts/[id]`.

---

## 4. UI surface

- **Operator:** `/operator/oncall` (Professional+ gated) → `OnCallQueue.tsx` (need cards, "Start Auto-Fill / Send Next Wave", attempt history) + `CreateNeedModal.tsx`. Nav: "On-Call AI". Call-offs via `ShiftsTable.tsx` → `RecordCallOffModal.tsx`.
- **Family:** `/marketplace/hires` (dual-persona) → `FamilyHireCard` schedules/manages `HouseholdShift`s. Nav: "My Household" (per `ad251e9c`).
- **Caregiver:** `/caregiver/points` → `PointsDashboard.tsx`.

These appear wired (not orphaned).

---

## 5. External deps / env — **prod config UNCONFIRMED**

Code requires (documented in `.env.example` lines ~148–155, under an "SMS notifications" comment):
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and `CRON_SECRET` (for the wave cron).

**Graceful no-op:** `src/lib/sms/sms-service.ts` and `dispatcher.ts` log-only when Twilio creds are absent (`sendSMS` returns `false`; dispatch "succeeds" but **no SMS is sent**). So the dispatcher can appear to work in prod while silently sending nothing.

**Open questions (cannot verify from the repo — check Render):**
- Are `TWILIO_*` actually set in production? If not, on-call dispatch is a silent no-op.
- Is a Render cron pointed at `/api/cron/oncall-waves` with the right `CRON_SECRET`? (No cron registration is committed.)
- Twilio webhooks have **no HMAC/signature verification** — anyone who can POST to `/api/webhooks/twilio/sms` could confirm/decline shifts. (Security follow-up.)

---

## 6. Functional vs stubbed

| Component | Status |
|---|---|
| ShiftNeed CRUD, dispatch waves, SMS send (when configured), reply parsing, shift assignment | ✅ Real |
| Caregiver ranking (proximity + multi-factor) | ✅ Real |
| Wave cron re-dispatch | ✅ Real (needs the cron + secret wired in prod) |
| Call-offs, points, tiers, shift bidding | ✅ Real |
| HouseholdShift CRUD + family UI | ✅ Real |
| Marketplace hires / timesheets / payroll summary | ✅ Real (aggregation only) |
| Twilio **delivery-status** callback | ⚠️ Stub (received, not applied) |
| Twilio **voice / IVR** dispatch | ⚠️ Stub |
| **Caregiver payouts** (Stripe Connect / wages / tax) | ❌ Not present — `Payment` records amounts/status only; **no payout rail, no W2/1099, no withholding, no employment agreement** |

---

## 7. CNOS / Risk-9 collision points — **attorney consult agenda**

> CNOS ratified: **(a) no household-employer lane** (CareLinkAI will not place
> caregivers directly with private households as employer/intermediary), and
> **(b) the unaffiliated-caregiver marketplace is frozen.** The following code
> conflicts with one or both. Each item is verified against the source.

### C1 — `HouseholdShift` *is* a household-employer lane (conflicts with (a))
`HouseholdShift.familyUserId` is the employing family; creation requires the
hire to come from a **listing the family posted** (`/api/family/household/route.ts`:
`where: { id: hireId, listing: { postedByUserId: userId } }` → `householdShift.create({ familyUserId: userId, ... })`).
End-to-end this lets a **family post a job → hire a caregiver → schedule that
caregiver's shifts** through CareLinkAI. That is exactly the lane CNOS says
doesn't exist.
- **Legal exposure to raise:** co-employment / employment-intermediary or
  staffing-agency licensing; wage-&-hour; who is employer of record.
- **Decision needed:** is this lane being removed, gated off, or formally
  carved out as an exception (and on what legal basis)?

### C2 — Dispatcher recruits **unaffiliated** caregivers (conflicts with (b))
`src/lib/oncall/dispatcher.ts` candidate query (verified, ~lines 42–47):
```ts
where: {
  isVisibleInMarketplace: true,
  employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
  OR: [
    { employments: { some: { operatorId: need.home.operatorId, endDate: null } } },
    { employments: { none: {} } },   // ← caregivers with NO employer at all
  ],
}
```
So an operator's auto-fill can SMS caregivers who have **no employment
relationship**, and one who replies "YES" is assigned the shift — i.e. it reaches
into the frozen unaffiliated pool and facilitates work with no hire contract.
- **Decision needed:** drop the `employments: { none: {} }` branch (restrict
  dispatch to the operator's own employed caregivers) unless legal blesses it.

### C3 — `MarketplaceHire` conflates operator vs family employment; payroll assumes the operator
The same hire supports operator shifts (`shiftId → CaregiverShift`) and
family listings (`listing.postedByUserId = family`, `householdShifts[]`). But
`/api/payroll/summary` only sums payments via `marketplaceHire.shift.home.operatorId`.
For a **family-posted** hire with no operator shift, that query matches nothing →
**payment path is undefined** for household work.
- **Decision needed:** is CareLinkAI ever in the caregiver-payment flow for
  household shifts? If yes, EOR/tax/1099 questions (C4) apply; if no, the UI
  shouldn't imply scheduling/work it can't pay for.

### C4 — Employment-classification signals without employment infrastructure
The platform exerts **control signals** (dispatch assigns work; points reward
reliability; call-offs deduct points/penalize) yet has **no** tax classification,
withholding, workers-comp, or signed agreement in the data model. Control +
direct payment is the classic 1099-vs-W2 reclassification risk.
- **For the agenda:** confirm the intended classification and who bears
  employer obligations (CareLinkAI / operator / family) before any real money or
  real caregivers flow through household shifts.

### C5 — Operational footnote
Because Twilio likely isn't live and the wave cron isn't committed (§5), this may
all be **dormant** in production today — which is the safest moment to decide
remove-vs-gate-vs-carve-out **before** it's switched on.

---

## 8. Recommended next steps (engineering)

1. **Legal-gate the household lane (C1) and the unaffiliated dispatch branch (C2)** behind a feature flag, defaulted **off**, pending the consult — so they can't be exercised in prod.
2. Decide remove vs. keep for `HouseholdShift` / `/api/family/household` / "My Household" UI.
3. If any caregiver payout is intended: design the payout rail + classification (out of scope here).
4. Add Twilio webhook signature verification.
5. Confirm/curate Render config: `TWILIO_*`, `CRON_SECRET`, and the `/api/cron/oncall-waves` cron — or document that on-call is intentionally dormant.
6. Fold this into `CARELINKAI_TECHNICAL_STATE.md` (a "Shift-Fill / Scheduling Engine" section) and the risk register (Risk-9) — currently absent.

_File references and verbatim quotes for each claim are in the engineering audit
trail; the load-bearing items in §7 were verified directly against source on
2026-06-12._
