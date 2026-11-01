/**
 * OL-257 — no public page claims home care agency listings while there are none. The directory has no agency
 * listing type yet (CARE_TYPE_PLAN['home-care-agencies'].level is null; live count 0 on 11/01), so
 * /cleveland/home-care-agencies is a guide (in-home aides, PASSPORT, choosing an agency) plus "list your agency
 * free". Agency-facing invitations ("claim your agency listing", "list your agency free") are fine; claims to
 * families that agency listings exist ("Verified listings for … home care agencies", "agency listings", "browse
 * home care agencies") are not. The scan strips code comments and allows an explicit negation ("no agency
 * listings yet"). When agencies become a listing type, this test relaxes on its own.
 */
import fs from 'fs';
import path from 'path';
import { CARE_TYPE_PLAN } from '@/lib/directory/care-type-listings';
import { PAGE_META } from '@/lib/seo/page-meta';
import { buildOrganizationJsonLd } from '@/lib/seo/jsonld';

const ROOT = path.join(__dirname, '..');
const agencyListingsExist = CARE_TYPE_PLAN['home-care-agencies'].level !== null;

const CLAIM = /(verified|browse|search|compare|find|top|best)\b[^.\n'"`]{0,40}home[- ]care agenc(y|ies)|home[- ]care agenc(y|ies)\s+(listings?|near you|in our directory)|\bagency listings\b|listings? (for|of) [^.\n]{0,30}home[- ]care agenc/gi;
const NEGATED = /\b(no|not|not as searchable)\s+$/i;

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

/** Public, family-facing sources: every route outside the signed-in / admin areas, the site chrome and SEO copy. */
function publicSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (/^(api|admin|operator|settings|dashboard|caregiver|family|discharge-planner|affiliate|provider|messages|design-preview)$/.test(e.name)) continue;
        walk(p);
      } else if (/\.(tsx?|txt)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
    }
  };
  walk(path.join(ROOT, 'src/app'));
  for (const d of ['src/components/site', 'src/lib/seo']) walk(path.join(ROOT, d));
  return out;
}

function claims(text: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(CLAIM)) {
    if (NEGATED.test(text.slice(Math.max(0, m.index! - 24), m.index!))) continue;
    hits.push(text.slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 20).replace(/\s+/g, ' '));
  }
  return hits;
}

describe('home care agencies: a guide, not listings (while the agency count is 0)', () => {
  it('the directory has no agency listing type yet (if this flips, agency listings exist and the checks below relax)', () => {
    expect(agencyListingsExist).toBe(false);
  });

  it('the pattern catches the claims this PR removed (so the scan is not vacuous)', () => {
    expect(claims('Verified listings for Cleveland home care agencies — in front of families')).toHaveLength(1);
    expect(claims("In-home aides, Ohio’s PASSPORT waiver, agency listings")).toHaveLength(1);
    expect(claims('Browse home care agencies near you')).toHaveLength(1);
    expect(claims('Claim your agency listing. Home care agencies: list your agency free.')).toEqual([]);
    expect(claims('agencies can list free; no agency listings yet')).toEqual([]);
  });

  it('no public page, share image, footer, sitemap note or SEO copy claims agency listings', () => {
    if (agencyListingsExist) return;
    const found = publicSources().flatMap((f) => claims(stripComments(fs.readFileSync(f, 'utf8'))).map((c) => `${path.relative(ROOT, f)}: ${c}`));
    expect(found).toEqual([]);
  });

  it('the page metadata and the Organization JSON-LD describe a guide', () => {
    const meta = PAGE_META.homeCareAgencies;
    expect(meta.path).toBe('/cleveland/home-care-agencies');
    expect(meta.description).toBe('A guide to home care in Greater Cleveland: in-home aides, Ohio’s PASSPORT waiver and choosing an agency. Home care agencies: list your agency free.');
    expect(claims(meta.description)).toEqual([]);
    expect(JSON.stringify(buildOrganizationJsonLd({ includeFeeModel: false }))).not.toMatch(/home care agenc/i);
  });

  it('homepage: the caregiver-hire lines describe what is live (post a job free), not "home care families"', () => {
    // 11/01: 56 visible caregiver profiles, ~0 real (seeded / test), so no claim that families can pick from aides.
    const home = fs.readFileSync(path.join(ROOT, 'src/app/HomePageClient.tsx'), 'utf8');
    expect(home).not.toMatch(/home care families|families managing in-home care/i);
    expect(home).toContain('✓ Hiring an aide yourself? Post the job free.');
    expect(home).toContain('Hiring an aide yourself? Post the job free, hire directly, then schedule and track private household shifts in one place.');
  });

  it('the hub card and footer link say "Home care guide" (same URL)', () => {
    const hub = fs.readFileSync(path.join(ROOT, 'src/app/cleveland/page.tsx'), 'utf8');
    const card = hub.slice(hub.indexOf('href="/cleveland/home-care-agencies"'), hub.indexOf('</Link>', hub.indexOf('href="/cleveland/home-care-agencies"')));
    expect(card).toContain('Home care guide');
    expect(card).not.toMatch(/Home care agencies in Cleveland/);
    expect(fs.readFileSync(path.join(ROOT, 'src/components/site/SiteFooter.tsx'), 'utf8')).toContain("{ href: '/cleveland/home-care-agencies', label: 'Home care guide' }");
  });
});
