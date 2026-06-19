# Batch 2 — Seed + Enrich Runbook (Cleveland founder cohort)

Branch: `chore/batch2-enrich` · Created: 2026-06-19
Pairs with vault doc: `ChrisOS/03_Execution/cleveland_outreach/batch2_supply_prep.md`

This runbook stages **batch 2** of the Cleveland operator outreach: seed the
15 web-researched candidate facilities as DRAFT, enrich them via the PR #545
auto-populator, and hand Cowork the locked `{homeId, name, city, status}` set.

> **Where this runs:** the seed + enrich steps write to the **production DB** and
> call **Anthropic + Google Places + Cloudinary** — so they run in the **Render
> shell**, not a code sandbox (which has none of those). The scripts below are on
> this branch; deploy/checkout the branch on Render to run them. Keep everything
> **DRAFT** — do **not** send email or publish listings until research + review.

---

## Cross-check result (steps 1–2)

**Batch-2 candidate pool = 15 web-researched facilities** (from `batch2_supply_prep.md`).
Cross-checked by name + city against the canonical `TIER_A[]` (50 OH-DOH homes in
`scripts/seed-cleveland-directory.ts`):

**All 15 are NEW** — none are in the Tier-A seed list, and none overlap batch 1
(which covered Twinsburg, Euclid, Newbury, Parma, Richfield, Chardon, Hudson,
Olmsted Falls, Willoughby, Lakewood, N. Ridgeville, Copley, Cuyahoga Falls, Bath).
So **step 2 = seed all 15** (done by `scripts/seed-cleveland-batch2.ts`).

| # | Facility | City | County | In Tier-A seed? |
|---|---|---|---|---|
| 1 | Rose Senior Living Beachwood | Beachwood | Cuyahoga | new |
| 2 | Windsor Heights | Beachwood | Cuyahoga | new |
| 3 | Beachwood Commons | Beachwood | Cuyahoga | new |
| 4 | Solon Pointe | Solon | Cuyahoga | new |
| 5 | Vitalia Active Adult - Solon | Solon | Cuyahoga | new (verify AL vs IL-only) |
| 6 | Fairmont of Westlake | Westlake | Cuyahoga | new |
| 7 | Bickford of Rocky River | Rocky River | Cuyahoga | new |
| 8 | Rocky River Village | Rocky River | Cuyahoga | new |
| 9 | Embassy of Rockport | Rocky River | Cuyahoga | new |
| 10 | Vitalia Strongsville | Strongsville | Cuyahoga | new |
| 11 | Anthology of Mayfield Heights | Mayfield Heights | Cuyahoga | new |
| 12 | Villa Serena | Mayfield Heights | Cuyahoga | new |
| 13 | Symphony at Mentor | Mentor | Lake | new |
| 14 | Vista Springs Ravinia Estate | Independence | Cuyahoga | new |
| 15 | Jennings at Brecksville | Brecksville | Cuyahoga | new |

### Step 1 — "seeded Tier-A DRAFT homes NOT in batch 1"

The batch-2 SEND set is the 15 above. Separately, the ~35 already-seeded Tier-A
homes that batch 1 didn't use are still DRAFT in the DB. The authoritative,
DB-backed list of everything not-yet-sent (enriched=no) is:

```bash
npx tsx scripts/report-directory-homes.ts --unenriched
```

(`enriched=no` ⇒ `autoPopulatedAt IS NULL` ⇒ never run through the pipeline ⇒
not part of an already-sent batch. The exact batch-1 15 can't be derived from
the seed list alone because several batch-1 cities — Parma, Chardon, Copley —
map to multiple Tier-A homes; the enrich flag is the reliable signal.)

---

## Render command sequence

All commands assume the `chore/batch2-enrich` branch is checked out on Render
and env vars are set: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`,
`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`.

### 1. Seed the 15 batch-2 homes (DRAFT) + discover websites

```bash
# Preview first (no writes):
npx tsx scripts/seed-cleveland-batch2.ts --dry-run

# Live seed:
npx tsx scripts/seed-cleveland-batch2.ts

# Backfill website URLs via Google Places (idempotent; safe to re-run):
npx tsx scripts/seed-cleveland-batch2.ts --with-websites
```

Idempotent: re-running skips homes already seeded (deduped by name under the
"CareLinkAI Directory - Unclaimed Listings" operator).

### 2. Build the enrich CSV from the seeded rows

`autopopulate-cohort.ts --from-db` only targets homes that are **already**
auto-populated, so the **first** enrich pass on fresh batch-2 homes needs a CSV.
Generate it from the reporter:

```bash
# Dump the directory homes as TSV, keep the 15 batch-2 rows (enriched=no, has a website):
npx tsx scripts/report-directory-homes.ts --tsv > /tmp/dir_homes.tsv

# Reshape to the cohort CSV format: homeName,homeId,websiteUrl
#   (columns from report: homeId<TAB>name<TAB>city<TAB>status<TAB>enriched<TAB>website)
echo "homeName,homeId,websiteUrl" > /tmp/batch2_websites.csv
awk -F'\t' 'NR>1 && $5=="no" && $6!="" {print "\""$2"\","$1","$6}' /tmp/dir_homes.tsv >> /tmp/batch2_websites.csv
cat /tmp/batch2_websites.csv   # eyeball: should be the 15 batch-2 homes
```

> If a batch-2 home has no website after step 1 (Places miss), add its URL to the
> CSV by hand before enriching, or it will be skipped.

### 3. Enrich (AI profile + photos→Cloudinary + Places address)

```bash
# Dry run — shows extracted fields + cost, writes nothing:
npx tsx scripts/autopopulate-cohort.ts /tmp/batch2_websites.csv --dry-run --with-photos

# Live run — writes profile, addresses, and re-hosted photos:
npx tsx scripts/autopopulate-cohort.ts /tmp/batch2_websites.csv --force --with-photos
```

Expected cost ≈ batch 1 (~$0.10/facility text; image classify adds a little).
Subsequent re-runs can use `--from-db --photos-only` / `--addresses-only` once
`autoPopulatedAt` is set.

### 4. Spot-check (before handoff)

- **Capacity is NOT auto-filled.** Batch-2 homes are seeded `capacity: 0`
  ("unknown") and the enrich pipeline does not write capacity — set real bed
  counts from the Cowork research pass or operator claim. Don't trust `0`.
- **Name / city mismatches:** confirm the Places-matched address city equals the
  expected city (table above). Reject wrong-location matches (the pipeline's
  OL-066 guard helps, but eyeball Vitalia ×2 and the chain communities).
- **LOW-confidence extractions:** the cohort run prints a "sparse" list — review
  those listings' descriptions before relying on them.
- Confirm all 15 are still `status=DRAFT` (not accidentally published).

### 5. Step-4 handoff to Cowork

```bash
npx tsx scripts/report-directory-homes.ts --tsv
```

Take the 15 batch-2 rows → `{homeId, name, city, status}` for `batch2_email_research.md`.

> **Phone:** there is no phone column on `AssistedLivingHome` and the enrich
> pipeline does not persist one, so the `{…, phone, …}` field in the handoff is
> supplied by Cowork's contact-research pass (it's already part of step 3 in the
> supply-prep doc). If we want phone stored on the listing, that's a small
> schema + pipeline change — flagged as a follow-up, out of scope for batch 2.

---

## Guardrails

- Everything stays **DRAFT** until research + review. No emails, no public listings.
- Claim links (45-day) + Resend "Batch 2" audience are generated **after** the set
  is locked and reviewed — not in this runbook.
- Scripts under `scripts/` are excluded from the app build/tsconfig; they were
  typechecked standalone (strict, clean) on this branch.
