# LLM data readiness: CareLinkAI (Nov 2026)

_Read-only audit of `main` at `9770d5e` (2026-11-03). No code changed. Every finding cites the file that backs it._

**Inputs:**
- The strategy doc `04_CareLinkAI/LLM_Data_Strategy_2026_11_02.md` is **not in `profyt7/chrisos-vault`**: not on `main`, not on its other branch, and not under any similar name. It was probably never pushed.
- ChatGPT's review hadn't been pasted when this was written.

This report answers the six questions in the request. It will be reconciled with both documents once they're available.

**Live-data caveat:** getcarelinkai.com is outside this environment's network policy. Everything below comes from the code. The production checks a live fetch would settle (robots.txt as served, CDN or Render bot rules, actual JSON-LD output) are marked **[verify live]**.

---

## Summary: what matters most

| # | Finding | Severity |
|---|---|---|
| P1 | **Public APIs return operator login emails to signed-out visitors.** `/api/search` returns `operator.email` on every result (`src/app/api/search/route.ts:856-859`), including the unclaimed sentinel address. `/api/homes/[id]` returns a claimed operator's name and email (`src/app/api/homes/[id]/route.ts:339-345`). Both are public: `/search` calls `/api/search` without sign-in. | **High** (privacy) |
| P2 | `/api/search` returns a field named `availability` that is `capacity - currentOccupancy` (`route.ts:851-852`). Its own comment says never to render it as availability (OL-200). Any API consumer, AI agents included, will read it as open beds. | High (truth) |
| P3 | **The Medicaid waiver source is misattributed.** Every non-UNKNOWN status is published with the fixed note "Source: Western Reserve Area Agency on Aging, Oct 2026" (`src/lib/medicaid/waiver.ts:29,163`). That includes statuses later set by an AI call, an operator or an admin. The real `medicaidWaiverSource` and `medicaidWaiverVerifiedAt` are stored but never published, in the page or in the JSON-LD. | High (truth) |
| H1 | **History is partial.** Availability and waiver changes are logged append-only, but **admin price edits are not** (`setHomePricing`, `src/lib/pricing/pricing.ts:181`). Care level has no source or date at all. There's no single record of "who said what, when, how, and until when." | Medium |
| C1 | **The sitemap has no listing pages.** It has 12 static URLs plus suburb and guide pages, but no `/homes/<id>` (`src/app/sitemap.ts`). `lastModified` is the build time for every URL. | Medium (discoverability) |
| S1 | **JSON-LD lacks confirmation dates for price and waiver** and lacks `dateModified`. Directory cards publish `priceRange` with **no source** (`buildListItemBusiness`, `src/lib/seo/jsonld.ts:219`). | Medium |

---

## 1. Observation history (highest priority)

### How each fact is stored today

**The pattern:** the current value lives on `AssistedLivingHome` (`prisma/schema.prisma:525`) and is **overwritten in place**. History lives in three separate places:

- **`EntityEvent`** (`schema.prisma:3830`) is the append-only change log from sprint W5-1 / Δ14. It records `eventType`, `field`, `oldValue`/`newValue` (JSON), `source` (`EventSource`), the actor and `occurredAt`. Nothing deletes from it: there is no `entityEvent.delete*` anywhere in `src/` or `scripts/`.
- **`AvailabilityObservation`** (`schema.prisma:2844`) holds **one row per AI call** (outbound and inbound). It keeps the raw answers, QA status, corrections and `appliedAt`.
- **`AvailabilityPing`** (`schema.prisma:2787`) holds **one row per weekly one-tap ping**: sent, expired, reply and outcome.

| | **Availability** | **Price** | **Medicaid waiver** | **Care level** |
|---|---|---|---|---|
| Current value (overwritten) | `availabilityCount`, `availabilityVerifiedAt`, `availabilitySource` | `startingPriceMonthly`, `priceRangeLow/High`, `priceSource`, `priceUpdatedAt` (+ legacy `priceMin/Max`) | `medicaidWaiverStatus`, `medicaidWaiverSource` (free string), `medicaidWaiverVerifiedAt`; `medicaidPendingAccepted` (+`Source`, `VerifiedAt`) | `careLevel CareLevel[]` only |
| Every change kept? | **Yes.** `updateAvailability()` writes the home row and an `availability.updated` event in one transaction, with old and new `{count, source, verifiedAt}` (`src/lib/availability/availability.ts:100-140`). Admin, Twilio and ping writes all go through it. `call-qa` logs its own event. | **Partly.** AI-call approvals log `pricing.updated` (`call-qa.ts`). Operator edits log `field.changed`, but only for `startingPriceMonthly`, not the range or `priceSource` (`api/operator/homes/[id]/route.ts:16`). **Admin edits through `setHomePricing()` log nothing.** | **Yes.** `acceptance.updated` events from the admin route, `call-qa` and the WRAAA import, each with `source`, `verifiedAt` and, for calls, `observationId` (`call-qa.ts:196-217`, `scripts/import-waiver-baseline.ts:100`). | **Partly.** Operator and admin edits log `field.changed`. Imports and seeds don't. |
| `observed_at` (when the home said it) | AI call: `AvailabilityObservation.calledAt`, which `call-qa` copies to `availabilityVerifiedAt` ✔. Ping, admin and operator writes use the **write time**. | Not stored separately (`priceUpdatedAt` = write time). AI call: `calledAt` on the observation. | `medicaidWaiverVerifiedAt` (import: the date WRAAA was accessed; call: `calledAt`). | — |
| `confirmed_at` (when we accepted it) | AI call: `qaAt` / `appliedAt` on the observation. Other paths: same as observed. | Same as observed. | Event `occurredAt`. | — |
| Source type | `AvailabilitySource` enum (OPERATOR, SMS, EMAIL, VOICE, CONCIERGE, PING, AI_CALL, AI_CALL_INBOUND) | `PriceSource` (OPERATOR, DP_ESTIMATE, PUBLIC, FAMILY_AVG, AI_CALL) | **Free string** (`VA_CALL`, `OPERATOR`, `AI_CALL`, `WRAAA…`), not an enum | **none** |
| Method (phone / portal / ping / import) | Folded into the source enum (PING vs AI_CALL vs OPERATOR) | Folded into `PriceSource`, which mixes *who* with *how* | Folded into the free string | none |
| `expires_at` | **Computed, not stored:** `AVAILABILITY_FRESH_DAYS = 10` (`availability.ts:18`). Pings store `expiresAt`. | **Computed:** `PRICING_FRESH_DAYS = 180` (`pricing.ts:15`) | **none** (WRAAA baseline never expires) | none |
| Scope (AL vs MC beds, unit type) | Observations keep `bedsAL` and `bedsMC` separately, but **the home row stores only their sum** (`call-qa.ts:6,57-59`) | Starting price only; no care-level or unit scope (the family quote report has `careLevel`) | Waiver vs pending-application are separate fields ✔ | — |
| Corrections | `AvailabilityObservation.corrections` (JSON) + `qaStatus CORRECTED` | Only through call-qa corrections | Via call-qa corrections | — |
| "No response" stored separately from "confirmed none" | **Yes:** ping `outcome = EXPIRED` vs `UPDATED` with count 0; observation `NO_ANSWER` / `DECLINED` vs `ANSWERED` with beds 0. The home row isn't touched on no response; the badge ages out. | **Partly:** `priceUndisclosed` exists on the observation only. The home row has no "declined to share" state. | **No:** `UNKNOWN` covers both "never checked" and "asked, no answer". | No |

### Real gaps

1. **No single append-only record per fact.** Three structures (events, observations, pings) with different shapes. Answering "every confirmation of open beds at home X" means a three-way join, and some writes (admin price) leave no trace.
2. **Admin price edits are unlogged** (`setHomePricing`). Operator edits log only `startingPriceMonthly`.
3. **Care level has no provenance:** no source, no date, no history for imported values.
4. **Waiver source is a free string**, and the public note ignores it (P3).
5. **`expires_at` is policy-in-code**, not a stored fact. Changing the 10-day window silently re-dates every past confirmation.
6. **Scope is lost at write time:** AL and MC beds are summed onto the home.
7. **Method is mixed into source:** you can't tell "operator via portal" from "operator by phone to our VA".
8. **Waiver "no answer" can't be told apart from "never asked"** (both `UNKNOWN`).

### Smallest migration that closes them (proposal only)

One new append-only table. The home columns stay as the denormalized "current value" cache that pages already read.

```prisma
enum FactKind     { AVAILABILITY_AL AVAILABILITY_MC AVAILABILITY_TOTAL PRICE_STARTING PRICE_RANGE WAIVER_STATUS MEDICAID_PENDING CARE_LEVELS }
enum FactResult   { VALUE NONE DECLINED_TO_SHARE NO_RESPONSE CORRECTION RETRACTED }
enum FactMethod   { AI_PHONE_OUT AI_PHONE_IN HUMAN_PHONE EMAIL_PING SMS_PING OPERATOR_PORTAL ADMIN_EDIT CONCIERGE IMPORT }
enum FactSourceType { FACILITY OPERATOR PUBLIC_RECORD THIRD_PARTY_LIST FAMILY_REPORT ESTIMATE }

model FactObservation {
  id           String         @id @default(cuid())
  homeId       String
  fact         FactKind
  result       FactResult
  value        Json?          // { count } | { amount, low, high } | { status } | { levels: [...] }
  observedAt   DateTime       // when the home / source said it
  confirmedAt  DateTime       // when we accepted it (QA, admin save, reply received)
  expiresAt    DateTime?      // stored at write time from the policy in force
  method       FactMethod
  sourceType   FactSourceType
  sourceRef    String?        // observationId | pingId | import name+date | userId
  scope        String?        // e.g. "AL", "MC", "studio" (null = whole home)
  supersedesId String?        // correction / retraction chain
  actorUserId  String?
  createdAt    DateTime       @default(now())
  home         AssistedLivingHome @relation(fields: [homeId], references: [id], onDelete: Restrict)
  @@index([homeId, fact, observedAt(sort: Desc)])
  @@index([fact, expiresAt])
}
```

- **One writer:** `recordFact(tx, …)`, called from `updateAvailability`, `setHomePricing`, the waiver writers, `call-qa`, the ping engine and the operator and admin home edits, in the same transaction as the home update. Waiver `UNKNOWN` after an unanswered ask becomes `result = NO_RESPONSE`.
- **Backfill (one script, dry run first):** from `EntityEvent` (`availability.updated`, `acceptance.updated`, `pricing.updated`, `field.changed`), `AvailabilityObservation` (scope from `bedsAL` / `bedsMC`) and `AvailabilityPing` (`EXPIRED` → `NO_RESPONSE`).
- **`onDelete: Restrict`** so history survives anything short of a deliberate purge.
- **Smaller interim**, if the table waits:
  - log `setHomePricing`, plus the full operator price and source fields, to `EntityEvent`;
  - add `availabilityExpiresAt` to the home row;
  - make `medicaidWaiverSource` an enum.

  About half a day, but still not one queryable history.

---

## 2. Structured data (JSON-LD)

### What's emitted today

| Page | JSON-LD | Source |
|---|---|---|
| **Every page** (root layout) | `Organization`: name, url, logo, phone, email, contactPoint, description, address, areaServed (counties), `knowsAbout`, slogan, additionalProperty (llms.txt link) | `buildOrganizationJsonLd` (`jsonld.ts:286`), `src/app/layout.tsx:225` |
| **Listing** `/homes/[id]` | `LocalBusiness`: name, description, image (no placeholders), phone (claimed only), address, geo, **`identifier` = ODH license (when matched)**, `priceRange`, `makesOffer` (one Offer per care level; the first carries `UnitPriceSpecification` with a "Starting price (source label)" name), `additionalProperty` (below), `areaServed`, publisher. Plus `BreadcrumbList`. | `buildListingJsonLd` (`jsonld.ts:97`), `src/app/homes/[id]/layout.tsx:104` |
| **Directory** `/cleveland/assisted-living`, suburbs | `ItemList` of `ListItem` → `LocalBusiness` (name, url, image, phone, `priceRange`, address) + `BreadcrumbList` | `buildListingsItemListJsonLd` / `buildListItemBusiness` (`jsonld.ts:219,245`) |
| `/cleveland` hub | `ItemList` of pages + breadcrumb | `buildPagesItemListJsonLd` |
| Care-type pages, FAQs | `BreadcrumbList`, `FAQPage` (FAQ_VERIFIED explains "Verified") | `buildFaqPageJsonLd`, `src/lib/seo/directory-faq.ts` |
| Home care guide | `WebPage` (reworded in #44) + breadcrumb | `src/app/cleveland/home-care-agencies/page.tsx` |

**Listing `additionalProperty` today:**
- **Availability:**
  - "Verified availability" = `Verified` or `Contact to confirm`.
  - Only when fresh (10 days): "Availability verified at", "Openings (verified)", `availabilityVerifiedAt`, `availabilitySource` (+ label).
- **Waiver:** `medicaidWaiverStatus` (+ line + the fixed WRAAA note), `medicaidPendingAccepted`.
- **ODH inspections:** survey count, latest date, type, citations, total citations.
- **Other:** "Free Medicaid lane", and "Listing verified by operator" = Yes/No (claimed).

### Flags (things that imply a fact we don't hold)

- ✅ **No `Offer.availability` / `InStock`** anywhere. Openings are published only inside the 10-day window, with source and date. This is the right pattern.
- ⚠️ **`priceRange` on directory cards has no source** (`buildListItemBusiness`). It publishes `DP_ESTIMATE` and `PUBLIC` prices as a bare "From $X/month"; only `FAMILY_AVG` is excluded.
- ⚠️ **The listing price has no date.** The `UnitPriceSpecification` name carries the source label, but there's no `validFrom` or confirmation date. `PricingView.confirmedAt` exists (`pricing.ts:99`) and isn't emitted.
- ⚠️ **The waiver description cites WRAAA even when the status came from a call or operator** (P3), and carries no date.
- ⚠️ **`makesOffer` asserts care levels with no provenance.** Care levels mostly come from the ODH and WRAAA imports. "Offers Memory care" is published as fact.
- ⚠️ **"Listing verified by operator: Yes"** means "claimed by an operator", not that its facts were verified. Suggested wording: "Claimed by the operator".
- ℹ️ No `dateModified` on any listing.

### Smallest additions

All are in `buildListingJsonLd`; the directory cards get the source fix only.

1. **`dateModified`**: the latest of `availabilityVerifiedAt`, `priceUpdatedAt`, `medicaidWaiverVerifiedAt` and the last inspection date.
2. **`identifier`**: already emitted when `odhLicenseNumber` is set ✔. Optionally add `"propertyID": "ohio-odh-rcf"` for a stable machine key.
3. **Price `PropertyValue`s** (always present when a price is shown):
   - `priceSource` (enum value plus label);
   - `priceConfirmedAt` (only when `confirmedAt` is set);
   - `priceStatus` = `confirmed` | `estimate` | `family-reported`.
4. **Waiver `PropertyValue`s:** `medicaidWaiverSource` (real source) and `medicaidWaiverVerifiedAt`. Fix the description to use the real source.
5. **Availability expiry:** `availabilityExpiresAt` (= verifiedAt + 10 days) next to `availabilityVerifiedAt`.
6. **Directory cards:** drop `priceRange` unless the price is operator- or AI-call-confirmed, or prefix it ("Estimated from $X").

---

## 3. Crawlers

| Check | Status |
|---|---|
| `robots.txt` | `src/app/robots.ts`: `User-agent: *`, `Allow: /, /llms.txt`, `Disallow: /admin/ /api/ /operator/ /family/ /dashboard/ /auth/ /login /signup /design-preview`, plus a `Sitemap:` line. **No bot-specific rules**, so OAI-SearchBot, GPTBot, PerplexityBot, ClaudeBot and Bingbot are all allowed on public pages. **[verify live]** that the served file matches (no CDN override). |
| `/llms.txt` | Route `src/app/llms.txt/route.ts`, content `src/lib/seo/llms-txt.ts`. Lists directory pages, suburbs, care types, the home care guide (#44), concierge, search, and a paragraph describing listing JSON-LD. **Doesn't list individual listings.** |
| Sitemap | `src/app/sitemap.ts`: 12 static URLs plus suburbs and guides. **No `/homes/<id>`.** `lastModified = new Date()` for all (build time, not real). |
| Middleware | `src/middleware.ts`: robots, sitemap and llms.txt bypass auth. **No user-agent checks anywhere in `src/`.** |
| Rate limits | Edge limiter only on `/api/webhooks` (60/min) and `/api/password` (8/min) (`src/lib/edge-rate-limit.ts`). Pages aren't rate-limited by the app. **[verify live]** Render or any CDN layer has no bot-fight or WAF rules. |
| Sentry | `tracesSampler` drops scanner and bot noise from *tracing* only. It doesn't block. |
| `/api/` disallowed | Fine today. A future public read-only API would need its own path (e.g. `/data/…`) or an explicit `Allow`. |
| **IndexNow** | **Not set up.** No reference anywhere in `src/`, `scripts/`, `.github/` or `public/`. |

**A minimal IndexNow ping on publish** (about 3–4 h, S):

- **Key:** an `INDEXNOW_KEY` env var, plus a static `public/<key>.txt` containing the key. **The middleware must let it through.** Today only `robots.txt` and `llms.txt` are exempted by name; any other root `.txt` falls to the unknown-path rule and returns 404. Add the key file path to the matcher exclusion and `PUBLIC_PATHS` in `src/middleware.ts`, or serve the key from a route handler.
- **Helper:** `pingIndexNow(urls: string[])` posts `{host, key, keyLocation, urlList}` to `https://api.indexnow.org/indexnow`. It's fire-and-forget, never throws, does nothing when the env var is unset, and batches or debounces (one call per minute is plenty).
- **Callers:**
  - after `updateAvailability`, `setHomePricing`, a waiver change or a claim approval, for that listing's URL;
  - after a home becomes ACTIVE or is unpublished;
  - the post-deploy revalidate workflow, for directory pages.
- **Cost:** none; IndexNow is free.

---

## 4. Data service

**There's no single internal query path today.** "Facilities by area, care level and payer" is answered in at least five places, each with its own filters:

| Path | Filters | Notes |
|---|---|---|
| `src/lib/directory/public-listings.ts` (`publicListingsWhere`, `fetchPublicListings`, `toPublicListing`) | cities, careLevel, waiver (`ACCEPTING_NEW` only) | ✔ ACTIVE + `isDemo:false`; ✔ returns the honest `PublicListing` view (availability, pricing, waiver, ODH, inspections, phone only when claimed). **No ZIP or radius, no payer beyond waiver.** Used by directory pages and the listing JSON-LD. |
| `/api/search` (986 lines) | free text, location or ZIP and geo, care level, budget, waiver | Its own Prisma query. Leaks the operator email and the `availability` capacity math (P1, P2). |
| `/api/homes/search` (571 lines) | ZIP / radius, care level | Its own query. |
| `/api/discharge-planner/search`, `/api/care-concierge`, `src/lib/matching/*` | matching and scoring | Internal (signed-in or admin). |

**Where it would live:** extend `src/lib/directory/public-listings.ts`, the only path that already enforces the public-safe view, into a facility data service. Something like `src/lib/directory/facility-service.ts` that re-exports the view. Then point `/search`, the directory pages, the listing pages and any future read-only API or MCP at it, and retire the ad-hoc selects in `/api/search` and `/api/homes/search`.

### Proposed read-only operations (spec only)

Shared rules for all three:
- ACTIVE and `isDemo:false` only.
- No operator email, no family data, no free text from responses.
- Every fact carries `{ value, status, source, method, observedAt, confirmedAt, expiresAt }`. `status` is one of `confirmed | stale | unconfirmed | estimate | not_offered | unknown`.

**`search_facilities(params)`**
- **In:** `zip?`, `city?`, `radiusMiles?` (default 15, max 50), `careLevel?`, `payer?` (`private | medicaid_waiver | medicaid_pending | va | ltc_insurance`), `verifiedOnly?` (availability confirmed and not expired), `maxPrice?`, `limit?` (≤ 25), `cursor?`.
- **Out, per item:**
  - identity: `id`, `name`, `canonicalUrl` (`https://getcarelinkai.com/homes/<id>`), `odhLicense`, `city`, `zip`, `distanceMiles`, `careLevels[]`;
  - facts: `availability` (fact object incl. `scope: AL | MC | total`), `startingPrice` (fact object incl. `priceStatus`), `medicaidWaiver` (fact object), `medicaidPendingAccepted` (fact object);
  - other: `claimed`, `lastInspectionDate`, `citationsLatest`.
- **Plus:** `total`, `nextCursor`, `generatedAt`, `dataNote` ("Facts are labeled confirmed only with a date; confirm with the home").

**`get_facility(id | odhLicense)`**
- Everything in a search item, plus:
  - `address`, `geo`, `phone` (claimed only), `website`;
  - `inspections[]` (date, type, citationCount, sourceUrl);
  - `factHistory` (last 5 `FactObservation` per fact: `result`, `value`, `observedAt`, `method`, `sourceType`);
  - `dateModified`.
- **Never:** operator email, decline text, inquiries, concierge data.

**`availability_summary(params)`**
- **In:** `zip | city`, `radiusMiles?`, `careLevel?`.
- **Out:**
  - counts: `facilitiesTotal`, `withConfirmedOpenings` (fresh, > 0), `confirmedFull` (fresh, = 0), `unconfirmed`, `noResponseLast30d`;
  - `medianConfirmedAgeDays`, `waiverAccepting`;
  - `asOf`, `windowDays` (10).
- Aggregates only, no per-home rows. This is the honest "how much do we actually know here" answer for an agent.

---

## 5. Privacy

| Surface | PHI / family data / decline reasons / operator emails can reach it? | Evidence |
|---|---|---|
| JSON-LD (listing, directory, org) | **No.** Built only from the `PublicListing` view, which documents "no family data, no operator contact email (phone only once claimed)". The org JSON-LD carries the **company's** own phone and email. | `src/lib/directory/public-listings.ts:10`, `jsonld.ts` |
| `/llms.txt` | **No.** Static text plus `SITE_URL` links; no DB rows. | `src/lib/seo/llms-txt.ts` |
| Analytics | **No.** Allowlisted typed props only (booleans, enums, opaque listing ids, count buckets). Paths are sanitized. Consent-gated. 90-day purge. | `src/lib/analytics/events.ts:72-106`, `sanitize.ts`, `retention.ts` |
| `/api/marketplace/caregivers` | Fixed in #46: sign-in required, and seed and test profiles filtered. | `route.ts:52-54`, `src/lib/marketplace/*` |
| **`/api/search`** | **Operator login email on every result, signed out** (P1). Unclaimed results carry the sentinel `directory-unclaimed@carelinkai.system`. | `src/app/api/search/route.ts:856-859` |
| **`/api/homes/[id]`** | **Claimed operator's name and login email, signed out** (P1). | `src/app/api/homes/[id]/route.ts:339-345` |

**Accept/decline reasons:**
- **Storage:** `FacilityResponse` (`schema.prisma`) holds `declineReason` (enum `FacilityDeclineReason`: NO_BED, ACUITY_*, PAYER_NOT_ACCEPTED, …) and **`declineText` (free text, ≤ 500 chars, no PHI screen)** (`src/lib/concierge/facility-response-engine.ts:268`).
- **Free-text risk:** a facility *can* type patient details there. For example, "she needs two-person assist and is on insulin" is plausible, because they're replying about a specific referral.
- **Who sees it:** `declineText` is shown only to the admin (`/admin/concierge/[id]`) and to that case's discharge planner (`/discharge-planner/concierge`). It isn't public.
- **Roll-up:** the per-home `observedAcceptanceCriteria` aggregates **the reason enum only**. The code comment says "the free text is NOT recorded" in the roll-up or the event.
- **Recommendation:** run `declineText` through the same PHI guard as `InboundLead.reason` (redact + flag), or drop the field. Never include it in any future API.

---

## 6. AI visibility benchmark

### 20 prompts

Run each on ChatGPT (search on), Perplexity, Google AI Overviews / Gemini, Claude (web) and Copilot / Bing. Use a fresh session, logged out where possible.

**Location (4)**
1. What are the best assisted living facilities in Cleveland, Ohio?
2. Assisted living near Lakewood, Ohio with open rooms right now
3. Which senior living communities in Parma, OH should I tour?
4. Compare assisted living options in Westlake vs Strongsville, Ohio

**Medicaid (4)**
5. Which assisted living facilities in Cleveland accept the Ohio Medicaid Assisted Living Waiver?
6. Can my mom use Medicaid for assisted living in Cuyahoga County, and which homes take it?
7. Assisted living in Cleveland that accepts residents while a Medicaid application is pending
8. Does the PASSPORT waiver pay for assisted living in Ohio?

**Cost (4)**
9. How much does assisted living cost per month in Cleveland, Ohio in 2026?
10. Cheapest assisted living in Greater Cleveland with a starting price listed
11. Assisted living in Cleveland under $5,000 a month
12. What does memory care cost in Cleveland compared with assisted living?

**Memory care (4)**
13. Best memory care facilities in Cleveland, Ohio for dementia
14. Memory care near Beachwood, Ohio with secured garden
15. How do I check a Cleveland memory care facility's state inspection record?
16. Memory care in Cuyahoga County that accepts Medicaid

**Availability (4)**
17. Which assisted living facilities in Cleveland have an opening this week?
18. Where can I find verified bed availability for assisted living in Cleveland?
19. Hospital discharge to assisted living in Cleveland within 3 days. Who has beds?
20. Is there a website that shows when Cleveland assisted living openings were last confirmed?

### Results sheet format

One row per prompt × platform × run (monthly cadence):

| Column | Values |
|---|---|
| `run_date` | YYYY-MM-DD |
| `platform` | ChatGPT / Perplexity / Gemini-AIO / Claude / Copilot |
| `prompt_id` | 1–20 |
| `cited` | Y / N (getcarelinkai.com linked or named) |
| `cited_url` | exact URL cited, if any |
| `position` | rank among cited sources (1 = first), blank if not cited |
| `accuracy` | correct / partly / wrong / n-a (facts about our listings: price, waiver, availability, inspections) |
| `stale_or_false_claim` | free text: what was wrong (e.g. "said Home X has openings, our data says unconfirmed") |
| `competitors_cited` | e.g. A Place for Mom, Caring.com, SeniorAdvisor, ODH |
| `context` | how we appeared: "listing page", "directory page", "llms.txt", "not mentioned" |
| `notes` | screenshots link, session mode |

Headline metrics:
- citation rate per platform;
- share of answers with a wrong fact about a listed home;
- whether answers carry our "confirmed on <date>" framing.

---

## Work items, smallest first

| # | Item | Effort | Why |
|---|---|---|---|
| 1 | **Remove the operator email from `/api/search` and `/api/homes/[id]` public responses** (keep the name only when claimed, or drop both) | XS · ~1 h | P1 privacy |
| 2 | Rename or remove `availability` (capacity math) from the `/api/search` response | XS · ~30 min | P2; agents misread it |
| 3 | Waiver public view uses the real `medicaidWaiverSource` and `medicaidWaiverVerifiedAt` (page + JSON-LD) | S · ~2 h | P3 misattribution |
| 4 | Log admin price edits (`setHomePricing`) and the full operator price fields to `EntityEvent` | S · ~1 h | H1 interim |
| 5 | JSON-LD additions: `dateModified`, price source/status/confirmedAt, waiver source/date, availability expiry; directory `priceRange` only when confirmed or labeled; "Claimed by the operator" wording | S · ~3 h | S1 |
| 6 | Sitemap: add `/homes/<id>` (ACTIVE, non-demo) with real `lastModified`; optional listing index in llms.txt | S · ~2 h | C1 |
| 7 | PHI guard on `FacilityResponse.declineText` (redact + flag, like `InboundLead.reason`) | S · ~2 h | Privacy hardening |
| 8 | IndexNow ping on publish (key file, helper, callers) | S · ~3–4 h | Faster recrawl after confirmations |
| 9 | **`FactObservation` migration + `recordFact()` + backfill script (dry run first)** | M · ~1.5–2 days | Gaps 1–8 in item 1 |
| 10 | Facility data service (`facility-service.ts`); move `/search` and `/api/homes/search` onto it; spec the 3 read-only operations as types | M–L · ~3–5 days | One truthful path for the site + a future API/MCP |
| 11 | Benchmark: first run of 20 prompts × 5 platforms, then monthly | Chris · ~2 h/run | Baseline before items 5, 6 and 8 land |

**Suggested order:** 1–3 this week, since they're truth and privacy items that cost minutes. Then 4–8 as one "SEO/data hygiene" PR. Then 9, then 10. Take a benchmark baseline **before** 5, 6 and 8 ship so their effect is measurable.
