# Greater-Cleveland Metro — Assisted Living / Residential Care Facility (RCF) Master List

**Purpose:** Supply-side directory seed list for CareLinkAI. This is the comprehensive
list of licensed assisted-living / Residential Care Facilities (RCFs) across the 6
greater-Cleveland counties, intended for a developer to dedupe and seed into the
facilities database.

**Counties covered:** Cuyahoga, Summit, Lake, Geauga, Medina, Lorain (Ohio).

**Compiled:** 2026-06-22

---

## Method & Sources

- **Primary backbone:** `continuingcarecommunities.org` county pages (an A-Place-for-Mom
  partner directory). Critically, this source republishes **Ohio Department of Health (ODH)
  license numbers** for most entries. License numbers ending in **`R`** (e.g. `2318R`) are
  ODH **Residential Care Facility (RCF)** licenses — the canonical "this is a licensed
  assisted-living facility" signal. License numbers in the **`365xxx`/`366xxx`** range are
  **nursing-home (SNF)** licenses; facilities carrying only a 365/366 number are
  nursing-primary and many also operate an attached AL/RCF wing.
- **Cross-reference / coverage fill:** WebSearch + facility/operator sites for SeniorLiving.org,
  Caring.com, A Place for Mom, Seniorly, AssistedLiving.org, and operator chains
  (Vitalia, StoryPoint/Danbury, Brookdale, Sunrise, Arden Courts, Anthology, HarborChase,
  Vista Springs, Ohio Living, Judson, Eliza Jennings, O'Neill Healthcare).

### Care-type key
- **AL** = Assisted Living / Residential Care Facility
- **MC** = Memory Care (dementia/Alzheimer's) — noted where the facility advertises a dedicated unit
- **IL** = Independent Living also on campus
- **SNF** = Skilled Nursing also on campus (mixed-care campus)
- *(SNF-primary)* = nursing-home-primary per ODH license; AL/RCF presence is secondary or
  attached. Included because they were listed in the AL directory and most carry an
  RCF-eligible AL wing, **but the developer should verify these before seeding** — a few may
  be SNF-only and should be dropped.

### Coverage caveats (READ BEFORE SEEDING)
1. **This list is intentionally over-inclusive on the SNF-mixed edge.** The backbone
   directory blends true RCF/AL communities with some nursing-home-primary campuses. Entries
   I judged nursing-primary are tagged *(SNF-primary)*. The CareLinkAI exclusion rule
   (skilled-nursing-ONLY) means a handful of these should be dropped on verification.
2. **Pure independent-living / 55+ apartments (HUD 202 etc.) were excluded** — e.g. National
   Church Residences IL-only properties are not listed unless they also carry AL/RCF.
3. **License numbers shown are as published by the directory and may be stale.** Treat the
   ODH Long-Term Care Consumer Guide (`ltcohio.org` / `ltc.ohio.gov`) as the authority for
   current licensure before any outreach commitment.
4. **Geauga and (to a lesser degree) Medina/Lake are genuinely smaller markets** — the lower
   counts there reflect real supply, not thin research. I did not pad them.
5. **Dedupe note:** This list has NOT been deduped against the ~65 already-seeded facilities
   (Tier-A 50 + batch-2 15). The developer should dedupe against the existing seed before
   inserting the gap. Watch for chain naming variants (e.g. "Arden Courts of X" vs "Arden
   Courts A ProMedica Memory Care Community of X"; "Danbury X" vs "StoryPoint X").

### Counts
| County | Facilities listed (rows) |
|--------|------------------:|
| Cuyahoga | 60 |
| Summit | 45 |
| Lorain | 21 |
| Lake | 18 |
| Medina | 14 |
| Geauga | 11 |
| **TOTAL** | **169** |

*(Row numbering runs 1–170 continuously because Summit's placeholder row was removed, leaving
169 actual facility rows. A handful of rows are tagged *(SNF-primary)* or *(verify)* and may be
dropped on verification, so the seed-eligible net will likely land ~140–155.)*

---

## CUYAHOGA COUNTY

| # | Facility Name | City | County | Care types | Source |
|---|---------------|------|--------|-----------|--------|
| 1 | A.M. McGregor Home | East Cleveland | Cuyahoga | AL, MC (lic 0592R) | continuingcarecommunities.org |
| 2 | Algart Health Care | Cleveland | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 3 | Altercare at Saint Joseph Center | Cleveland | Cuyahoga | AL, MC (lic 1303R) | continuingcarecommunities.org |
| 4 | Anthology of Mayfield Heights | Mayfield Heights | Cuyahoga | AL, MC | seniorsbluebook.com / seniorcareauthority.com |
| 5 | Arden Courts of Parma | Parma / North Royalton | Cuyahoga | MC (lic 2234R) | continuingcarecommunities.org / seniorly.com |
| 6 | Arden Courts of Westlake | Westlake | Cuyahoga | MC (lic 2117R) | continuingcarecommunities.org |
| 7 | Aristocrat Berea | Berea | Cuyahoga | AL, MC *(SNF-primary)* | continuingcarecommunities.org |
| 8 | Ashton at Mayfield Heights | Mayfield Heights | Cuyahoga | AL, MC | seniorly.com |
| 9 | Athenian Assisted Living | North Royalton | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 10 | Belvedere of Westlake | Westlake | Cuyahoga | AL (lic 2318R) | seniorlivingnearme.org |
| 11 | Berea Lake Towers Retirement Community | Berea | Cuyahoga | AL, IL | continuingcarecommunities.org |
| 12 | Broadway Care Center of Maple Heights | Maple Heights | Cuyahoga | AL, MC *(SNF-primary, lic 365701)* | continuingcarecommunities.org |
| 13 | Brookdale Gardens at Westlake | Westlake | Cuyahoga | AL | seniorliving.org |
| 14 | Brookdale Middleburg Heights | Middleburg Heights | Cuyahoga | AL, MC (lic 2220R) | continuingcarecommunities.org |
| 15 | Brookdale Richmond Heights | Richmond Heights | Cuyahoga | AL, MC (lic 2274R) | continuingcarecommunities.org |
| 16 | Brookdale Westlake Village | Westlake | Cuyahoga | AL, IL | aplaceformom.com |
| 17 | Candlewood Park Healthcare Center | East Cleveland | Cuyahoga | AL, MC *(SNF-primary)* | continuingcarecommunities.org |
| 18 | Cedarwood Plaza | Cleveland Heights | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 19 | Century Oak Care Center | Middleburg Heights | Cuyahoga | AL, MC *(SNF-primary, lic 365702)* | continuingcarecommunities.org |
| 20 | Concord Reserve (Paragon Building) | Westlake | Cuyahoga | AL, MC, IL | continuingcarecommunities.org |
| 21 | Danbury Senior Living Broadview Heights | Broadview Heights | Cuyahoga | AL, MC | continuingcarecommunities.org / storypoint.com |
| 22 | Devon Oaks | Westlake | Cuyahoga | AL (lic 2315R) | continuingcarecommunities.org |
| 23 | East Park Memory Care Facility | Brook Park | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 24 | East Park Retirement Community | Brook Park | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 25 | Eliza Jennings (Eliza Jennings Home / campus) | Cleveland (Lakewood area) | Cuyahoga | AL, MC, SNF | jenningsohio / seniorly.com |
| 26 | Emerald Village Senior Living | North Olmsted | Cuyahoga | AL, MC (lic 2481R) | continuingcarecommunities.org |
| 27 | Generations Senior Living of Strongsville | Strongsville | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 28 | Governor's Village | Mayfield Village | Cuyahoga | AL, MC | seniorly.com |
| 29 | HarborChase of Shaker Heights | Shaker Heights | Cuyahoga | AL, MC | seniorly.com |
| 30 | Harbor Court Retirement Community | Rocky River | Cuyahoga | AL, MC | caring.com |
| 31 | Haven at Lakewood | Lakewood | Cuyahoga | AL | seniorliving.org |
| 32 | Heights Care and Rehabilitation Center | Broadview Heights | Cuyahoga | AL, MC *(SNF-primary, lic 365661)* | continuingcarecommunities.org |
| 33 | Judson Manor | Cleveland | Cuyahoga | AL, IL | caring.com / judsonseniorliving |
| 34 | Judson Park | Cleveland Heights | Cuyahoga | AL, MC, IL | judsonseniorliving |
| 35 | Kemper House Highland Heights | Highland Heights | Cuyahoga | AL, MC | seniorhomes.com |
| 36 | Kemper House Strongsville | Strongsville | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 37 | Kindred Living at The Fountains | Lyndhurst | Cuyahoga | AL, MC (lic 2089R) | continuingcarecommunities.org |
| 38 | Lakewood Health Care Center | Lakewood | Cuyahoga | AL, MC (lic 0506R) | continuingcarecommunities.org |
| 39 | Landerbrook Transitional Care | Mayfield Heights | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 40 | Legacy Place - Parma | Parma | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 41 | Light of Hearts Villa | Bedford | Cuyahoga | AL, MC | assistedlivingmagazine.com / seniorhomes.com |
| 42 | Marymount Place | Garfield Heights | Cuyahoga | AL, MC (lic 2207R) | continuingcarecommunities.org |
| 43 | Menorah Park Center for Senior Living | Beachwood | Cuyahoga | AL, MC, SNF | continuingcarecommunities.org |
| 44 | O'Neill Healthcare Bay Village | Bay Village | Cuyahoga | AL, MC (lic 0448R) | continuingcarecommunities.org |
| 45 | O'Neill Healthcare Fairview Park | Fairview Park | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 46 | O'Neill Healthcare Lakewood | Lakewood | Cuyahoga | AL, MC, IL, SNF (lic 365267) | continuingcarecommunities.org |
| 47 | O'Neill Healthcare North Olmsted | North Olmsted | Cuyahoga | AL (lic 2329R) | seniorlivingnearme.org |
| 48 | Oaks of Brecksville | Brecksville | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 49 | Park Creek Center | Parma Heights | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 50 | Park East (Wiggins / Montefiore campus) | Beachwood | Cuyahoga | AL, MC (lic 365810) | continuingcarecommunities.org |
| 51 | Parkside Villa | Middleburg Heights | Cuyahoga | AL, MC (lic 2347R) | continuingcarecommunities.org |
| 52 | Pleasant Lake Villa | Parma | Cuyahoga | AL, MC (lic 1872R) | continuingcarecommunities.org |
| 53 | Rose Senior Living Beachwood | Beachwood | Cuyahoga | AL, MC, IL | seniorly.com |
| 54 | Singleton Health Care Center | Cleveland | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 55 | Solon Pointe at Emerald Ridge | Solon | Cuyahoga | AL, MC (lic 2219R) | continuingcarecommunities.org |
| 56 | St. Augustine Towers | Cleveland | Cuyahoga | AL, MC | continuingcarecommunities.org |
| 57 | Sunrise at Shaker Heights | Shaker Heights | Cuyahoga | AL, MC | seniorhomes.net |
| 58 | Sunrise of Rocky River (Bickford of Rocky River) | Rocky River | Cuyahoga | AL, MC (lic 2190R) | continuingcarecommunities.org |
| 59 | The Montefiore Home | Beachwood | Cuyahoga | AL, MC, SNF | continuingcarecommunities.org |
| 60 | The Woodlands of Shaker Heights | Shaker Heights | Cuyahoga | AL, MC | seniorly.com |

*Additional Cuyahoga SNF-primary campuses that appeared in the AL directory but should be
verified/likely dropped (skilled-nursing-leaning): Manorcare Mayfield Heights, Southern Hills
Health & Rehab (Middleburg Hts), Seven Hills Health & Rehab, Southwest Commons (Strongsville),
The Pavilion Rehab & Nursing (North Royalton), Willows Health & Rehab (Euclid), Cedarwood,
Vantage Place (Cleveland — AL/MC, keep). Listed here as a verification note, not seeded rows.*

---

## SUMMIT COUNTY

| # | Facility Name | City | County | Care types | Source |
|---|---------------|------|--------|-----------|--------|
| 61 | Arden Courts of Bath | Akron (Bath) | Summit | AL, MC | continuingcarecommunities.org |
| 62 | Avenue at Macedonia | Macedonia | Summit | AL, MC (lic 366454) | continuingcarecommunities.org |
| 63 | Briarwood | Stow | Summit | AL, MC (lic 1963R) | continuingcarecommunities.org |
| 64 | Brookdale Barberton | Barberton | Summit | AL, MC | continuingcarecommunities.org |
| 65 | Brookdale Bath | Akron (Bath) | Summit | AL, MC | continuingcarecommunities.org |
| 66 | Brookdale Montrose | Akron | Summit | AL | continuingcarecommunities.org |
| 67 | Brookdale Stow | Stow | Summit | AL, MC (lic 2502R) | continuingcarecommunities.org |
| 68 | Cardinal Retirement Village | Cuyahoga Falls | Summit | AL, MC | continuingcarecommunities.org |
| 69 | Cherry Creek Acres | Stow | Summit | AL, MC (lic 2520R) | continuingcarecommunities.org |
| 70 | Concordia at Sumner | Copley | Summit | AL, MC, IL (lic 2389R) | continuingcarecommunities.org |
| 71 | Crown Center at Laurel Lake | Hudson | Summit | AL, MC, IL | continuingcarecommunities.org |
| 72 | Danbury Woods | Cuyahoga Falls | Summit | AL, MC | continuingcarecommunities.org |
| 73 | Elmcroft of Sagamore Hills | Sagamore Hills | Summit | AL, MC (lic 2271R) | continuingcarecommunities.org |
| 74 | Elms Assisted Living | Hudson | Summit | AL, MC | continuingcarecommunities.org |
| 75 | Essex Healthcare of Tallmadge | Tallmadge | Summit | AL, MC *(SNF-primary)* | continuingcarecommunities.org |
| 76 | Gables of Hudson | Hudson | Summit | AL, MC | continuingcarecommunities.org |
| 77 | Gardens of Western Reserve at Cuyahoga Falls | Cuyahoga Falls | Summit | AL, MC (lic 2429R) | continuingcarecommunities.org |
| 78 | Grande Village Suites | Twinsburg | Summit | AL, MC (lic 2437R) | continuingcarecommunities.org |
| 79 | Grande Village Villas | Twinsburg | Summit | AL, MC | continuingcarecommunities.org |
| 80 | Greenfield Estate Alzheimer's Special Care Center | Akron | Summit | AL, MC | continuingcarecommunities.org |
| 81 | Greenview Senior Assisted Living | Uniontown | Summit | AL, MC | continuingcarecommunities.org |
| 82 | Heartland of Twinsburg | Twinsburg | Summit | AL, MC *(SNF-primary, lic 366419)* | continuingcarecommunities.org |
| 83 | Heather Knoll Retirement Village | Tallmadge | Summit | AL, MC | continuingcarecommunities.org |
| 84 | Heritage of Hudson | Hudson | Summit | AL, MC | continuingcarecommunities.org |
| 85 | Legacy Place - Twinsburg | Twinsburg | Summit | AL, MC (lic 2240R) | continuingcarecommunities.org |
| 86 | Maplewood at Cuyahoga Falls | Cuyahoga Falls | Summit | AL, MC | continuingcarecommunities.org |
| 87 | Maplewood at Twinsburg | Twinsburg | Summit | AL, MC | continuingcarecommunities.org |
| 88 | Merriman | Akron | Summit | AL, MC (lic 0523R) | continuingcarecommunities.org |
| 89 | Mulberry Gardens | Munroe Falls | Summit | AL, MC (lic 2405R) | continuingcarecommunities.org |
| 90 | National Church Residences Portage Trail Village | Cuyahoga Falls | Summit | AL (lic 2588R) | continuingcarecommunities.org |
| 91 | Pleasant Pointe Assisted Living | Barberton | Summit | AL, MC (lic 2249R) | continuingcarecommunities.org |
| 92 | Regina Health Center | Richfield | Summit | AL, MC, SNF (lic 2001R) | continuingcarecommunities.org |
| 93 | Renaissance Assisted Living | Richfield | Summit | AL, MC | continuingcarecommunities.org |
| 94 | Rockynol Retirement Community (Ohio Living) | Akron | Summit | AL, MC, IL | continuingcarecommunities.org |
| 95 | St. Luke Lutheran Community - Portage Lakes | Akron | Summit | AL, MC (lic 0670R) | continuingcarecommunities.org |
| 96 | Stow Glen Assisted Living | Stow | Summit | AL, MC (lic 1797R) | continuingcarecommunities.org |
| 97 | Summit Point | Macedonia | Summit | AL, MC | continuingcarecommunities.org |
| 98 | Sunrise Assisted Living of Cuyahoga Falls | Cuyahoga Falls | Summit | AL, MC (lic 2294R) | continuingcarecommunities.org |
| 99 | Tallmadge Senior Living | Tallmadge | Summit | AL, MC | continuingcarecommunities.org |
| 100 | The Pinnacle Rehabilitation and Nursing Center | Tallmadge | Summit | AL, MC *(SNF-primary, lic 366010)* | continuingcarecommunities.org |
| 101 | Village at St. Edward | Fairlawn | Summit | AL, MC, IL | continuingcarecommunities.org |
| 102 | Vista Springs Macedonia | Macedonia | Summit | AL, MC (lic 2707R) | continuingcarecommunities.org |
| 103 | Vitalia Montrose (The V Living) | Akron (Montrose) | Summit | AL, MC, IL | vitaliaseniorliving.com |
| 104 | Vitalia Stow | Stow | Summit | AL, MC, IL | vitaliaseniorliving.com |
| 105 | Pleasant View Health Care Center | Barberton | Summit | AL, MC *(SNF-primary)* | continuingcarecommunities.org |

*Summit note: rows 61–105 = 45 distinct facilities. The backbone directory reported "46" for
Summit; the remainder are SNF-primary campuses I excluded (Manorcare Barberton, Saber Skilled
Nursing Unit Barberton — both nursing-only per their 365xxx licenses). Verify the *(SNF-primary)*
rows above (75, 82, 100, 105) before seeding.*

---

## LORAIN COUNTY

| # | Facility Name | City | County | Care types | Source |
|---|---------------|------|--------|-----------|--------|
| 107 | Abbewood Assisted Living | Elyria | Lorain | AL, MC | continuingcarecommunities.org |
| 108 | Amherst Manor Assisted Living | Amherst | Lorain | AL, MC (lic 0416R) | continuingcarecommunities.org |
| 109 | Anchor Lodge Limited | Lorain | Lorain | AL, MC | continuingcarecommunities.org |
| 110 | Avenue Assisted Living (Avon Lake) | Avon Lake | Lorain | AL, MC (lic 2462R) | continuingcarecommunities.org |
| 111 | Avon Place | Avon | Lorain | AL, MC *(SNF-primary, lic 365155)* | continuingcarecommunities.org |
| 112 | Danbury North Ridgeville | North Ridgeville | Lorain | AL, MC | storypoint.com |
| 113 | Elmcroft of Lorain | Lorain | Lorain | AL, MC (lic 2301R) | continuingcarecommunities.org |
| 114 | Elms Retirement Village | Wellington | Lorain | AL, MC (lic 1194R) | continuingcarecommunities.org |
| 115 | Gardens of French Creek at Avon Oaks | Avon | Lorain | AL, MC | continuingcarecommunities.org |
| 116 | Independence Village of Avon Lake | Avon Lake | Lorain | AL, MC | continuingcarecommunities.org |
| 117 | Kendal at Oberlin | Oberlin | Lorain | AL, MC, IL, SNF | continuingcarecommunities.org |
| 118 | Main Street Care Center | Avon Lake | Lorain | AL, MC *(SNF-primary, lic 365865)* | continuingcarecommunities.org |
| 119 | O'Neill Healthcare North Ridgeville | North Ridgeville | Lorain | AL, MC | continuingcarecommunities.org |
| 120 | O'Neill Healthcare Assisted Living (N. Ridgeville) | North Ridgeville | Lorain | AL, MC | continuingcarecommunities.org |
| 121 | St. Mary of the Woods | Avon | Lorain | AL, MC (lic 2439R) | continuingcarecommunities.org |
| 122 | Wesleyan Village (Ohio Living) | Elyria | Lorain | AL, MC, IL (lic 0477R) | continuingcarecommunities.org |
| 123 | Lake Pointe Health Care | Lorain | Lorain | AL, MC *(SNF-primary)* | continuingcarecommunities.org |
| 124 | Northridge Health Center | North Ridgeville | Lorain | AL, MC *(SNF-primary, lic 365645)* | continuingcarecommunities.org |
| 125 | Oak Hills Nursing Center | Lorain | Lorain | AL, MC *(SNF-primary)* | continuingcarecommunities.org |
| 126 | Autumn Aegis (Lorain) | Lorain | Lorain | AL, MC *(SNF-primary, lic 365940)* | continuingcarecommunities.org |
| 127 | Wellington Place / Welcome Nursing Home (verify) | Oberlin | Lorain | AL, MC *(SNF-primary, verify)* | directory cross-ref |

*Lorain note: Several rows (111, 118, 123–127) are nursing-primary campuses that the directory
listed under AL. Verify against ODH before seeding; some may be SNF-only and should drop. Amherst
Manor Nursing Home (SNF) was folded into Amherst Manor Assisted Living (#108) as one campus.*

---

## LAKE COUNTY

| # | Facility Name | City | County | Care types | Source |
|---|---------------|------|--------|-----------|--------|
| 128 | Brookdale Mentor | Mentor | Lake | AL, MC | continuingcarecommunities.org |
| 129 | Brookdale Newell Creek | Mentor | Lake | AL, MC (lic 2652R) | continuingcarecommunities.org |
| 130 | Brookdale Wickliffe | Wickliffe | Lake | AL, MC | continuingcarecommunities.org |
| 131 | Brookdale Willoughby | Willoughby | Lake | AL, MC | continuingcarecommunities.org |
| 132 | Danbury Mentor | Mentor | Lake | AL, MC | storypoint.com / seniorly.com |
| 133 | Governor's Pointe | Mentor | Lake | AL, MC | continuingcarecommunities.org |
| 134 | Homestead I | Painesville | Lake | AL, MC (lic 365492) | continuingcarecommunities.org |
| 135 | Homestead II | Painesville | Lake | AL, MC | continuingcarecommunities.org |
| 136 | Ivy House Assisted Living | Painesville | Lake | AL, MC (lic 0080R) | continuingcarecommunities.org |
| 137 | Lantern of Madison | Madison | Lake | AL, MC | continuingcarecommunities.org |
| 138 | Nason Center of Breckenridge Village | Willoughby | Lake | AL, MC (lic 1760R) | continuingcarecommunities.org |
| 139 | Ohio Living Breckenridge Village | Willoughby | Lake | AL, MC, IL (lic 365581) | continuingcarecommunities.org |
| 140 | Salida Woods Assisted Living | Mentor | Lake | AL, MC | continuingcarecommunities.org |
| 141 | Symphony at Mentor | Mentor | Lake | AL, MC | continuingcarecommunities.org |
| 142 | Van Gorder Manor | Willoughby | Lake | AL, MC | continuingcarecommunities.org |
| 143 | Wickliffe Country Place | Wickliffe | Lake | AL, MC *(SNF-primary)* | continuingcarecommunities.org |
| 144 | Heartland of Willoughby | Willoughby | Lake | AL *(SNF-primary, lic 365305)* | continuingcarecommunities.org |
| 145 | Kindred Transitional Care & Rehab - LakeMed | Painesville | Lake | AL, MC *(SNF-primary, lic 365713)* | continuingcarecommunities.org |

---

## MEDINA COUNTY

| # | Facility Name | City | County | Care types | Source |
|---|---------------|------|--------|-----------|--------|
| 146 | Altercare of Wadsworth | Wadsworth | Medina | AL, MC *(SNF-primary)* | continuingcarecommunities.org |
| 147 | Brookdale Medina North | Medina | Medina | AL, MC (lic 2357R) | continuingcarecommunities.org |
| 148 | Brookdale Medina South | Medina | Medina | AL, MC (lic 2319R) | continuingcarecommunities.org |
| 149 | Danbury Brunswick | Brunswick | Medina | AL, MC | storypoint.com |
| 150 | Elmcroft of Medina | Medina | Medina | AL, MC (lic 2227R) | continuingcarecommunities.org |
| 151 | Inn at Coal Ridge | Wadsworth | Medina | AL, MC | continuingcarecommunities.org |
| 152 | Liberty Residence Holdings | Wadsworth | Medina | AL, MC | continuingcarecommunities.org |
| 153 | Plum Creek Assisted Living | Brunswick | Medina | AL, MC | continuingcarecommunities.org |
| 154 | Samaritan Villa | Medina | Medina | AL | continuingcarecommunities.org |
| 155 | Sanctuary Wadsworth | Wadsworth | Medina | AL, MC | continuingcarecommunities.org |
| 156 | StoryPoint Medina East | Medina | Medina | AL, IL | storypoint.com |
| 157 | StoryPoint Medina West | Medina | Medina | AL, MC, IL | storypoint.com |
| 158 | Wadsworth Pointe | Wadsworth | Medina | AL, MC (lic 2059R) | continuingcarecommunities.org |
| 159 | Western Reserve Masonic Community | Medina | Medina | AL, MC, IL (lic 2188R) | continuingcarecommunities.org |

*Medina note: Willowood Care Center of Brunswick (lic 365785) and Pearlview Rehab & Wellness
(Brunswick) appeared in the AL directory but are SNF-primary — verify before seeding; likely drop.*

---

## GEAUGA COUNTY

| # | Facility Name | City | County | Care types | Source |
|---|---------------|------|--------|-----------|--------|
| 160 | Arden Courts of Chagrin Falls | Bainbridge | Geauga | AL, MC (lic 2243R) | continuingcarecommunities.org |
| 161 | Briar Hill Health Care Residence | Middlefield | Geauga | AL, MC (lic 0260R) | continuingcarecommunities.org |
| 162 | Briarcliff Manor | Middlefield | Geauga | AL, MC | continuingcarecommunities.org |
| 163 | Holly Hill | Newbury | Geauga | AL, MC | continuingcarecommunities.org |
| 164 | Maplewood at Heather Hill | Chardon | Geauga | AL, MC (lic 2264R) | continuingcarecommunities.org |
| 165 | Pines at Brooks House | Hiram | Geauga | AL, MC (lic 2500R) | continuingcarecommunities.org |
| 166 | Princeton Place | Huntsburg | Geauga | AL, MC (lic 0666R) | continuingcarecommunities.org |
| 167 | Residence of Chardon | Chardon | Geauga | AL, MC | continuingcarecommunities.org |
| 168 | South Franklin Circle | Bainbridge | Geauga | AL, MC, IL | continuingcarecommunities.org |
| 169 | Weils of Bainbridge (The Weils) | Bainbridge | Geauga | AL, MC, SNF | continuingcarecommunities.org |
| 170 | Hamlet at Chagrin Falls (verify county — Chagrin Falls campus) | Chagrin Falls | Geauga/Cuyahoga border | AL, MC, IL *(verify)* | directory cross-ref |

*Geauga note: This is a genuinely small market (~10–11 facilities). Count is not padded. Row 170
(Hamlet at Chagrin Falls) straddles the Cuyahoga/Geauga line — verify county assignment.*

---

## End-of-list verification checklist for the developer
1. **Dedupe** against the ~65 already-seeded Tier-A + batch-2 facilities (name + city + license).
2. **Drop or confirm** every row tagged *(SNF-primary)* — verify it carries an AL/RCF wing in
   the ODH Long-Term Care Consumer Guide; if SNF-only, exclude per CareLinkAI rules.
3. **Verify license numbers** against `ltcohio.org` / `ltc.ohio.gov` (some published numbers
   may be stale; some `365xxx` are SNF not RCF).
4. **Resolve chain naming variants** before insert (Arden Courts / ProMedica; Danbury /
   StoryPoint; Vitalia / Omni Lifestyle).
5. **Confirm county** for border rows (Hamlet at Chagrin Falls; any Bath/Montrose Summit-Cuyahoga
   edge cases).
