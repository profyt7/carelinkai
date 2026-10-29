# OL-217 visual-diff assets (not code, never merge)

`before/` = main @ 99a44aea. `after/` = feat/ol-217-facility-profile.

**What's in the set:** `/homes/[id]` for two homes, at 1280, 820 and 390, logged out and as FAMILY. Each also has a 390x660 shot scrolled to the end with the widgets visible.
- **(a) Beachwood Gardens:** claimed, 3 photos, verified availability, operator price. Its ODH survey (Mar 4 2026, 2 citations, license `0000-TEST`) is fictional and exists only in the local database.
- **(b) Chagrin Valley Manor:** unclaimed, with no photos, no price and no verification.

**Capture setup:** fixed clock, DSF 1, reduced motion, fonts loaded, the same seeded database for both runs. Leaflet tiles are hidden. Widgets are hidden except in the `-390x660-footer` shots.

**Other files:**
- `mask-change/`: the changed pixels for each shot, plus `summary.json` (row bands).
- `axe-before.json` / `axe-after.json`: wcag2a/aa/21a/21aa results for the guest pages at 1280/390, plus the footer metrics (CTA bar and tab-bar boxes, widget boxes, `--bottom-stack-offset`, and the inquiry-form count in the accessibility tree).

## Baseline noise (two `before` runs; `baseline-noise/`)
| shot | band | cause |
|---|---|---|
| claimed-guest-1280 | y549-608 | PhotoGallery lazy thumbnails (decode timing) |
| claimed-guest-390 | y428-480 | the same thumbnails |
| unclaimed-family-390 | y154-199 | alt text of the old remote stock placeholder (the image doesn't load in the sandbox) |

These bands are excluded from attribution. Nothing else differed between the two baseline runs.

## Pixel diff: every changed region attributed
The full-page shots change almost everywhere, because the layout is new and everything below the header shifts. Page heights get shorter: for example, claimed-guest-1280 goes from 4081 to 3843 and unclaimed-guest-1280 from 4036 to 3422. The table maps each region from top to bottom.

| region (top → bottom) | spec § | what changed |
|---|---|---|
| "Back to Search" row → breadcrumb + Save/Share on an ivory band | §1 | breadcrumb from `listingBreadcrumb` (the same items as the JSON-LD). Save/Share kept |
| gallery | §1 | ≥ md: PhotoGallery hero (2/3) plus a second photo with "All photos". 390: single photo. No photos: `HomeImagePlaceholder` "Photos coming soon" (replaces the stock photo) |
| name / location / rating | §1 | name in DM Serif; the amber first-party rating box is gone; GoogleRatingBadge (full) |
| key-stat tiles | §2 | Care types · Availability · Pricing · State inspection. Beachwood shows 4 tiles. Chagrin has no survey on file, so it shows 3 tiles ("contact to confirm" / "contact for a quote", with no implied zero) |
| section nav bar | §3 | About · Amenities · Pricing · Location · Reviews · Inspections inside `listing-sticky-bar`, scrollable with a fade below md |
| right rail (≥ lg) / inline panel (< lg) | §4 | the existing form in one instance; the availability badge and price line above Schedule a Tour · Send Inquiry |
| About / Amenities / Pricing / Location / Reviews / Inspections | §5 | Direction D cards in that order; availability and price aren't repeated outside Pricing, except the pinned quick-facts line |
| Contact Information | §4 | the "Send a Message" / "Chat with a Care Advisor" buttons are removed; details stay as information |
| claim block → footer line (guest / FAMILY on unclaimed) | §6 | "Operate this community? Claim this listing…" |
| `-390x660-footer` FAMILY | §4 + §7 | CTA bar docked on the tab bar (y529–596, tab bar y596). `--bottom-stack-offset` goes from 64 to 131px, so the Care Advisor and bug buttons move up 67px. Claim line visible above the bar |
| `-390x660-footer` guest | (none) | 0 px: the end of the page is the site footer. The CTA bar is sticky inside the listing, so it stays behind once you scroll into the footer |

## axe (guest, 1280 + 390)
- Before → after: color-contrast 6 → 1 (claimed) and 7 → 1 (unclaimed). **0 new violations** at node level.
- The one that remains, `.bg-amber-500`, was already present before this change.
