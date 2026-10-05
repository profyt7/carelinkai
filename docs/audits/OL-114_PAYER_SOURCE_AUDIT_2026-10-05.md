# OL-114 payer-source screener — audit (2026-10-05)

**Question asked:** where does the payer-source screener live, is it live in
intake, do the lanes map correctly, and can any code path issue a facility
placement-fee invoice?

**Short answer**

| | Status |
|---|---|
| Screener code + schema | **Live on `main`** (merged in #695; migration `20260705000001_payer_source_screener`). |
| Lane mapping | **Correct and pinned by tests**: private funds + LTC insurance → `FEE_ELIGIBLE`; Medicaid/waiver, Medicare Advantage, VA → `FREE_LANE`; not-sure/blank → `UNKNOWN`. |
| Live in intake | **Partially.** Wired into 2 of the 4 intake surfaces (home-page inquiry form, DP placement-request modal). Missing from `/lead/new` (DP quick lead) and the carebot. |
| "No code path can issue a facility fee invoice" | **Cannot confirm — the opposite is true.** `convertInquiryToResident` queues a **$500 placement-fee Stripe invoice item** on every inquiry→resident conversion and never reads the payer source / fee lane. See §4. |

---

## 1. Where it lives

| Concern | Path |
|---|---|
| Enum + lane derivation (the AKS firewall) | `src/lib/payer/payer-source.ts` — `PayerSource`, `deriveFeeLane()`, `isPayerSource()`, labels/options. `feeLane` is deliberately **not persisted**; derived at read time only. |
| Schema | `prisma/schema.prisma` — `enum PayerSource`, `Inquiry.payerSource PayerSource?`, `PlacementSearch.payerSource PayerSource?`. |
| Migration | `prisma/migrations/20260705000001_payer_source_screener/migration.sql` (idempotent, additive). |
| Inquiry payload / validation | `src/lib/inquiries/schema.ts` (`payerSource: z.unknown().optional()` — a bad value can never 400 an inquiry), `src/lib/inquiries/payload.ts`. |
| Admin read-only display | `src/components/admin/PayerLaneBadge.tsx`; used on `/admin/inquiries`, `/admin/inquiries/[id]`, `/admin/concierge`, `/admin/concierge/[id]`. |
| Tests | `__tests__/payer-source.unit.test.ts` (full lane matrix), `__tests__/payer-source.api.test.ts` (persistence via the two intake APIs), `__tests__/payer-lane-badge.render.test.tsx`, and the new `__tests__/payer-lane.audit.test.ts` (this audit's proof + the §4 tripwire). |

## 2. Intake surfaces — is it live?

| Intake surface | UI file | API route | Persists `payerSource`? |
|---|---|---|---|
| Family inquiry on a home page (`/homes/[id]`, two form variants) | `src/app/homes/[id]/page.tsx` (`#payerSource`, `#payerSourceAlt`) | `POST /api/inquiries` → `src/app/api/inquiries/route.ts` | **Yes** → `Inquiry.payerSource` (invalid/blank → `null`). |
| DP placement request (search → "Request placement") | `src/app/discharge-planner/search/_components/PlacementRequestModal.tsx` | `POST /api/discharge-planner/placement-request` and `POST /api/discharge-planner/concierge` | **Yes** → `PlacementSearch.payerSource` (top-level field; the label is also echoed into `patientInfo` for humans). |
| DP quick lead (`/lead/new`) | `src/components/lead/DPLeadForm.tsx` | `POST /api/lead/dp` | **No** — form has no payer field (by design: "no patient details"). Gap only if these leads are meant to get a lane. |
| Carebot chat (`/api/carebot/chat`) | `src/components/carebot/ChatWindow.tsx` | — | **No** — only explains Medicaid/Medicare in copy; does not tag. |
| Operator-created inquiry (`NewInquiryModal`) | `src/components/inquiries/NewInquiryModal.tsx` | `POST /api/inquiries` | **No field in the modal** — accepted by the API if ever sent. |

Everything is optional and "tags only": no matching, search, ranking or
routing reads `payerSource` (verified: the only readers are the admin badge
components and the two API routes that write it).

## 3. Lane proof

`deriveFeeLane()`:

```
PRIVATE_FUNDS      → FEE_ELIGIBLE
LTC_INSURANCE      → FEE_ELIGIBLE
MEDICAID_WAIVER    → FREE_LANE
MEDICARE_ADVANTAGE → FREE_LANE
VA_BENEFITS        → FREE_LANE
NOT_SURE / null    → UNKNOWN
<anything else>    → UNKNOWN   (never FEE_ELIGIBLE)
```

Pinned by `__tests__/payer-source.unit.test.ts` (full matrix + "no federal
payer is ever FEE_ELIGIBLE") and restated in the requested terms in
`__tests__/payer-lane.audit.test.ts`. The mapping is marked **pending attorney
review** in the source; change it only through that review.

## 4. ⚠️ A facility placement-fee invoice path IS live (needs a decision)

`src/lib/services/inquiry-conversion.ts` → `triggerPlacementFee()`, called
fire-and-forget at the end of `convertInquiryToResident()`, which is reached
from `POST /api/operator/inquiries/[id]/convert` (operator UI:
`ConvertInquiryModal` on `/operator/inquiries/[id]`, the quick-actions menu and
the inquiry detail modal).

On **every** successful conversion it:

1. creates a `Payment` row `{ type: 'PLACEMENT_FEE', status: 'PENDING', amount: PLACEMENT_FEE_CENTS/100 }` — default **$500** (`PLACEMENT_FEE_CENTS` defaults to `50000`; `.env.example` ships that value);
2. if the operator has a `stripeCustomerId`, calls `stripe.invoiceItems.create(...)` so the fee is **collected on the operator's next Stripe invoice**, and marks the payment `PROCESSING`; otherwise leaves it `PENDING` "for manual collection".

It never reads `inquiry.payerSource`, never calls `deriveFeeLane()`, and has
no kill-switch env flag. A Medicaid-waiver or VA-paid placement converted by an
operator would be invoiced exactly like a private-pay one.

**What limits the blast radius today**

- The operator must have a `stripeCustomerId`. Those are only created by the
  wallet/deposit flows (`/api/billing/deposit`, `/api/payments/deposit-intent`);
  with Stripe "configured, not live" most operators have none → the fee lands as
  a `PENDING` Payment row, not a Stripe charge.
- With no/placeholder `STRIPE_SECRET_KEY` the Stripe call fails and the payment
  is marked `FAILED`.

So in practice the exposure right now is **PENDING ledger rows that claim a
$500 fee on conversions**, plus a live Stripe path the moment any operator has
a customer id. This contradicts both the AKS firewall comment in
`payer-source.ts` and the sprint rule "no facility placement-fee invoicing".

**Not changed in this PR** (the brief said audit, and "do not add or enable"
— disabling is still a billing-behavior change that is the founder's call).
Proposed fix, ready to implement on request:

1. Gate `triggerPlacementFee` behind `PLACEMENT_FEE_ENABLED=1` (default off) —
   one `if` at the top of the function.
2. Inside it, return early unless `deriveFeeLane(inquiry.payerSource) === 'FEE_ELIGIBLE'`
   (so `FREE_LANE` **and** `UNKNOWN` never bill; unknowns go to the Financing
   Navigator flow, not an invoice).
3. Decide what to do with existing `Payment` rows of type `PLACEMENT_FEE`
   (a `scripts/report-placement-fee-payments.ts` can list them first).

`__tests__/payer-lane.audit.test.ts` contains a **tripwire** test that pins
today's behavior (a FREE_LANE conversion still queues the invoice item). When
the fix lands, that test must be flipped — it is named so nobody misreads it
as desired behavior.

## 5. Other things noticed while auditing (no action taken)

- `src/lib/services/inquiry-conversion.ts` and the convert route each build
  their own `PrismaClient` — consolidated by sprint item 2 (PR #715).
- `PLACEMENT_FEE_CENTS` is also used to compute affiliate commissions
  (`triggerAffiliateCommission`), so a kill-switch must not zero it.
