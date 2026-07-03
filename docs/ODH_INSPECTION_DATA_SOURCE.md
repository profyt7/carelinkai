# ODH Inspection Data — Source Research & Ingestion Design (OL-113, Phase 1)

_Researched 2026-07-03. This is the Phase-1 deliverable for the "State Inspection
History" feature: where Ohio residential care facility (RCF) survey/citation data
lives, what we can legally and practically ingest, and how the pipeline is designed
around it._

## TL;DR recommendation

**Ingest from a bulk/normalized file, not live scraping.** The pipeline
(`scripts/ingest-odh-inspections.ts`) consumes a normalized JSON/CSV file
(contract below) that can be produced from any of the sources listed here —
DataOhio download, a public-records data set, or a founder-exported file from the
LTC Quality Navigator. A flag-gated (OFF by default) monthly GHA cron can call the
`/api/cron/odh-inspections` endpoint once a stable machine-readable source URL is
verified. Nothing auto-publishes an uncertain facility match.

## Who produces the data

- **Ohio Department of Health (ODH), Bureau of Survey & Certification** licenses
  Ohio RCFs ("residential care facility" = the license class covering assisted
  living, ~800 licensed statewide) and conducts licensure surveys: standard
  (roughly annual) surveys plus complaint investigations, under ORC Chapter 3721
  and OAC 3701-16. Citations reference the OAC rule violated.
  - Program page: https://odh.ohio.gov/know-our-programs/residential-care-facilities
  - Bureau: https://odh.ohio.gov/about-us/offices-bureaus-and-departments/bsc/bureauofsurveyandcertification
  - Licensure contact: LICCERT@odh.ohio.gov, (614) 752-9524

## Where the data is published (candidates, in preference order)

### 1. Ohio Department of Aging — Long-Term Care Quality Navigator (authoritative public surface)
- URL: https://aging.ohio.gov/navigator (v2.0 launched 2025-02-20; added ~800
  assisted living facilities alongside ~930 nursing homes)
- **Legal mandate:** ORC 173.47 + OAC 173-45-08 require ODA to publish and update
  **weekly** "the data derived from ODH's surveys of nursing facilities and
  residential care facilities," including a link to the most recent ODH licensure
  inspection report for facilities not certified by Medicare/Medicaid (which is
  all RCF-only facilities). So this is the *statutorily designated* public copy of
  ODH RCF survey results.
- Fields per facility: license info, inspection results/citation flags, links to
  inspection report documents, beds, satisfaction survey scores.
- Format: interactive dashboard (built on the InnovateOhio Platform). No
  documented public bulk-download or API found in research; the underlying data
  service needs to be inspected from a browser (network tab) to determine whether
  a JSON endpoint exists — **this must be done from the founder's browser or a
  GHA runner** (see network caveat below).

### 2. DataOhio catalog (bulk download, preferred if the dataset exists)
- URL: https://data.ohio.gov — state open-data catalog, filterable to Department
  of Health / Department of Aging datasets. Licensed-facility directories are
  historically published here in CSV/Excel. Whether survey *citations* (not just
  the facility directory) are catalogued needs on-site verification.

### 3. ODH Licensed Facilities / provider search (directory + license numbers)
- URL: https://odh.ohio.gov/know-our-programs/Licensed-Facilities-Services-Program-Search
  (legacy app: http://publicapps.odh.ohio.gov/eid/default.aspx)
- Gives the authoritative RCF **license numbers** (format `NNNNR`, e.g. `0592R`,
  `2318R` — 4 digits + `R`; our seed data already carries these for ~70 homes)
  and facility identity for matching. Directory only — no citations.

### 4. Public-records request (fallback, $0)
- ODH fulfills public-records requests for survey/citation extracts
  (LICCERT@odh.ohio.gov). A one-time extract in CSV/Excel is a legitimate seed
  for the normalized input file if neither 1 nor 2 yields a machine-readable feed.

## Update frequency

ODA must refresh Navigator survey data **weekly** (OAC 173-45-08). Standard RCF
surveys happen roughly annually per facility, so a **monthly** ingestion refresh
is more than adequate.

## ToS / robots / legal constraints

- All of this is Ohio public-records data, published by mandate for consumer
  comparison — republishing facts with source links is the intended use.
- No scraping of commercial aggregators (APFM/Caring/Seniorly) — not needed and
  explicitly off-limits per OL-111 precedent.
- If dashboard scraping ever becomes necessary, respect robots.txt via the
  existing `operator-profile-scraper.ts` conventions; but the preference order
  above should make scraping unnecessary.
- **FTC guardrail (CarePatrol consent-order lesson):** we present dates, counts,
  rule citations, and links to the state source. NO letter grades, NO
  "verified/approved" language, NO interpretation we can't substantiate. Empty
  state is honest ("no records found in the data we have as of <date>"), never
  "this facility has a clean record."

## Network caveat (why endpoint verification is a founder/GHA step)

Verified 2026-07-03 from the Claude Code remote environment: `*.ohio.gov` is
unreachable from the agent container (proxy CONNECT denied by network policy) and
ohio.gov's WAF also 403s Anthropic's fetcher. The same WAF class blocked
datacenter IPs during batch-2 enrichment (OL-081), so **Render/GHA egress may
also be blocked** — attempt-and-report, don't assume. Consequences baked into the
design:

1. `scripts/ingest-odh-inspections.ts` is **file-first**: `--input <file>` takes
   a normalized JSON/CSV the founder downloads manually (or a records-request
   extract). This path always works.
2. Automated fetch (`ODH_INSPECTIONS_SOURCE_URL` env) is optional and fails
   gracefully with a BLOCKED-style report, mirroring the scraper's 403 handling.
3. The monthly GHA workflow ships **schedule commented out** (claim-drip lesson,
   OL-109) until a fetchable source URL is verified end-to-end.

## Normalized input contract

The ingestion script and cron endpoint both consume this shape (JSON array, or
CSV with the same column names):

```jsonc
[
  {
    "licenseNumber": "2318R",          // ODH RCF license — best matching key
    "facilityName": "Example Assisted Living",
    "city": "Cleveland",               // used for fallback matching
    "county": "Cuyahoga",              // optional
    "surveyDate": "2026-03-14",        // ISO date, required
    "surveyType": "Standard",          // Standard | Complaint | Follow-up | ...
    "citationCount": 2,                // optional if citations[] itemized
    "citations": [                     // optional detail
      {
        "rule": "OAC 3701-16-09",      // rule cited
        "scopeSeverity": null,          // if the source provides it
        "summary": "Plain-language description from the survey report"
      }
    ],
    "sourceUrl": "https://aging.ohio.gov/navigator/..."  // link families can verify
  }
]
```

## Matching policy (false-positive prevention)

1. **License number** match (normalized: uppercase, strip non-alphanumerics,
   strip leading zeros) → auto-attach.
2. Fallback: **normalized facility name + same city**, and only when exactly ONE
   candidate matches → auto-attach, and backfill `odhLicenseNumber` onto the home
   so future runs match by license.
3. Anything else (multiple candidates, name-only, city mismatch, fuzzy) →
   **manual-review report row. Never written.**
4. Demo/test listings (pre-publish sweep name/description signature +
   `@carelinkai.test` / `@test.carelinkai.com` operators) are excluded from
   candidate homes entirely.

## Founder verification checklist (to close Phase 1 fully)

- [ ] Open https://aging.ohio.gov/navigator in a browser; find an RCF profile's
      inspection section; note the report link format and check DevTools for a
      JSON data endpoint.
- [ ] Search https://data.ohio.gov for "residential care" / "long-term care"
      datasets; if a survey/citation CSV exists, note its URL + refresh cadence.
- [ ] If neither is machine-readable, email LICCERT@odh.ohio.gov a records
      request for an RCF survey/citation extract (CSV).
- [ ] Produce the first normalized file and run
      `npx tsx scripts/ingest-odh-inspections.ts --input <file>` (dry-run), then
      `--force` on Render.
