/**
 * OL-172 — SEO pass on the public pages:
 *  (a) no public page title carries " | CareLinkAI" twice (the root layout's
 *      template adds it once), rendered titles ≤ 60 chars, descriptions 140–155;
 *  (b) og:title / og:description / twitter:card on every public page;
 *  (c) BreadcrumbList / FAQPage builders; FAQ answers come from data, no promises;
 *  (e) 20 suburbs: every one has ≥ 2 licensed homes in the ODH roster, unique
 *      title / description, the fifteen newer ones carry a 120–180 word intro;
 *  (f) each suburb links 4 nearby suburbs; listings link to suburb + hubs.
 */
import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    assistedLivingHome: {
      findUnique: jest.fn(async () => ({
        id: 'h1', name: 'Windsor Heights Assisted Living', status: 'ACTIVE', isDemo: false, description: 'Short.', aiGeneratedDescription: null,
        careLevel: ['ASSISTED', 'MEMORY_CARE'], address: { city: 'Beachwood', state: 'OH', zipCode: '44122', street: '1 Main' }, photos: [],
      })),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
    },
  },
}));

import { SUBURBS, nearbySuburbs, suburbForCity } from '@/lib/directory/suburbs';
import { PAGE_META, TITLE_SUFFIX, renderedTitle } from '@/lib/seo/page-meta';
import { listingBreadcrumb, listingDescription, listingRelatedLinks, listingTitle } from '@/lib/seo/listing-meta';
import { careTypeFaqs, hubFaqs, suburbFaqs } from '@/lib/seo/directory-faq';
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildOrganizationJsonLd } from '@/lib/seo/jsonld';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
const suffixCount = (t: string) => t.split(TITLE_SUFFIX.trim()).length - 1;

function titleOf(m: Metadata): string {
  const t = m.title;
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object' && 'absolute' in t && t.absolute) return t.absolute as string;
  throw new Error('page title must be a plain string so the root template applies once');
}

const STATIC_PAGES: Array<[string, string]> = [
  ['/', 'src/app/page.tsx'],
  ['/cleveland', 'src/app/cleveland/page.tsx'],
  ['/cleveland/assisted-living', 'src/app/cleveland/assisted-living/page.tsx'],
  ['/cleveland/memory-care', 'src/app/cleveland/memory-care/page.tsx'],
  ['/cleveland/independent-living', 'src/app/cleveland/independent-living/page.tsx'],
  ['/cleveland/nursing-homes', 'src/app/cleveland/nursing-homes/page.tsx'],
  ['/cleveland/home-care-agencies', 'src/app/cleveland/home-care-agencies/page.tsx'],
  ['/concierge', 'src/app/concierge/page.tsx'],
  ['/search', 'src/app/search/layout.tsx'],
  ['/contact', 'src/app/contact/page.tsx'],
];

describe('OL-172 (a)(b) titles, descriptions, share cards', () => {
  it.each(STATIC_PAGES)('%s: suffix once, ≤ 60 chars, 140–155 char description, og + twitter', async (_route, file) => {
    const mod = await import(`@/${file.replace(/^src\//, '').replace(/\.tsx$/, '')}`);
    const m: Metadata = mod.metadata;
    const rendered = renderedTitle(titleOf(m));
    expect({ rendered, suffixes: suffixCount(rendered) }).toEqual({ rendered, suffixes: 1 });
    expect(rendered.length).toBeLessThanOrEqual(60);
    const d = String(m.description ?? '');
    expect({ d, len: d.length >= 140 && d.length <= 155 }).toEqual({ d, len: true });
    expect(m.openGraph?.title).toBeTruthy();
    expect(m.openGraph?.description).toBeTruthy();
    expect((m.twitter as { card?: string } | undefined)?.card).toBe('summary_large_image');
  });

  it('PAGE_META never carries the suffix itself', () => {
    for (const [k, v] of Object.entries(PAGE_META)) expect({ k, has: v.title.includes('CareLinkAI') }).toEqual({ k, has: false });
  });

  it('no metadata title anywhere in src/app (outside openGraph / twitter) ends with "| CareLinkAI" — the template would double it', () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/(page|layout)\.tsx?$/.test(e.name) && p !== path.join('src', 'app', 'layout.tsx')) files.push(p);
      }
    };
    walk('src/app');
    const offenders: string[] = [];
    for (const f of files) {
      const src = read(f);
      // Blank out openGraph / twitter objects (their titles are not templated).
      const stripped = src.replace(/(openGraph|twitter)\s*:\s*\{[\s\S]*?\n\s*\},?/g, '');
      for (const m of stripped.matchAll(/\btitle\s*:\s*([`'"])([^`'"\n]*)\1/g)) {
        if (/\|\s*CareLinkAI\s*$/.test(m[2])) offenders.push(`${f}: ${m[2]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('suburb page metadata: suffix once, ≤ 60, 140–155, unique across all suburbs', async () => {
    const { generateMetadata } = await import('@/app/cleveland/assisted-living/[suburb]/page');
    const titles = new Set<string>();
    const descs = new Set<string>();
    for (const s of SUBURBS) {
      const m: Metadata = await generateMetadata({ params: Promise.resolve({ suburb: s.slug }) });
      const rendered = renderedTitle(titleOf(m));
      expect({ slug: s.slug, suffixes: suffixCount(rendered), fits: rendered.length <= 60 }).toEqual({ slug: s.slug, suffixes: 1, fits: true });
      const d = String(m.description);
      expect({ slug: s.slug, len: d.length >= 140 && d.length <= 155 }).toEqual({ slug: s.slug, len: true });
      expect((m.twitter as { card?: string }).card).toBe('summary_large_image');
      titles.add(rendered);
      descs.add(d);
    }
    expect(titles.size).toBe(SUBURBS.length);
    expect(descs.size).toBe(SUBURBS.length);
  });

  it('listing metadata: suffix once, ≤ 60, 140–155, og image falls back to the site default', async () => {
    const { generateMetadata } = await import('@/app/homes/[id]/layout');
    const m: Metadata = await generateMetadata({ params: Promise.resolve({ id: 'h1' }) });
    const rendered = renderedTitle(titleOf(m));
    expect(suffixCount(rendered)).toBe(1);
    expect(rendered.length).toBeLessThanOrEqual(60);
    expect(String(m.description).length).toBeGreaterThanOrEqual(140);
    expect(String(m.description).length).toBeLessThanOrEqual(155);
    expect(JSON.stringify(m.openGraph)).toContain('/images/og-image.jpg');
  });

  it('listingTitle / listingDescription stay in bounds for long names and empty descriptions', () => {
    const long = { name: 'The Very Long Named Assisted Living And Memory Care Community Of Northeast Ohio', city: 'Cuyahoga Falls', state: 'OH', careLevels: ['ASSISTED'] };
    expect(renderedTitle(listingTitle(long)).length).toBeLessThanOrEqual(60);
    for (const l of [long, { name: 'Oak', city: null, careLevels: [] }, { name: 'Elm House', city: 'Parma', state: 'OH', careLevels: ['ASSISTED', 'MEMORY_CARE', 'INDEPENDENT'] }]) {
      const d = listingDescription(l, '');
      expect({ d, ok: d.length >= 140 && d.length <= 155 }).toEqual({ d, ok: true });
    }
    expect(listingDescription(long, 'x'.repeat(400)).length).toBeLessThanOrEqual(155);
  });
});

describe('OL-172 (c) structured data + FAQ', () => {
  it('BreadcrumbList and FAQPage builders', () => {
    const b = buildBreadcrumbJsonLd([{ name: 'Cleveland senior care', path: '/cleveland' }, { name: 'Beachwood', path: '/cleveland/assisted-living/beachwood' }]) as any;
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'Beachwood', item: 'https://getcarelinkai.com/cleveland/assisted-living/beachwood' });
    const faqs = suburbFaqs('Beachwood', ['Beachwood'], { total: 6, acceptingWaiver: 2 });
    const f = buildFaqPageJsonLd(faqs) as any;
    expect(f['@type']).toBe('FAQPage');
    expect(f.mainEntity).toHaveLength(faqs.length);
    expect(f.mainEntity[0].acceptedAnswer.text).toBe(faqs[0]!.a);
  });

  it('every FAQ set has 3–5 entries, uses live counts, and makes no promises', () => {
    const sets = [
      hubFaqs(SUBURBS.length),
      suburbFaqs('Beachwood', ['Beachwood'], { total: 6, acceptingWaiver: 2 }),
      suburbFaqs('Mentor', ['Mentor'], { total: 0, acceptingWaiver: 0 }),
      ...(['assisted-living', 'memory-care', 'independent-living', 'nursing-homes', 'home-care-agencies'] as const).map((t) =>
        careTypeFaqs(t, { label: t, total: 3, acceptingWaiver: 1 }),
      ),
    ];
    for (const set of sets) {
      expect(set.length).toBeGreaterThanOrEqual(3);
      expect(set.length).toBeLessThanOrEqual(5);
      for (const { q, a } of set) {
        expect(`${q} ${a}`).not.toMatch(/\bAI\b|guarantee|we will find|we’ll find|save you|placement fee|referral fee|move-in fee/i);
      }
    }
    expect(suburbFaqs('Beachwood', ['Beachwood'], { total: 6, acceptingWaiver: 2 })[0]!.a).toMatch(/^6 licensed homes/);
    expect(suburbFaqs('Beachwood', ['Beachwood'], { total: 6, acceptingWaiver: 2 })[1]!.a).toContain('2 homes of the 6 listings');
  });

  it('Organization (with the published phone number) is rendered from the root layout on every page', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toMatch(/JSON\.stringify\(buildOrganizationJsonLd\(\{ includeFeeModel: false \}\)\)/);
    // The sitewide copy never carries a price (it renders on /concierge before the payer question).
    const sitewide = JSON.stringify(buildOrganizationJsonLd({ includeFeeModel: false }));
    expect(sitewide).not.toMatch(/\$\s?\d/);
    expect(sitewide).toContain('+12162459482');
    expect(read('src/app/page.tsx')).not.toMatch(/buildOrganizationJsonLd/); // no duplicate on the homepage
  });

  it('every /cleveland/* page emits a BreadcrumbList; hub, care types and suburbs render the FAQ', () => {
    for (const f of [
      'src/app/cleveland/page.tsx',
      'src/app/cleveland/assisted-living/page.tsx',
      'src/app/cleveland/assisted-living/[suburb]/page.tsx',
      'src/app/cleveland/memory-care/page.tsx',
      'src/app/cleveland/independent-living/page.tsx',
      'src/app/cleveland/nursing-homes/page.tsx',
      'src/app/cleveland/home-care-agencies/page.tsx',
    ]) {
      const src = read(f);
      expect({ f, crumb: /buildBreadcrumbJsonLd\(/.test(src), faq: /<FaqSection /.test(src) }).toEqual({ f, crumb: true, faq: true });
    }
  });

  it('each page type has a branded OG + Twitter image route', () => {
    for (const d of ['src/app/cleveland', 'src/app/cleveland/assisted-living', 'src/app/cleveland/assisted-living/[suburb]', 'src/app/cleveland/memory-care', 'src/app/cleveland/independent-living', 'src/app/cleveland/nursing-homes', 'src/app/cleveland/home-care-agencies', 'src/app/concierge']) {
      for (const f of ['opengraph-image.tsx', 'twitter-image.tsx']) expect(fs.existsSync(path.join(root, d, f))).toBe(true);
    }
  });
});

describe('OL-172 (d) care-type hubs list real homes', () => {
  it('memory care / independent living / nursing homes / home care render the listings section with a count (or a named fallback)', () => {
    for (const t of ['memory-care', 'independent-living', 'nursing-homes', 'home-care-agencies']) {
      const src = read(`src/app/cleveland/${t}/page.tsx`);
      expect({ t, section: /<CareTypeListingsSection /.test(src), live: /export const dynamic = 'force-dynamic'/.test(src) }).toEqual({ t, section: true, live: true });
    }
    const section = read('src/components/directory/CareTypeListingsSection.tsx');
    expect(section).toContain('data-testid="listings-count"');
    expect(section).toContain('data-testid="care-type-fallback-note"');
  });
});

describe('OL-172 (e)(f) suburbs', () => {
  // Minimal RFC-4180 split (provider names and addresses may contain quoted commas).
  const splitCsv = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const roster = read('scripts/data/odh_rcf_cleveland_metro_2026_07_04.csv').trim().split('\n').slice(1).map(splitCsv);
  const NEW = ['mentor', 'cuyahoga-falls', 'rocky-river', 'medina', 'hudson', 'north-olmsted', 'avon', 'twinsburg', 'chardon', 'stow', 'lyndhurst', 'mayfield-heights', 'shaker-heights', 'euclid', 'solon'];

  it('20 suburbs (Cleveland Heights skipped: 1 roster home); each has ≥ 2 licensed homes in the ODH roster', () => {
    expect(SUBURBS).toHaveLength(20);
    expect(SUBURBS.map((s) => s.slug)).not.toContain('cleveland-heights');
    for (const s of SUBURBS) {
      const n = roster.filter((r) => s.cities.some((c) => c.toUpperCase() === (r[2] ?? '').trim().toUpperCase())).length;
      expect({ slug: s.slug, enough: n >= 2 }).toEqual({ slug: s.slug, enough: true });
    }
  });

  it('the fifteen newer suburbs each carry a unique 120–180 word intro and real hospital / landmark facts', () => {
    const intros = new Set<string>();
    for (const slug of NEW) {
      const s = SUBURBS.find((x) => x.slug === slug)!;
      expect(s).toBeTruthy();
      const words = s.intro.split(/\s+/).length;
      expect({ slug, words, ok: words >= 120 && words <= 180 }).toEqual({ slug, words, ok: true });
      expect(s.nearby.length).toBeGreaterThanOrEqual(3);
      intros.add(s.intro);
    }
    expect(intros.size).toBe(NEW.length);
  });

  it('every suburb links 4 nearby suburbs (never itself); the page renders them', () => {
    for (const s of SUBURBS) {
      const n = nearbySuburbs(s, 4);
      expect(n).toHaveLength(4);
      expect(n.map((x) => x.slug)).not.toContain(s.slug);
      expect(new Set(n.map((x) => x.slug)).size).toBe(4);
    }
    expect(nearbySuburbs(SUBURBS.find((x) => x.slug === 'beachwood')!, 4).map((x) => x.slug)).toEqual(expect.arrayContaining(['lyndhurst', 'mayfield-heights', 'shaker-heights', 'solon']));
    expect(read('src/app/cleveland/assisted-living/[suburb]/page.tsx')).toContain('data-testid="nearby-suburb"');
  });

  it('listings link back to their suburb page and care-type hubs; breadcrumb includes the suburb', () => {
    expect(suburbForCity('cuyahoga falls')?.slug).toBe('cuyahoga-falls');
    const links = listingRelatedLinks({ name: 'X', city: 'Beachwood', careLevels: ['ASSISTED', 'MEMORY_CARE'] });
    expect(links.suburb?.href).toBe('/cleveland/assisted-living/beachwood');
    expect(links.hubs.map((h) => h.href)).toEqual(['/cleveland/assisted-living', '/cleveland/memory-care']);
    expect(listingRelatedLinks({ name: 'Y', city: 'Nowhere', careLevels: [] })).toEqual({ suburb: null, hubs: [{ label: 'Assisted living in Cleveland', href: '/cleveland/assisted-living' }] });
    expect(listingBreadcrumb({ id: 'h1', name: 'X', city: 'Beachwood', careLevels: ['ASSISTED'] }).map((c) => c.path)).toEqual(['/cleveland', '/cleveland/assisted-living', '/cleveland/assisted-living/beachwood', '/homes/h1']);
    expect(read('src/app/homes/[id]/page.tsx')).toContain('<ListingRelatedLinks');
  });

  it('the sitemap and the hub suburb grids are generated from the registry', () => {
    expect(read('src/app/sitemap.ts')).toMatch(/SUBURBS\.map/);
    expect(read('src/app/cleveland/page.tsx')).toContain('data-testid="suburb-grid"');
    expect(read('src/app/cleveland/assisted-living/page.tsx')).toContain('data-testid="suburb-grid"');
  });
});
