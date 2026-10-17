/**
 * Municipality → county for the seven Greater Cleveland counties the directory
 * covers (sprint W5-2). Used by the WRAAA waiver import to decide which homes
 * NOT on the list become NOT_ON_LIST (WRAAA's five counties) versus stay
 * UNKNOWN (Summit / Portage — a different Area Agency on Aging).
 *
 * Address.city is free text, so lookups normalize spelling: "Hts" → "heights",
 * "N " → "north", spaces/punctuation removed ("Brookpark" ≡ "Brook Park").
 * A city not in this table → null (left UNKNOWN and counted in the report).
 */

export type NeOhioCounty = 'Cuyahoga' | 'Lake' | 'Geauga' | 'Lorain' | 'Medina' | 'Summit' | 'Portage';

const COUNTY_CITIES: Record<NeOhioCounty, readonly string[]> = {
  Cuyahoga: [
    'Cleveland', 'Bay Village', 'Beachwood', 'Bedford', 'Bedford Heights', 'Bentleyville', 'Berea', 'Bratenahl',
    'Brecksville', 'Broadview Heights', 'Brook Park', 'Brooklyn', 'Brooklyn Heights', 'Chagrin Falls',
    'Cleveland Heights', 'Cuyahoga Heights', 'East Cleveland', 'Euclid', 'Fairview Park', 'Garfield Heights',
    'Gates Mills', 'Glenwillow', 'Highland Heights', 'Highland Hills', 'Hunting Valley', 'Independence', 'Lakewood',
    'Linndale', 'Lyndhurst', 'Maple Heights', 'Mayfield', 'Mayfield Heights', 'Mayfield Village', 'Middleburg Heights',
    'Moreland Hills', 'Newburgh Heights', 'North Olmsted', 'North Randall', 'North Royalton', 'Oakwood', 'Oakwood Village',
    'Olmsted Falls', 'Olmsted Township', 'Orange', 'Orange Village', 'Parma', 'Parma Heights', 'Pepper Pike',
    'Richmond Heights', 'Rocky River', 'Seven Hills', 'Shaker Heights', 'Solon', 'South Euclid', 'Strongsville',
    'University Heights', 'Valley View', 'Walton Hills', 'Warrensville Heights', 'Westlake', 'Woodmere',
  ],
  Lake: [
    'Mentor', 'Willoughby', 'Willoughby Hills', 'Wickliffe', 'Eastlake', 'Painesville', 'Madison', 'Perry', 'Kirtland',
    'Kirtland Hills', 'Mentor-on-the-Lake', 'Mentor on the Lake', 'Fairport Harbor', 'Grand River', 'Timberlake', 'Lakeline',
    'Waite Hill', 'North Perry', 'Concord', 'Concord Township', 'Leroy', 'Leroy Township', 'Painesville Township',
  ],
  Geauga: [
    'Chardon', 'Burton', 'Middlefield', 'Chesterland', 'Chester Township', 'Newbury', 'Newbury Township', 'Bainbridge',
    'Bainbridge Township', 'Thompson', 'Huntsburg', 'Parkman', 'Russell', 'Russell Township', 'Auburn', 'Auburn Township',
    'South Russell', 'Aquilla', 'Munson', 'Munson Township', 'Hambden', 'Claridon', 'Troy Township', 'Montville Township',
  ],
  Lorain: [
    'Lorain', 'Elyria', 'Amherst', 'Avon', 'Avon Lake', 'North Ridgeville', 'Sheffield', 'Sheffield Lake', 'Sheffield Village',
    'Oberlin', 'Wellington', 'Vermilion', 'Grafton', 'LaGrange', 'La Grange', 'Columbia Station', 'Kipton', 'South Amherst',
    'Rochester', 'Eaton Township', 'Carlisle Township', 'Elyria Township', 'Amherst Township',
  ],
  Medina: [
    'Medina', 'Brunswick', 'Wadsworth', 'Lodi', 'Seville', 'Hinckley', 'Valley City', 'Westfield Center', 'Spencer',
    'Chippewa Lake', 'Litchfield', 'Sharon Center', 'Granger', 'York', 'Montville', 'Brunswick Hills', 'Medina Township',
    'Lafayette Township', 'Guilford Township', 'Gloria Glens Park',
  ],
  Summit: [
    'Akron', 'Cuyahoga Falls', 'Stow', 'Hudson', 'Twinsburg', 'Macedonia', 'Northfield', 'Northfield Center',
    'Sagamore Hills', 'Barberton', 'Norton', 'Green', 'Fairlawn', 'Tallmadge', 'Munroe Falls', 'Silver Lake', 'Richfield',
    'Bath', 'Copley', 'Peninsula', 'Boston Heights', 'Reminderville', 'Lakemore', 'Springfield Township', 'Coventry Township',
    'New Franklin', 'Clinton', 'Mogadore',
  ],
  Portage: [
    'Kent', 'Ravenna', 'Streetsboro', 'Aurora', 'Hiram', 'Garrettsville', 'Mantua', 'Windham', 'Brady Lake',
    'Sugar Bush Knolls', 'Rootstown', 'Brimfield', 'Shalersville', 'Freedom', 'Nelson', 'Deerfield', 'Atwater', 'Randolph',
    'Edinburg', 'Palmyra', 'Paris', 'Charlestown', 'Suffield',
  ],
};

/** Canonical key: lowercase, abbreviations expanded, nothing but letters. */
export function cityKey(city: string | null | undefined): string {
  return (city ?? '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\bhts\b/g, 'heights')
    .replace(/\bhgts\b/g, 'heights')
    .replace(/\btwp\b/g, 'township')
    .replace(/\bn\b/g, 'north')
    .replace(/\bs\b/g, 'south')
    .replace(/\be\b/g, 'east')
    .replace(/\bw\b/g, 'west')
    .replace(/\bvlg\b/g, 'village')
    .replace(/\s+/g, '');
}

const CITY_TO_COUNTY: ReadonlyMap<string, NeOhioCounty> = (() => {
  const m = new Map<string, NeOhioCounty>();
  for (const [county, cities] of Object.entries(COUNTY_CITIES) as Array<[NeOhioCounty, readonly string[]]>) {
    for (const c of cities) {
      const k = cityKey(c);
      if (!m.has(k)) m.set(k, county);
    }
  }
  return m;
})();

export function countyForCity(city: string | null | undefined): NeOhioCounty | null {
  const k = cityKey(city);
  if (!k) return null;
  return CITY_TO_COUNTY.get(k) ?? null;
}
