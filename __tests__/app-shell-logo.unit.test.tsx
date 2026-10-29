/**
 * The signed-in app shell shows the real CareLinkAI logo (not the old "C" square):
 *   - light sidebar / phone header: the homepage header artwork, /images/logo.png;
 *   - navy sidebar: /images/logo-on-dark.png (same artwork, wordmark in white);
 *   - icon rail: the heart mark alone, /images/logo-mark.png.
 * Every logo is next/image with explicit width/height, alt="CareLinkAI", linking to the role home.
 */
import fs from 'fs';
import path from 'path';
import { renderToString } from 'react-dom/server';
import SidebarShell, { BrandMark, type SidebarNavItem } from '@/components/layout/SidebarShell';

const ITEMS: SidebarNavItem[] = [{ id: 'dashboard', label: 'Dashboard', icon: null, href: '/dashboard' }];
const imgs = (html: string) => Array.from(html.matchAll(/<img [^>]*>/g)).map((m) => m[0]);
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe('BrandMark', () => {
  it.each([
    ['navy', false, '/images/logo-on-dark.png', '136', '32'],
    ['light', false, '/images/logo.png', '136', '32'],
    ['navy', true, '/images/logo-mark.png', '32', '32'],
    ['light', true, '/images/logo-mark.png', '32', '32'],
  ] as const)('%s, rail=%s → %s (%sx%s), alt CareLinkAI, links home', (tone, rail, src, w, h) => {
    const html = renderToString(<BrandMark tone={tone} rail={rail} href="/dashboard" />);
    const [img] = imgs(html);
    expect(decodeURIComponent(attr(img, 'src') || '')).toContain(src);
    expect(attr(img, 'alt')).toBe('CareLinkAI');
    expect(attr(img, 'width')).toBe(w);
    expect(attr(img, 'height')).toBe(h);
    expect(html).toMatch(/<a [^>]*href="\/dashboard"/);
    expect(html).not.toMatch(/>C</);
  });

  it("responsive rail renders the mark below lg and the full logo from lg", () => {
    const html = renderToString(<BrandMark tone="navy" rail="responsive" href="/dashboard" />);
    const tags = imgs(html);
    expect(tags).toHaveLength(2);
    expect(decodeURIComponent(attr(tags[0], 'src') || '')).toContain('/images/logo-mark.png');
    expect(attr(tags[0], 'class')).toContain('lg:hidden');
    expect(decodeURIComponent(attr(tags[1], 'src') || '')).toContain('/images/logo-on-dark.png');
    expect(attr(tags[1], 'class')).toContain('hidden lg:block');
  });

  it('SidebarShell uses it everywhere (sidebar, mobile bar), linked to homeHref', () => {
    const html = renderToString(
      <SidebarShell tone="navy" items={ITEMS} activeId="dashboard" homeHref="/dashboard">
        <p>content</p>
      </SidebarShell>,
    );
    expect(html).not.toMatch(/aria-hidden="true">\s*C\s*</);
    expect((html.match(/data-testid="app-logo"/g) || []).length).toBeGreaterThanOrEqual(2);
    for (const img of imgs(html)) expect(attr(img, 'alt')).toBe('CareLinkAI');
  });
});

describe('logo assets and remaining placeholders', () => {
  it('the derived assets exist next to the source logo', () => {
    for (const f of ['logo.png', 'logo-on-dark.png', 'logo-mark.png']) {
      expect(fs.existsSync(path.join(process.cwd(), 'public/images', f))).toBe(true);
    }
  });

  it('no in-app component still renders the "C" placeholder square', () => {
    const files = [
      'src/components/layout/SidebarShell.tsx',
      'src/components/layout/DashboardLayout.tsx',
      'src/components/pwa/InstallPrompt.tsx',
      'src/app/auth/register/page.tsx',
    ];
    for (const f of files) expect(fs.readFileSync(path.join(process.cwd(), f), 'utf8')).not.toMatch(/>\s*C\s*<\/span>/);
  });

  it('/auth/verify no longer points at the missing /logo.svg or /logo-white.svg', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/app/auth/verify/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\/logo(-white)?\.svg/);
  });
});
