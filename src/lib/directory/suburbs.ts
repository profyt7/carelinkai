/**
 * Suburb SEO pages under /cleveland/assisted-living/<slug> (sprint W3 item 3 /
 * sprint 2.3). An allow-list, not a free-form route: an unknown slug 404s.
 *
 * Why these five: the ODH residential-care-facility roster the directory is
 * seeded from (scripts/data/odh_rcf_cleveland_metro_2026_07_04.csv) has the
 * most licensed homes, outside Cleveland proper, in Westlake (11),
 * Strongsville (8), Parma (7), Beachwood (6) and Lakewood (2) among Cuyahoga
 * County suburbs. Mentor (8) is Lake County. Adding a suburb = one entry here;
 * the sitemap, /llms.txt, the "other suburbs" grid and the empty-state guard
 * (src/lib/directory/suburb-guard.ts) all read this list.
 *
 * `cities` lists the address.city spellings a page should match (case-
 * insensitive) — some roster rows carry the post-office name of a
 * neighbouring village.
 *
 * A page whose filter matches no live, non-demo ASSISTED home renders the
 * empty state and logs a warning (count + filter) — run
 * `npx tsx scripts/check-suburb-listings.ts` against the target DB before
 * adding a suburb, or after a data sweep, to see the counts.
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
  /** Approximate city-centre coordinates — only used to pick the 4 nearest suburbs to link (OL-172 f). */
  lat: number;
  lng: number;
};

export const SUBURBS: readonly Suburb[] = [
  {
    slug: 'westlake',
    name: 'Westlake',
    county: 'Cuyahoga',
    cities: ['Westlake'],
    title: 'Assisted Living in Westlake, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Westlake, OH, near UH St. John Medical Center: Ohio inspection facts and open beds confirmed by each home.',
    h1: 'Assisted Living in Westlake, OH',
    intro:
      'Westlake, on Cleveland’s west side along I-90, has the largest cluster of licensed assisted living and residential care facilities of any Cuyahoga County suburb. Families from Bay Village, Avon, North Olmsted and Rocky River tour here because of the concentration of options and the proximity to UH St. John Medical Center and the Cleveland Clinic Avon campus.',
    nearby: [
      'University Hospitals St. John Medical Center (Westlake)',
      'Cleveland Clinic Avon Hospital (Avon)',
      'Crocker Park and the Westlake Recreation Center',
    ],
    lat: 41.4553,
    lng: -81.9179,
  },
  {
    slug: 'strongsville',
    name: 'Strongsville',
    county: 'Cuyahoga',
    cities: ['Strongsville'],
    title: 'Assisted Living in Strongsville, OH',
    description:
      'Licensed assisted living homes in Strongsville, OH, by I-71 and the Turnpike: Ohio Department of Health inspection facts and open beds confirmed by homes.',
    h1: 'Assisted Living in Strongsville, OH',
    intro:
      'Strongsville sits where I-71 meets the Ohio Turnpike on Cleveland’s southwest side, which makes it a practical choice for families spread between Medina County and the west side. Its assisted living options range from campus-style communities to smaller residential care homes, with Southwest General Health Center a few minutes away in Middleburg Heights.',
    nearby: [
      'Southwest General Health Center (Middleburg Heights)',
      'Cleveland Clinic Strongsville Family Health and Surgery Center',
      'Cleveland Metroparks Mill Stream Run Reservation',
    ],
    lat: 41.3145,
    lng: -81.8357,
  },
  {
    slug: 'parma',
    name: 'Parma',
    county: 'Cuyahoga',
    cities: ['Parma', 'Parma Heights'],
    title: 'Assisted Living in Parma, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Parma and Parma Heights, OH, near UH Parma Medical Center: state inspection facts and open beds confirmed with each home.',
    h1: 'Assisted Living in Parma, OH',
    intro:
      'Parma is Cuyahoga County’s second-largest city and home to a large population of long-time residents aging in place, so its assisted living homes tend to draw families from the surrounding southwest suburbs — Parma Heights, Seven Hills, Brooklyn and Brook Park. UH Parma Medical Center anchors the local health system and is the hospital most of these homes work with for admissions and follow-up care.',
    nearby: [
      'University Hospitals Parma Medical Center',
      'Cleveland Clinic Parma Family Health Center',
      'Cleveland Metroparks Big Creek Reservation',
    ],
    lat: 41.4048,
    lng: -81.7229,
  },
  {
    slug: 'beachwood',
    name: 'Beachwood',
    county: 'Cuyahoga',
    cities: ['Beachwood'],
    title: 'Assisted Living in Beachwood, OH',
    description:
      'Licensed assisted living and memory care homes in Beachwood, OH, near UH Ahuja Medical Center: Ohio inspection facts and open beds confirmed with the home.',
    h1: 'Assisted Living in Beachwood, OH',
    intro:
      'Beachwood, on Cleveland’s east side at I-271 and Chagrin Boulevard, has one of the densest groupings of licensed assisted living and memory care homes in Cuyahoga County, several of them on the Cedar Road corridor. Families from Shaker Heights, Pepper Pike, Lyndhurst and Orange tour here, and UH Ahuja Medical Center is inside the city limits.',
    nearby: [
      'University Hospitals Ahuja Medical Center (Beachwood)',
      'Cleveland Clinic Beachwood Family Health and Surgery Center',
      'Beachwood Place and Legacy Village (Lyndhurst)',
    ],
    lat: 41.4645,
    lng: -81.5087,
  },
  {
    slug: 'lakewood',
    name: 'Lakewood',
    county: 'Cuyahoga',
    cities: ['Lakewood'],
    title: 'Assisted Living in Lakewood, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Lakewood, OH, on the Detroit Avenue corridor: Ohio inspection facts and open beds confirmed by each home itself.',
    h1: 'Assisted Living in Lakewood, OH',
    intro:
      'Lakewood is the dense, walkable inner-ring suburb directly west of Cleveland along Lake Erie, and many of its residents have lived there for decades. Its licensed assisted living homes sit on the Detroit Avenue corridor within a short drive of Cleveland Clinic Lakewood Family Health Center and Fairview Hospital, which is where most local admissions and follow-up care happen.',
    nearby: [
      'Cleveland Clinic Lakewood Family Health Center',
      'Cleveland Clinic Fairview Hospital (Cleveland, west side)',
      'Lakewood Park and the Gold Coast lakefront',
    ],
    lat: 41.482,
    lng: -81.7982,
  },
  // ---- OL-172 (e): the next ten by licensed-home count in the ODH roster
  // (scripts/data/odh_rcf_cleveland_metro_2026_07_04.csv). Cleveland itself is
  // the hub and Akron is its own metro, so both are skipped; four cities tie at
  // four homes and the five closest to Cleveland were taken.
  {
    slug: 'mentor',
    name: 'Mentor',
    county: 'Lake',
    cities: ['Mentor', 'Mentor-on-the-Lake'],
    title: 'Assisted Living in Mentor, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Mentor, OH, from Lakeshore Boulevard to Mentor Hills: Ohio Department of Health inspection facts and open beds confirmed.',
    h1: 'Assisted Living in Mentor, OH',
    intro:
      'Mentor is the largest city in Lake County and the east-side suburb with the most licensed assisted living homes in our directory. The homes are spread across the city rather than clustered: two sit on Lakeshore Boulevard near the Lake Erie shoreline, two are on Mentor Hills Drive near Route 2, and others are off Center Street, Hendricks Road and Norton Parkway. Families coming from Willoughby, Painesville, Kirtland and Concord usually reach them by Route 2 or I-90. For hospital care, Lake Health’s TriPoint Medical Center in Concord Township and West Medical Center in Willoughby are each a short drive, and Cleveland’s east-side hospitals are roughly 30 minutes away. Because the homes range from small residential care settings to larger communities, it is worth asking each one which level of care it is licensed to provide and what happens if needs change.',
    nearby: [
      'TriPoint Medical Center (Concord Township, Lake Health)',
      'West Medical Center (Willoughby, Lake Health)',
      'Great Lakes Mall and the Mentor Avenue (US-20) corridor',
    ],
    lat: 41.6662,
    lng: -81.3396,
  },
  {
    slug: 'cuyahoga-falls',
    name: 'Cuyahoga Falls',
    county: 'Summit',
    cities: ['Cuyahoga Falls'],
    title: 'Assisted Living in Cuyahoga Falls, OH',
    description:
      'Licensed assisted living homes in Cuyahoga Falls, OH, near Western Reserve Hospital: Ohio Department of Health inspection facts and open beds confirmed.',
    h1: 'Assisted Living in Cuyahoga Falls, OH',
    intro:
      'Cuyahoga Falls sits just north of Akron along the Cuyahoga River and State Route 8, and it has the most licensed assisted living homes of any Summit County suburb in our directory. The homes are on Graham Road, State Road, West Bath Road, Chart Road and in the Queens Gate area, so most are a few minutes from Route 8 for families driving in from Stow, Hudson, Silver Lake or Akron. Western Reserve Hospital is inside the city, and Summa Health’s Akron City Hospital and Cleveland Clinic Akron General are about 15 minutes south, which matters when a parent is moving from a hospital stay straight into assisted living. Downtown’s Front Street riverfront and the edge of Cuyahoga Valley National Park are close to several of the homes. When you tour, ask which hospital the home sends residents to and how it coordinates follow-up appointments.',
    nearby: [
      'Western Reserve Hospital (Cuyahoga Falls)',
      'Summa Health Akron City Hospital and Cleveland Clinic Akron General (Akron)',
      'Front Street riverfront and Cuyahoga Valley National Park',
    ],
    lat: 41.1339,
    lng: -81.4846,
  },
  {
    slug: 'rocky-river',
    name: 'Rocky River',
    county: 'Cuyahoga',
    cities: ['Rocky River'],
    title: 'Assisted Living in Rocky River, OH',
    description:
      'Licensed assisted living homes in Rocky River, OH, along Center Ridge Road and Detroit Road: Ohio inspection facts and open beds confirmed with each home.',
    h1: 'Assisted Living in Rocky River, OH',
    intro:
      'Rocky River is a lakefront suburb just west of Lakewood, separated from Cleveland by the Rocky River valley and the Metroparks reservation that follows it. Three of its licensed assisted living homes are on Center Ridge Road (US-20), the city’s main east–west commercial corridor, and the others are on Detroit Road and Lake Road closer to the lake. That puts every home within a few minutes of I-90 for families coming from Westlake, Bay Village, Fairview Park or Cleveland’s west side. Cleveland Clinic Fairview Hospital in Kamm’s Corners and UH St. John Medical Center in Westlake are the hospitals closest to most of these homes. Rocky River’s homes tend to draw families whose parents already live on the west side, so it is common to compare them with options in Westlake and Lakewood before deciding.',
    nearby: [
      'Cleveland Clinic Fairview Hospital (Kamm’s Corners, Cleveland)',
      'University Hospitals St. John Medical Center (Westlake)',
      'Cleveland Metroparks Rocky River Reservation',
    ],
    lat: 41.4756,
    lng: -81.8393,
  },
  {
    slug: 'medina',
    name: 'Medina',
    county: 'Medina',
    cities: ['Medina'],
    title: 'Assisted Living in Medina, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Medina, OH, near Cleveland Clinic Medina Hospital: Ohio Department of Health inspection facts and open beds confirmed.',
    h1: 'Assisted Living in Medina, OH',
    intro:
      'Medina is the county seat of Medina County, about 30 miles south of downtown Cleveland near where I-71 meets I-76. Its licensed assisted living homes are close to the city centre: on North Jefferson Street and East Washington Street a few blocks from the historic Public Square, and on Nettleton Road, High Point Drive and Leisure Lane on the edges of town. Cleveland Clinic Medina Hospital is on the east side of the city, near the East Washington Street home, which makes Medina a practical choice when a parent’s doctors are already in the Cleveland Clinic system. Families from Brunswick, Wadsworth, Seville and Lodi often look here first, and families in Strongsville sometimes compare these homes with options closer to the Turnpike. Ask each home whether it accepts residents who will need memory care later, since not every home here offers it.',
    nearby: [
      'Cleveland Clinic Medina Hospital',
      'Medina Public Square',
      'The I-71 / I-76 interchange (Westfield Center)',
    ],
    lat: 41.1384,
    lng: -81.8637,
  },
  {
    slug: 'hudson',
    name: 'Hudson',
    county: 'Summit',
    cities: ['Hudson'],
    title: 'Assisted Living in Hudson, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Hudson, OH, along Darrow Road and Route 303: Ohio Department of Health inspection facts and open beds confirmed by homes.',
    h1: 'Assisted Living in Hudson, OH',
    intro:
      'Hudson is in northern Summit County, roughly halfway between Cleveland and Akron, with the Ohio Turnpike and I-480 a short drive north. Its licensed assisted living homes follow the city’s main roads: Darrow Road (State Route 91), West Streetsboro Road (Route 303), Industrial Parkway, and the Laurel Lake and Omni Lake developments, several of them campus-style communities with more than one level of care on site. Families from Twinsburg, Stow, Macedonia and Streetsboro commonly compare homes here. The closest hospital is Western Reserve Hospital in neighbouring Cuyahoga Falls, and Summa Health and Cleveland Clinic Akron General in Akron are about 20 minutes south; UH Ahuja Medical Center in Beachwood is a comparable drive north via Route 8 and I-271. Ask whether moving between levels of care on a campus means a new contract and a new rate.',
    nearby: [
      'Western Reserve Hospital (Cuyahoga Falls)',
      'Summa Health and Cleveland Clinic Akron General (Akron)',
      'Hudson’s First and Main town centre',
    ],
    lat: 41.2401,
    lng: -81.4407,
  },
  {
    slug: 'north-olmsted',
    name: 'North Olmsted',
    county: 'Cuyahoga',
    cities: ['North Olmsted'],
    title: 'Assisted Living in North Olmsted, OH',
    description:
      'Licensed assisted living homes in North Olmsted, OH, near Lorain Road and Clague Road: Ohio Department of Health inspection facts and open beds confirmed.',
    h1: 'Assisted Living in North Olmsted, OH',
    intro:
      'North Olmsted is on Cleveland’s far west side, between Westlake to the north and Olmsted Falls to the south, with I-480 and I-90 both a short drive away. Two of its licensed assisted living homes are on Lorain Road (State Route 10), the commercial corridor that runs past Great Northern Mall, and the others are on Clague Road and Mill Road in quieter residential areas. The hospitals families ask about most are UH St. John Medical Center in Westlake, Cleveland Clinic Fairview Hospital in Kamm’s Corners and Southwest General Health Center in Middleburg Heights, each about 15 minutes away. North Olmsted homes are often toured alongside options in Westlake, Rocky River and Avon, because a short drive covers all four. When you visit, ask what the base monthly rate includes and what triggers a higher level-of-care charge, since these vary from home to home.',
    nearby: [
      'University Hospitals St. John Medical Center (Westlake)',
      'Southwest General Health Center (Middleburg Heights)',
      'Great Northern Mall and the Lorain Road (Route 10) corridor',
    ],
    lat: 41.4156,
    lng: -81.9235,
  },
  {
    slug: 'avon',
    name: 'Avon',
    county: 'Lorain',
    cities: ['Avon'],
    title: 'Assisted Living in Avon, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Avon, OH, near Cleveland Clinic Avon Hospital: Ohio inspection facts and open beds confirmed by each home.',
    h1: 'Assisted Living in Avon, OH',
    intro:
      'Avon is in eastern Lorain County, directly west of Westlake along I-90, and it has grown quickly over the past two decades. Two of its licensed assisted living homes are on Health Campus Boulevard near the Cleveland Clinic Avon Hospital campus by the I-90 interchange, which is useful when a parent sees Cleveland Clinic specialists or is being discharged from that hospital. The others are on Detroit Road and French Creek Road. UH St. John Medical Center in Westlake is also about ten minutes east. Families from Avon Lake, Sheffield, North Ridgeville and Westlake regularly compare homes here, and the French Creek area and Avon Commons are close by for visits. Because several Avon homes are newer buildings, ask what is included in the base rate — meals, medication help, laundry, transportation — and how often rates have increased for current residents.',
    nearby: [
      'Cleveland Clinic Avon Hospital',
      'University Hospitals St. John Medical Center (Westlake)',
      'French Creek Reservation and Avon Commons',
    ],
    lat: 41.4517,
    lng: -82.0354,
  },
  {
    slug: 'twinsburg',
    name: 'Twinsburg',
    county: 'Summit',
    cities: ['Twinsburg'],
    title: 'Assisted Living in Twinsburg, OH',
    description:
      'Licensed assisted living homes in Twinsburg, OH, along East Aurora Road (Route 82): Ohio Department of Health inspection facts and open beds confirmed.',
    h1: 'Assisted Living in Twinsburg, OH',
    intro:
      'Twinsburg sits in the northeast corner of Summit County where Route 82 meets I-480 and Route 8 is a short drive west, so it is reachable from Cuyahoga, Summit and Portage counties alike. Two of its licensed assisted living homes face each other on East Aurora Road (Route 82), and the others are on Vail Drive and Sussex Boulevard in residential neighbourhoods. University Hospitals runs a health centre in Twinsburg, and UH Ahuja Medical Center in Beachwood is about 15 minutes north by I-480 and I-271; Western Reserve Hospital in Cuyahoga Falls is a similar drive south. Families from Macedonia, Reminderville, Aurora, Hudson and Solon often compare homes here. The city is best known for its Twins Days festival each August. When touring, ask which hospital the home transfers residents to and whether it has a working relationship with University Hospitals or Cleveland Clinic physicians.',
    nearby: [
      'University Hospitals Twinsburg Health Center',
      'University Hospitals Ahuja Medical Center (Beachwood)',
      'The Route 82 / I-480 interchange',
    ],
    lat: 41.3126,
    lng: -81.4401,
  },
  {
    slug: 'chardon',
    name: 'Chardon',
    county: 'Geauga',
    cities: ['Chardon'],
    title: 'Assisted Living in Chardon, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Chardon, OH, near UH Geauga Medical Center: Ohio Department of Health inspection facts and open beds confirmed by homes.',
    h1: 'Assisted Living in Chardon, OH',
    intro:
      'Chardon is the county seat of Geauga County, about 30 miles east of downtown Cleveland where US-6 and State Route 44 cross. It is the most rural area covered by our Cleveland directory, and its licensed assisted living homes reflect that: one is on Water Street close to Chardon Square, and the others are on Chardon-Windsor Road, Bass Lake Road and Pine Grove Trail, where homes have more land around them. UH Geauga Medical Center is just south of the city on Ravenna Road, and it is where most local admissions happen. Families from Munson, Hambden, Burton, Middlefield and Painesville often look here, and families in Mentor sometimes compare Chardon homes with options closer to Lake Erie. The square hosts the Geauga County Maple Festival each spring. Winter driving matters here, so ask each home how it handles visits, deliveries and appointments during lake-effect snow.',
    nearby: [
      'University Hospitals Geauga Medical Center',
      'Chardon Square and the Geauga County Courthouse',
      'The US-6 / State Route 44 crossroads',
    ],
    lat: 41.5814,
    lng: -81.2087,
  },
  {
    slug: 'stow',
    name: 'Stow',
    county: 'Summit',
    cities: ['Stow'],
    title: 'Assisted Living in Stow, OH: Licensed Homes',
    description:
      'Licensed assisted living homes in Stow, OH, along Fishcreek Road near Route 8: Ohio Department of Health inspection facts and open beds confirmed by homes.',
    h1: 'Assisted Living in Stow, OH',
    intro:
      'Stow is in north-central Summit County, between Cuyahoga Falls to the west and Kent to the east, with Route 8 running along its western edge. Two of its licensed assisted living homes are on Fishcreek Road, the north–south road that crosses the city, and the others are on Englewood Drive and Allen Road. Western Reserve Hospital in Cuyahoga Falls is the closest hospital for most of these homes, and Summa Health and Cleveland Clinic Akron General in Akron are roughly 20 minutes south. Families from Hudson, Munroe Falls, Silver Lake, Tallmadge and Kent commonly compare homes here, and a short drive covers the Cuyahoga Falls homes as well, so many families tour both cities on the same day. Ask each Stow home whether it is licensed for the level of care your parent needs now and what happens if memory care becomes necessary later, because not every home offers it on site.',
    nearby: [
      'Western Reserve Hospital (Cuyahoga Falls)',
      'Summa Health and Cleveland Clinic Akron General (Akron)',
      'Silver Springs Park and the Fishcreek Road corridor',
    ],
    lat: 41.1595,
    lng: -81.4404,
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

/** Great-circle distance in km (only used to rank suburbs by proximity). */
function distanceKm(a: Pick<Suburb, 'lat' | 'lng'>, b: Pick<Suburb, 'lat' | 'lng'>): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** OL-172 (f): the n suburbs closest to this one (never itself), nearest first. */
export function nearbySuburbs(s: Suburb, n = 4): Suburb[] {
  return SUBURBS.filter((x) => x.slug !== s.slug)
    .map((x) => ({ x, d: distanceKm(s, x) }))
    .sort((a, b) => a.d - b.d || a.x.name.localeCompare(b.x.name))
    .slice(0, n)
    .map((e) => e.x);
}

/** OL-172 (f): the suburb page whose `cities` contains this address city (case-insensitive), if any. */
export function suburbForCity(city: string | null | undefined): Suburb | null {
  if (!city) return null;
  const c = city.trim().toLowerCase();
  return SUBURBS.find((x) => x.cities.some((y) => y.toLowerCase() === c)) ?? null;
}
