/**
 * seed-cleveland-metro.ts  (OL-083 PART B)
 *
 * Seeds the Greater-Cleveland 6-county RCF/AL master list (compiled by Cowork,
 * 2026-06-22 — see context/METRO_RCF_MASTER_LIST.md) as DRAFT listings under the
 * same placeholder "CareLinkAI Directory - Unclaimed Listings" operator used by
 * seed-cleveland-directory.ts and seed-cleveland-batch2.ts.
 *
 * Counties: Cuyahoga, Summit, Lorain, Lake, Geauga, Medina. 169 source rows.
 *
 * DEDUPE: This list overlaps the ~65 already-seeded facilities (Tier-A + batch-2).
 * The script dedupes against ALL existing homes (any operator) by a normalized
 * facility name, plus a small curated alias set for known rebrands the normalizer
 * can't catch (e.g. Anthology→Ashton, Bickford/Sunrise→Bloom). Anything matching is
 * SKIPPED; only genuinely-new facilities are created. Re-running is idempotent.
 *
 * SNF-PRIMARY GATING: Rows the source flagged *(SNF-primary)* are nursing-home-
 * primary per their ODH 365xxx/366xxx license; CareLinkAI excludes skilled-nursing-
 * ONLY facilities. These are NOT seeded by default — they are reported as held and
 * require ODH verification first. Pass --include-unverified to seed them anyway.
 *
 * Listings are DRAFT (NOT publicly visible). careLevel is a starting hint from the
 * source; the enrich pipeline (autopopulate-cohort.ts) refines it and fills address.
 * capacity is seeded 0 ("unknown — verify") — these have no authoritative public bed
 * count. Do not treat capacity 0 as real.
 *
 * Flow: seed (this) → enrich (autopopulate-cohort.ts) → publish (publish-directory-homes.ts).
 *
 * Usage:
 *   npx tsx scripts/seed-cleveland-metro.ts --dry-run                  # preview (recommended first)
 *   npx tsx scripts/seed-cleveland-metro.ts                            # write new DRAFT rows
 *   npx tsx scripts/seed-cleveland-metro.ts --include-unverified       # also seed SNF-primary rows
 *   npx tsx scripts/seed-cleveland-metro.ts --with-websites            # also auto-discover website URLs
 *   (--with-websites requires GOOGLE_PLACES_API_KEY)
 *
 * Risk register: Risk 2 (two-sided marketplace cold start — supply density).
 */

import { PrismaClient, CareLevel, HomeStatus, UserRole } from '@prisma/client';
import { findWebsiteUrl, isAnyLookupConfigured } from '../src/lib/place-lookup';

const prisma = new PrismaClient();

const PLACES_DELAY_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEED_USER_EMAIL = 'directory-unclaimed@carelinkai.system';
const SEED_OPERATOR_NAME = 'CareLinkAI Directory - Unclaimed Listings';

interface MetroFacility {
  name: string;
  city: string;
  county: string;
  careLevel: CareLevel[];
  /** ODH license number as published by the source directory (may be stale). */
  lic?: string;
  /** Source flagged this as nursing-home-primary — gated out unless --include-unverified. */
  snfPrimary?: boolean;
  /** Source flagged this row to verify (county border, SNF edge). Informational. */
  verify?: boolean;
  /** Terse provenance note (alternate name, sub-area). */
  note?: string;
}

const METRO: MetroFacility[] = [
  // --- CUYAHOGA COUNTY ---
  { name: 'A.M. McGregor Home', city: 'East Cleveland', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0592R' },
  { name: 'Algart Health Care', city: 'Cleveland', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Altercare at Saint Joseph Center', city: 'Cleveland', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '1303R' },
  { name: 'Anthology of Mayfield Heights', city: 'Mayfield Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Arden Courts of Parma', city: 'Parma', county: 'Cuyahoga', careLevel: [CareLevel.MEMORY_CARE], lic: '2234R', note: 'Parma / North Royalton' },
  { name: 'Arden Courts of Westlake', city: 'Westlake', county: 'Cuyahoga', careLevel: [CareLevel.MEMORY_CARE], lic: '2117R' },
  { name: 'Aristocrat Berea', city: 'Berea', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },
  { name: 'Ashton at Mayfield Heights', city: 'Mayfield Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Athenian Assisted Living', city: 'North Royalton', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Belvedere of Westlake', city: 'Westlake', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED], lic: '2318R' },
  { name: 'Berea Lake Towers Retirement Community', city: 'Berea', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.INDEPENDENT] },
  { name: 'Broadway Care Center of Maple Heights', city: 'Maple Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365701', snfPrimary: true, verify: true },
  { name: 'Brookdale Gardens at Westlake', city: 'Westlake', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED] },
  { name: 'Brookdale Middleburg Heights', city: 'Middleburg Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2220R' },
  { name: 'Brookdale Richmond Heights', city: 'Richmond Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2274R' },
  { name: 'Brookdale Westlake Village', city: 'Westlake', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.INDEPENDENT] },
  { name: 'Candlewood Park Healthcare Center', city: 'East Cleveland', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },
  { name: 'Cedarwood Plaza', city: 'Cleveland Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Century Oak Care Center', city: 'Middleburg Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365702', snfPrimary: true, verify: true },
  { name: 'Concord Reserve (Paragon Building)', city: 'Westlake', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT] },
  { name: 'Danbury Senior Living Broadview Heights', city: 'Broadview Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Devon Oaks', city: 'Westlake', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED], lic: '2315R' },
  { name: 'East Park Memory Care Facility', city: 'Brook Park', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'East Park Retirement Community', city: 'Brook Park', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Eliza Jennings', city: 'Cleveland', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.SKILLED_NURSING], note: 'aka Eliza Jennings Home / campus; Lakewood area' },
  { name: 'Emerald Village Senior Living', city: 'North Olmsted', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2481R' },
  { name: 'Generations Senior Living of Strongsville', city: 'Strongsville', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Governor\'s Village', city: 'Mayfield Village', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'HarborChase of Shaker Heights', city: 'Shaker Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Harbor Court Retirement Community', city: 'Rocky River', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Haven at Lakewood', city: 'Lakewood', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED] },
  { name: 'Heights Care and Rehabilitation Center', city: 'Broadview Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365661', snfPrimary: true, verify: true },
  { name: 'Judson Manor', city: 'Cleveland', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.INDEPENDENT] },
  { name: 'Judson Park', city: 'Cleveland Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT] },
  { name: 'Kemper House Highland Heights', city: 'Highland Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Kemper House Strongsville', city: 'Strongsville', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Kindred Living at The Fountains', city: 'Lyndhurst', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2089R' },
  { name: 'Lakewood Health Care Center', city: 'Lakewood', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0506R' },
  { name: 'Landerbrook Transitional Care', city: 'Mayfield Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Legacy Place - Parma', city: 'Parma', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Light of Hearts Villa', city: 'Bedford', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Marymount Place', city: 'Garfield Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2207R' },
  { name: 'Menorah Park Center for Senior Living', city: 'Beachwood', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.SKILLED_NURSING] },
  { name: 'O\'Neill Healthcare Bay Village', city: 'Bay Village', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0448R' },
  { name: 'O\'Neill Healthcare Fairview Park', city: 'Fairview Park', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'O\'Neill Healthcare Lakewood', city: 'Lakewood', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT, CareLevel.SKILLED_NURSING], lic: '365267' },
  { name: 'O\'Neill Healthcare North Olmsted', city: 'North Olmsted', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED], lic: '2329R' },
  { name: 'Oaks of Brecksville', city: 'Brecksville', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Park Creek Center', city: 'Parma Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Park East', city: 'Beachwood', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365810', note: 'Wiggins / Montefiore campus' },
  { name: 'Parkside Villa', city: 'Middleburg Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2347R' },
  { name: 'Pleasant Lake Villa', city: 'Parma', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '1872R' },
  { name: 'Rose Senior Living Beachwood', city: 'Beachwood', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT] },
  { name: 'Singleton Health Care Center', city: 'Cleveland', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Solon Pointe at Emerald Ridge', city: 'Solon', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2219R' },
  { name: 'St. Augustine Towers', city: 'Cleveland', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Sunrise at Shaker Heights', city: 'Shaker Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Sunrise of Rocky River', city: 'Rocky River', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2190R', note: 'aka Bickford of Rocky River' },
  { name: 'The Montefiore Home', city: 'Beachwood', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.SKILLED_NURSING] },
  { name: 'The Woodlands of Shaker Heights', city: 'Shaker Heights', county: 'Cuyahoga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },

  // --- SUMMIT COUNTY ---
  { name: 'Arden Courts of Bath', city: 'Akron', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], note: 'Bath area' },
  { name: 'Avenue at Macedonia', city: 'Macedonia', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '366454' },
  { name: 'Briarwood', city: 'Stow', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '1963R' },
  { name: 'Brookdale Barberton', city: 'Barberton', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Brookdale Bath', city: 'Akron', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], note: 'Bath area' },
  { name: 'Brookdale Montrose', city: 'Akron', county: 'Summit', careLevel: [CareLevel.ASSISTED], note: 'Montrose area' },
  { name: 'Brookdale Stow', city: 'Stow', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2502R' },
  { name: 'Cardinal Retirement Village', city: 'Cuyahoga Falls', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Cherry Creek Acres', city: 'Stow', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2520R' },
  { name: 'Concordia at Sumner', city: 'Copley', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT], lic: '2389R' },
  { name: 'Crown Center at Laurel Lake', city: 'Hudson', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT] },
  { name: 'Danbury Woods', city: 'Cuyahoga Falls', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Elmcroft of Sagamore Hills', city: 'Sagamore Hills', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2271R' },
  { name: 'Elms Assisted Living', city: 'Hudson', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Essex Healthcare of Tallmadge', city: 'Tallmadge', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },
  { name: 'Gables of Hudson', city: 'Hudson', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Gardens of Western Reserve at Cuyahoga Falls', city: 'Cuyahoga Falls', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2429R' },
  { name: 'Grande Village Suites', city: 'Twinsburg', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2437R' },
  { name: 'Grande Village Villas', city: 'Twinsburg', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Greenfield Estate Alzheimer\'s Special Care Center', city: 'Akron', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Greenview Senior Assisted Living', city: 'Uniontown', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Heartland of Twinsburg', city: 'Twinsburg', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '366419', snfPrimary: true, verify: true },
  { name: 'Heather Knoll Retirement Village', city: 'Tallmadge', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Heritage of Hudson', city: 'Hudson', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Legacy Place - Twinsburg', city: 'Twinsburg', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2240R' },
  { name: 'Maplewood at Cuyahoga Falls', city: 'Cuyahoga Falls', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Maplewood at Twinsburg', city: 'Twinsburg', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Merriman', city: 'Akron', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0523R' },
  { name: 'Mulberry Gardens', city: 'Munroe Falls', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2405R' },
  { name: 'National Church Residences Portage Trail Village', city: 'Cuyahoga Falls', county: 'Summit', careLevel: [CareLevel.ASSISTED], lic: '2588R' },
  { name: 'Pleasant Pointe Assisted Living', city: 'Barberton', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2249R' },
  { name: 'Regina Health Center', city: 'Richfield', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.SKILLED_NURSING], lic: '2001R' },
  { name: 'Renaissance Assisted Living', city: 'Richfield', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Rockynol Retirement Community', city: 'Akron', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT], note: 'Ohio Living' },
  { name: 'St. Luke Lutheran Community - Portage Lakes', city: 'Akron', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0670R' },
  { name: 'Stow Glen Assisted Living', city: 'Stow', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '1797R' },
  { name: 'Summit Point', city: 'Macedonia', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Sunrise Assisted Living of Cuyahoga Falls', city: 'Cuyahoga Falls', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2294R' },
  { name: 'Tallmadge Senior Living', city: 'Tallmadge', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'The Pinnacle Rehabilitation and Nursing Center', city: 'Tallmadge', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '366010', snfPrimary: true, verify: true },
  { name: 'Village at St. Edward', city: 'Fairlawn', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT] },
  { name: 'Vista Springs Macedonia', city: 'Macedonia', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2707R' },
  { name: 'Vitalia Montrose', city: 'Akron', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT], note: 'aka The V Living; Montrose area' },
  { name: 'Vitalia Stow', city: 'Stow', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT] },
  { name: 'Pleasant View Health Care Center', city: 'Barberton', county: 'Summit', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },

  // --- LORAIN COUNTY ---
  { name: 'Abbewood Assisted Living', city: 'Elyria', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Amherst Manor Assisted Living', city: 'Amherst', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0416R' },
  { name: 'Anchor Lodge Limited', city: 'Lorain', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Avenue Assisted Living', city: 'Avon Lake', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2462R', note: 'Avon Lake' },
  { name: 'Avon Place', city: 'Avon', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365155', snfPrimary: true, verify: true },
  { name: 'Danbury North Ridgeville', city: 'North Ridgeville', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Elmcroft of Lorain', city: 'Lorain', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2301R' },
  { name: 'Elms Retirement Village', city: 'Wellington', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '1194R' },
  { name: 'Gardens of French Creek at Avon Oaks', city: 'Avon', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Independence Village of Avon Lake', city: 'Avon Lake', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Kendal at Oberlin', city: 'Oberlin', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT, CareLevel.SKILLED_NURSING] },
  { name: 'Main Street Care Center', city: 'Avon Lake', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365865', snfPrimary: true, verify: true },
  { name: 'O\'Neill Healthcare North Ridgeville', city: 'North Ridgeville', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  // NOTE: source row #120 "O'Neill Healthcare Assisted Living (N. Ridgeville)" is the
  // same physical campus as the row above and is intentionally collapsed into it
  // (the name-normalizer can't equate them). This is why this list has 168 rows, not 169.
  { name: 'St. Mary of the Woods', city: 'Avon', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2439R' },
  { name: 'Wesleyan Village', city: 'Elyria', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT], lic: '0477R', note: 'Ohio Living' },
  { name: 'Lake Pointe Health Care', city: 'Lorain', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },
  { name: 'Northridge Health Center', city: 'North Ridgeville', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365645', snfPrimary: true, verify: true },
  { name: 'Oak Hills Nursing Center', city: 'Lorain', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },
  { name: 'Autumn Aegis', city: 'Lorain', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365940', snfPrimary: true, verify: true },
  { name: 'Wellington Place / Welcome Nursing Home', city: 'Oberlin', county: 'Lorain', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },

  // --- LAKE COUNTY ---
  { name: 'Brookdale Mentor', city: 'Mentor', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Brookdale Newell Creek', city: 'Mentor', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2652R' },
  { name: 'Brookdale Wickliffe', city: 'Wickliffe', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Brookdale Willoughby', city: 'Willoughby', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Danbury Mentor', city: 'Mentor', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Governor\'s Pointe', city: 'Mentor', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Homestead I', city: 'Painesville', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365492' },
  { name: 'Homestead II', city: 'Painesville', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Ivy House Assisted Living', city: 'Painesville', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0080R' },
  { name: 'Lantern of Madison', city: 'Madison', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Nason Center of Breckenridge Village', city: 'Willoughby', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '1760R' },
  { name: 'Ohio Living Breckenridge Village', city: 'Willoughby', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT], lic: '365581' },
  { name: 'Salida Woods Assisted Living', city: 'Mentor', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Symphony at Mentor', city: 'Mentor', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Van Gorder Manor', city: 'Willoughby', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Wickliffe Country Place', city: 'Wickliffe', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },
  { name: 'Heartland of Willoughby', city: 'Willoughby', county: 'Lake', careLevel: [CareLevel.ASSISTED], lic: '365305', snfPrimary: true, verify: true },
  { name: 'Kindred Transitional Care & Rehab - LakeMed', city: 'Painesville', county: 'Lake', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '365713', snfPrimary: true, verify: true },

  // --- MEDINA COUNTY ---
  { name: 'Altercare of Wadsworth', city: 'Wadsworth', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], snfPrimary: true, verify: true },
  { name: 'Brookdale Medina North', city: 'Medina', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2357R' },
  { name: 'Brookdale Medina South', city: 'Medina', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2319R' },
  { name: 'Danbury Brunswick', city: 'Brunswick', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Elmcroft of Medina', city: 'Medina', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2227R' },
  { name: 'Inn at Coal Ridge', city: 'Wadsworth', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Liberty Residence Holdings', city: 'Wadsworth', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Plum Creek Assisted Living', city: 'Brunswick', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Samaritan Villa', city: 'Medina', county: 'Medina', careLevel: [CareLevel.ASSISTED] },
  { name: 'Sanctuary Wadsworth', city: 'Wadsworth', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'StoryPoint Medina East', city: 'Medina', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.INDEPENDENT] },
  { name: 'StoryPoint Medina West', city: 'Medina', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT] },
  { name: 'Wadsworth Pointe', city: 'Wadsworth', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2059R' },
  { name: 'Western Reserve Masonic Community', city: 'Medina', county: 'Medina', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT], lic: '2188R' },

  // --- GEAUGA COUNTY ---
  { name: 'Arden Courts of Chagrin Falls', city: 'Bainbridge', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2243R' },
  { name: 'Briar Hill Health Care Residence', city: 'Middlefield', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0260R' },
  { name: 'Briarcliff Manor', city: 'Middlefield', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Holly Hill', city: 'Newbury', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'Maplewood at Heather Hill', city: 'Chardon', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2264R' },
  { name: 'Pines at Brooks House', city: 'Hiram', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '2500R' },
  { name: 'Princeton Place', city: 'Huntsburg', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE], lic: '0666R' },
  { name: 'Residence of Chardon', city: 'Chardon', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE] },
  { name: 'South Franklin Circle', city: 'Bainbridge', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT] },
  { name: 'Weils of Bainbridge', city: 'Bainbridge', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.SKILLED_NURSING], note: 'aka The Weils' },
  { name: 'Hamlet at Chagrin Falls', city: 'Chagrin Falls', county: 'Geauga', careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE, CareLevel.INDEPENDENT], verify: true, note: 'Geauga/Cuyahoga border — verify county' },
];

/**
 * Known rebrands / aliases whose normalized name will NOT match the already-seeded
 * home (because the seed was renamed). Force-skip these so we don't create a
 * duplicate of the same physical building. Keys are normalized facility names.
 *   - Anthology of Mayfield Heights → seeded as "The Ashton at Mayfield Heights"
 *     (the metro list also has "Ashton at Mayfield Heights", which dedupes normally).
 *   - Sunrise / Bickford of Rocky River → seeded as "Bloom at Rocky River".
 */
const ALIAS_SKIP = new Set<string>([
  'anthology mayfield heights',
  'sunrise rocky river',
  'bickford rocky river',
]);

const STOPWORDS = new Set(['of', 'at', 'the', 'and', 'a']);

/** Normalize a facility name for dedupe: lowercase, saint→st, drop punctuation and stopwords. */
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .join(' ')
    .trim();
}

function careTypeWords(levels: CareLevel[]): string {
  const map: Record<CareLevel, string> = {
    [CareLevel.INDEPENDENT]: 'independent living',
    [CareLevel.ASSISTED]: 'assisted living',
    [CareLevel.MEMORY_CARE]: 'memory care',
    [CareLevel.SKILLED_NURSING]: 'skilled nursing',
  };
  return levels.map((l) => map[l]).join(', ');
}

function descriptionFor(f: MetroFacility): string {
  return (
    'Senior living community in ' + f.city + ', Ohio (' + f.county + ' County) ' +
    'offering ' + careTypeWords(f.careLevel) + '. Unclaimed directory listing — ' +
    'staged for CareLinkAI Greater-Cleveland metro coverage. Address, pricing, ' +
    'amenities, and current availability are pending the enrich pass and operator ' +
    'claim. The operator can claim this listing to add photos, verified details, ' +
    'pricing, and availability.' +
    (f.lic ? ' (ODH license ' + f.lic + ' — verify against ltc.ohio.gov.)' : '') +
    (f.note ? ' (Note: ' + f.note + ')' : '')
  );
}

/**
 * Ensure a directory home carries at least a partial Address with its known city +
 * state=OH (street/zip left empty). This anchors the later Google Places address
 * backfill (autopopulate-cohort.ts --addresses-only): it makes the Places query
 * municipality-specific and lets the match guard reject cross-state / cross-city
 * results. The publish gate still holds the home until street + zip are filled.
 * Returns true if it created a new partial address.
 */
async function ensurePartialAddress(homeId: string, city: string): Promise<boolean> {
  const existingAddr = await prisma.address.findFirst({ where: { homeId }, select: { id: true } });
  if (existingAddr) return false;
  await prisma.address.create({ data: { homeId, street: '', city, state: 'OH', zipCode: '' } });
  return true;
}

async function discoverAndStoreWebsite(homeId: string, name: string, city: string): Promise<string> {
  const result = await findWebsiteUrl({ name, city, state: 'OH' });
  await sleep(PLACES_DELAY_MS);
  if (!result) return 'no match';
  const via = result.source === 'web_search' ? 'web' : 'places';
  if (result.confidence === 'LOW') return `low-confidence (skipped, ${via}): ${result.url}`;
  await prisma.assistedLivingHome.update({ where: { id: homeId }, data: { websiteUrl: result.url } });
  return `${result.confidence} via ${via}: ${result.url}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const withWebsites = process.argv.includes('--with-websites');
  const includeUnverified = process.argv.includes('--include-unverified');

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE RUN ===');
  if (withWebsites) {
    if (!isAnyLookupConfigured()) {
      console.error('ERROR: --with-websites requires GOOGLE_PLACES_API_KEY (and/or web-search fallback).');
      process.exit(1);
    }
    console.log('=== Website discovery ENABLED ===');
  }
  console.log(`Source rows: ${METRO.length}`);
  console.log(`SNF-primary gating: ${includeUnverified ? 'OFF (--include-unverified — seeding SNF-primary too)' : 'ON (SNF-primary held for ODH verification)'}\n`);

  // Build dedupe index from ALL existing homes (any operator), keyed by normalized name.
  const existing = await prisma.assistedLivingHome.findMany({
    select: { id: true, name: true, operatorId: true, address: { select: { id: true, city: true } } },
  });
  const existingByNorm = new Map<string, { id: string; name: string; operatorId: string; city: string | null; hasAddress: boolean }>();
  for (const h of existing) {
    existingByNorm.set(normName(h.name), { id: h.id, name: h.name, operatorId: h.operatorId, city: h.address?.city ?? null, hasAddress: !!h.address });
  }
  console.log(`Existing homes in DB: ${existing.length} (deduping against all of them)\n`);

  // Seed user + operator (shared sentinel).
  let seedUser;
  if (dryRun) {
    seedUser = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
    console.log('Seed user: ' + (seedUser ? 'exists (' + seedUser.id + ')' : 'WOULD CREATE'));
  } else {
    seedUser = await prisma.user.upsert({
      where: { email: SEED_USER_EMAIL },
      update: {},
      create: { email: SEED_USER_EMAIL, firstName: 'CareLinkAI', lastName: 'Directory (Unclaimed)', role: UserRole.OPERATOR },
    });
    console.log('Seed user ready: ' + seedUser.id);
  }
  let seedOperator;
  if (dryRun) {
    seedOperator = seedUser ? await prisma.operator.findUnique({ where: { userId: seedUser.id } }) : null;
    console.log('Seed operator: ' + (seedOperator ? 'exists (' + seedOperator.id + ')' : 'WOULD CREATE') + '\n');
  } else {
    if (!seedUser) throw new Error('Seed user was not initialized.');
    seedOperator = await prisma.operator.upsert({
      where: { userId: seedUser.id },
      update: {},
      create: { userId: seedUser.id, companyName: SEED_OPERATOR_NAME },
    });
    console.log('Seed operator ready: ' + seedOperator.id + '\n');
  }

  let created = 0;
  let skippedDup = 0;
  let heldSnf = 0;
  let addressesAdded = 0;
  const createdRows: string[] = [];
  const skippedRows: string[] = [];
  const heldRows: string[] = [];

  for (const f of METRO) {
    const norm = normName(f.name);

    // 1. Dedupe: matches an existing home (by normalized name) or a known rebrand alias.
    const dupHit = existingByNorm.get(norm);
    if (dupHit || ALIAS_SKIP.has(norm)) {
      skippedDup++;
      const why = dupHit ? `matches existing "${dupHit.name}"` : 'known rebrand alias';
      // Idempotently anchor a previously-seeded directory home that still lacks an
      // address (e.g. the metro homes from a prior run), so the Places backfill works.
      let anchorNote = '';
      const canAnchor = dupHit && seedOperator && dupHit.operatorId === seedOperator.id && !dupHit.hasAddress;
      if (canAnchor) {
        if (dryRun) {
          anchorNote = ' [would add city/OH anchor]';
          addressesAdded++;
        } else if (await ensurePartialAddress(dupHit!.id, f.city)) {
          anchorNote = ' [+city/OH anchor]';
          dupHit!.hasAddress = true;
          addressesAdded++;
        }
      }
      skippedRows.push(`  SKIP (dup):  ${f.name} (${f.city}) — ${why}${anchorNote}`);
      continue;
    }

    // 2. SNF-primary gating.
    if (f.snfPrimary && !includeUnverified) {
      heldSnf++;
      heldRows.push(`  HELD (SNF-primary, verify ODH): ${f.name} (${f.city}, ${f.county})${f.lic ? ' lic ' + f.lic : ''}`);
      continue;
    }

    // 3. Create (or preview).
    if (dryRun) {
      createdRows.push(`  WOULD CREATE: ${f.name} (${f.city}, ${f.county}) [${f.careLevel.join(', ')}]${f.snfPrimary ? ' [SNF-primary]' : ''} (+city/OH anchor)`);
      created++;
      addressesAdded++;
      continue;
    }
    if (!seedOperator) throw new Error('Seed operator was not initialized.');
    const home = await prisma.assistedLivingHome.create({
      data: {
        operatorId: seedOperator.id,
        name: f.name,
        description: descriptionFor(f),
        capacity: 0, // unknown at seed time — verify in research/claim
        status: HomeStatus.DRAFT,
        careLevel: f.careLevel,
      },
    });
    let websiteNote = '';
    if (withWebsites) {
      const status = await discoverAndStoreWebsite(home.id, f.name, f.city);
      websiteNote = ' — website ' + status;
    }
    // Anchor the home's city + state=OH so the Places address backfill queries and
    // verifies precisely (no cross-state/city matches).
    if (await ensurePartialAddress(home.id, f.city)) addressesAdded++;
    createdRows.push(`  CREATED: ${f.name} (${f.city}, ${f.county})${websiteNote}`);
    // Register so a later same-norm row in this run also dedupes.
    existingByNorm.set(norm, { id: home.id, name: f.name, operatorId: seedOperator.id, city: f.city, hasAddress: true });
    created++;
  }

  if (createdRows.length) {
    console.log(`── ${dryRun ? 'Would create' : 'Created'} (${created}) ──`);
    createdRows.forEach((r) => console.log(r));
  }
  if (heldRows.length) {
    console.log(`\n── Held — SNF-primary, needs ODH verification (${heldSnf}) ──`);
    console.log('   (re-run with --include-unverified to seed these after verifying)');
    heldRows.forEach((r) => console.log(r));
  }
  if (skippedRows.length) {
    console.log(`\n── Skipped — already seeded / rebrand (${skippedDup}) ──`);
    skippedRows.forEach((r) => console.log(r));
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would create' : 'Created'}: ${created}`);
  console.log(`Held (SNF-primary):          ${heldSnf}`);
  console.log(`Skipped (dup / rebrand):     ${skippedDup}`);
  console.log(`City/OH anchors ${dryRun ? 'to add' : 'added'}:     ${addressesAdded}`);
  console.log(`Source total:                ${METRO.length}`);
  console.log('─────────────────────────────────────────────');

  if (!dryRun && seedOperator) {
    const total = await prisma.assistedLivingHome.count({ where: { operatorId: seedOperator.id } });
    const nonDraft = await prisma.assistedLivingHome.count({ where: { operatorId: seedOperator.id, status: { not: HomeStatus.DRAFT } } });
    console.log(`\nTotal listings under directory operator: ${total}`);
    console.log(`Non-DRAFT (publicly visible) under directory operator: ${nonDraft}`);
  }
  if (dryRun) console.log('\nDRY RUN complete. No changes written. Re-run without --dry-run to seed.');
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
