/**
 * Suburb SEO pages under /cleveland/assisted-living/<slug> (sprint W3 item 3 /
 * sprint 2.3). An allow-list, not a free-form route: an unknown slug 404s.
 *
 * Why these three first: the ODH residential-care-facility roster the
 * directory is seeded from (scripts/data/odh_rcf_cleveland_metro_2026_07_04.csv)
 * has the most licensed homes, outside Cleveland proper, in Westlake (11),
 * Strongsville (8) and Parma (7) among Cuyahoga County suburbs. Mentor (8) is
 * Lake County; Beachwood (6) and Lakewood are the next two to add — one entry
 * here, nothing else.
 *
 * `cities` lists the address.city spellings a page should match (case-
 * insensitive) — some roster rows carry the post-office name of a
 * neighbouring village.
 */

export type Suburb = {
  slug: string;
  name: string;
  county: string;
  /** address.city values that belong on this page. */
  cities: readonly string[];
  /** Unique <title>. */
  title: string;
  /** Unique meta description (≤ 160 chars). */
  description: string;
  /** Unique H1. */
  h1: string;
  /** Two or three sentences of local context — facts, no superlatives. */
  intro: string;
  /** Nearby hospitals / landmarks families ask about (facts only). */
  nearby: readonly string[];
};

export const SUBURBS: readonly Suburb[] = [
  {
    slug: 'westlake',
    name: 'Westlake',
    county: 'Cuyahoga',
    cities: ['Westlake'],
    title: 'Assisted Living in Westlake, OH — Licensed Homes, Inspections & Availability | CareLinkAI',
    description:
      'Licensed assisted living homes in Westlake, OH with Ohio Department of Health inspection facts, verified availability and published pricing. No broker fees.',
    h1: 'Assisted Living in Westlake, OH',
    intro:
      'Westlake, on Cleveland’s west side along I-90, has the largest cluster of licensed assisted living and residential care facilities of any Cuyahoga County suburb. Families from Bay Village, Avon, North Olmsted and Rocky River tour here because of the concentration of options and the proximity to UH St. John Medical Center and the Cleveland Clinic Avon campus.',
    nearby: [
      'University Hospitals St. John Medical Center (Westlake)',
      'Cleveland Clinic Avon Hospital (Avon)',
      'Crocker Park and the Westlake Recreation Center',
    ],
  },
  {
    slug: 'strongsville',
    name: 'Strongsville',
    county: 'Cuyahoga',
    cities: ['Strongsville'],
    title: 'Assisted Living in Strongsville, OH — Licensed Homes, Inspections & Availability | CareLinkAI',
    description:
      'Licensed assisted living homes in Strongsville, OH with ODH inspection facts, verified availability and published pricing. Compare and contact homes directly.',
    h1: 'Assisted Living in Strongsville, OH',
    intro:
      'Strongsville sits where I-71 meets the Ohio Turnpike on Cleveland’s southwest side, which makes it a practical choice for families spread between Medina County and the west side. Its assisted living options range from campus-style communities to smaller residential care homes, with Southwest General Health Center a few minutes away in Middleburg Heights.',
    nearby: [
      'Southwest General Health Center (Middleburg Heights)',
      'Cleveland Clinic Strongsville Family Health and Surgery Center',
      'Cleveland Metroparks Mill Stream Run Reservation',
    ],
  },
  {
    slug: 'parma',
    name: 'Parma',
    county: 'Cuyahoga',
    cities: ['Parma', 'Parma Heights'],
    title: 'Assisted Living in Parma, OH — Licensed Homes, Inspections & Availability | CareLinkAI',
    description:
      'Licensed assisted living homes in Parma, OH with Ohio Department of Health inspection facts, verified availability and published pricing. No placement fees.',
    h1: 'Assisted Living in Parma, OH',
    intro:
      'Parma is Cuyahoga County’s second-largest city and home to a large population of long-time residents aging in place, so its assisted living homes tend to draw families from the surrounding southwest suburbs — Parma Heights, Seven Hills, Brooklyn and Brook Park. UH Parma Medical Center anchors the local health system and is the hospital most of these homes work with for admissions and follow-up care.',
    nearby: [
      'University Hospitals Parma Medical Center',
      'Cleveland Clinic Parma Family Health Center',
      'Cleveland Metroparks Big Creek Reservation',
    ],
  },
];

export function findSuburb(slug: string | undefined | null): Suburb | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  return SUBURBS.find((x) => x.slug === s) ?? null;
}

export function suburbPath(s: Pick<Suburb, 'slug'>): string {
  return `/cleveland/assisted-living/${s.slug}`;
}
