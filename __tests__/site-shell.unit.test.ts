/**
 * OL-171 — one brand shell on every public page:
 *  - /cleveland(/*) and /concierge render through SiteShell (layouts), /search and
 *    /homes/[id] (anonymous) through PublicShell → the same SiteHeader / SiteFooter;
 *  - the header carries the homepage logo linking to /, the five nav items in order
 *    and Log in, with ZERO client JS (server components, native <details> menu);
 *  - pages under the shell never render a second <main> (the root layout owns it);
 *  - copy rules hold on the shell: no "AI" pitch, no outcome / savings promises,
 *    no facility fee.
 */
import fs from 'fs';
import path from 'path';
import { SITE_NAV } from '@/components/site/SiteHeader';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

const SHELL_PAGES = [
  'src/app/cleveland/page.tsx',
  'src/app/cleveland/assisted-living/page.tsx',
  'src/app/cleveland/assisted-living/[suburb]/page.tsx',
  'src/app/cleveland/memory-care/page.tsx',
  'src/app/cleveland/independent-living/page.tsx',
  'src/app/cleveland/nursing-homes/page.tsx',
  'src/app/cleveland/home-care-agencies/page.tsx',
  'src/app/concierge/page.tsx',
];

describe('OL-171 brand shell', () => {
  it('the /cleveland and /concierge layouts use SiteShell; PublicShell (search, listing) uses the same header + footer', () => {
    expect(read('src/app/cleveland/layout.tsx')).toMatch(/<SiteShell>/);
    expect(read('src/app/concierge/layout.tsx')).toMatch(/<SiteShell>/);
    const pub = read('src/components/layout/PublicShell.tsx');
    expect(pub).toMatch(/<SiteHeader \/>/);
    expect(pub).toMatch(/<SiteFooter \/>/);
  });
  it('header: homepage logo → /, nav Find care · Cleveland · Family Concierge · For care homes, phone, Log in', () => {
    expect(SITE_NAV.map((l) => l.label)).toEqual(['Find care', 'Cleveland', 'Family Concierge', 'For care homes']);
    const h = read('src/components/site/SiteHeader.tsx');
    expect(h).toMatch(/<Link href="\/"[^>]*data-testid="site-logo"/);
    expect(h).toContain('src="/images/logo.png"');
    expect(h).toMatch(/href=\{CONTACT_PHONE_TEL\}/);
    expect(h).toMatch(/href="\/auth\/login"[^>]*>\s*Log in/);
  });
  it('header, footer, shell and hero ship no client JS', () => {
    for (const f of ['SiteHeader', 'SiteFooter', 'SiteShell', 'BrandHero']) {
      const src = read(`src/components/site/${f}.tsx`);
      expect({ f, client: /['"]use client['"]/.test(src), state: /useState|useEffect|onClick=/.test(src) }).toEqual({ f, client: false, state: false });
    }
    expect(read('src/components/site/SiteHeader.tsx')).toContain('<details');
  });
  it('pages under the shell render no second <main> and no page-level <footer>; hero band + brand buttons are used', () => {
    for (const f of SHELL_PAGES) {
      const src = read(f);
      expect({ f, main: /<main[\s>]/.test(src), footer: /<footer[\s>]/.test(src) }).toEqual({ f, main: false, footer: false });
    }
    for (const f of SHELL_PAGES.filter((p) => p.startsWith('src/app/cleveland'))) {
      const src = read(f);
      expect({ f, hero: /HERO_BAND/.test(src), btn: /BTN_PRIMARY/.test(src), oldBtn: /bg-primary-600 text-white/.test(src) }).toEqual({ f, hero: true, btn: true, oldBtn: false });
    }
  });
  it('copy rules on the shell: no "AI" pitch, no outcome / savings promise, no facility fee', () => {
    for (const f of ['src/components/site/SiteHeader.tsx', 'src/components/site/SiteFooter.tsx']) {
      const text = read(f).replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\//g, '');
      expect({ f, ai: /\bAI\b(?!["'])|AI-powered/i.test(text.replace(/CareLinkAI/g, '')) }).toEqual({ f, ai: false });
      expect(text).not.toMatch(/save you|guarantee|placement fee|referral fee|move-in fee|we will find/i);
    }
  });
});
