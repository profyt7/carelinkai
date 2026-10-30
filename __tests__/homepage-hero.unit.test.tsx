/**
 * Pre-launch homepage + brand consistency (PR A). These fail if:
 *   - the hero brings back a stock photo of faces or the made-up "Perfect Match Found /
 *     Sunshine Valley Care / 5★" card;
 *   - the trust panel loses one of its three facts, or its "Verified" window drifts from
 *     AVAILABILITY_FRESH_DAYS (the rule the listing badge uses);
 *   - the share image stops matching the size every page declares (1200×630);
 *   - an installed-app surface (manifest, offline page, install/push copy) spells the brand
 *     "CareLink AI", draws the old "C" tile, or uses the old theme blue.
 */
import fs from 'fs';
import path from 'path';
import { renderToString } from 'react-dom/server';
import sharp from 'sharp';
import HomePageClient from '@/app/HomePageClient';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const hero = (html: string) => html.slice(Math.max(0, html.indexOf('data-testid="home-hero-headline"') - 4000), html.indexOf('data-testid="hero-trust-panel"') + 4000);

describe('homepage hero', () => {
  const html = renderToString(<HomePageClient />);

  it('the hero photo shows no faces (people walking away), has real alt text and carries the trust panel', () => {
    const src = read('src/app/HomePageClient.tsx');
    const visual = src.slice(src.indexOf('data-testid="hero-visual"'), src.indexOf('</aside>', src.indexOf('data-testid="hero-visual"')));
    expect(visual).toContain('src="/images/hero-bg.jpg"');
    expect(visual).toMatch(/alt="Two older men walking side by side on a sunlit park path, one using a walker"/);
    expect(visual).toContain('data-testid="hero-trust-panel"');
  });

  it('has no stock photo of faces and no made-up match card', () => {
    expect(read('src/app/HomePageClient.tsx')).not.toContain('/images/hero-bg2.jpg');
    for (const fake of ['Perfect Match Found', 'Sunshine Valley', '5★', 'AI Matched', 'HIPAA Secure']) expect(html).not.toContain(fake);
  });

  it('shows the three-fact trust panel next to the headline', () => {
    const h = hero(html);
    expect(h).toContain('data-testid="hero-trust-panel"');
    expect(h).toContain('What we verify');
    for (const t of ['Licensed by ODH', 'State inspection facts', 'Verified availability']) expect(h).toContain(t);
    expect(h).toContain('No grades, no paid rankings.');
  });

  it('"Verified" availability uses the same window as the listing badge', () => {
    const avail = read('src/lib/availability/availability.ts').match(/export const AVAILABILITY_FRESH_DAYS = (\d+);/)![1];
    const homeDays = read('src/app/HomePageClient.tsx').match(/const VERIFIED_AVAILABILITY_DAYS = (\d+);/)![1];
    expect(homeDays).toBe(avail);
    expect(html).toContain(`confirmed them with us in the last ${avail} days`);
  });

  it('keeps the headline, subhead and both CTAs', () => {
    expect(html).toContain('data-testid="home-hero-headline"');
    expect(html).toContain('data-testid="home-hero-subhead"');
    expect(html).toContain('href="/auth/register"');
    expect(html).toContain('href="/search"');
  });
});

describe('brand consistency', () => {
  it('the share image is really 1200×630 (what every page declares)', async () => {
    for (const f of ['public/images/og-image.jpg', 'public/images/twitter-image.jpg']) {
      const m = await sharp(path.join(process.cwd(), f)).metadata();
      expect({ f, w: m.width, h: m.height }).toEqual({ f, w: 1200, h: 630 });
    }
    expect(read('src/app/layout.tsx')).toMatch(/url: "\/images\/og-image\.jpg",\s*width: 1200,\s*height: 630/);
  });

  it.each([
    'public/manifest.json', 'public/offline.html', 'public/sw.js', 'src/components/pwa/InstallPrompt.tsx', 'src/components/pwa/PWAInstallButton.tsx',
    'src/components/pwa/PWAManager.tsx', 'src/components/pwa/PWAPushTest.tsx', 'src/app/api/push/subscribe/route.ts', 'src/app/settings/pwa/page.tsx',
  ])('%s spells the brand "CareLinkAI"', (f) => {
    expect(read(f)).not.toContain('CareLink AI');
  });

  it('the offline page shows the heart mark (precached), not the "C" tile', () => {
    const off = read('public/offline.html');
    expect(off).not.toMatch(/<span>C<\/span>/);
    expect(off).toContain('src="/icons/icon-192x192.png"');
    expect(read('public/sw.js')).toContain("'/icons/icon-192x192.png'");
  });

  it('installed-app theme colour is the brand blue everywhere', () => {
    expect(JSON.parse(read('public/manifest.json')).theme_color).toBe('#3978FC');
    expect(read('src/app/layout.tsx')).toContain('themeColor: "#3978FC"');
    expect(read('public/offline.html')).toContain('<meta name="theme-color" content="#3978FC">');
  });

  it('transactional emails embed no images (text-only brand, by design)', () => {
    for (const f of ['src/lib/email.ts', 'src/lib/email-templates.ts', 'src/lib/notifications/tour-notifications.ts', 'src/lib/email/inquiry-email-service.ts', 'src/lib/concierge/facility-response.ts', 'src/lib/availability/ping.ts']) {
      expect(read(f)).not.toMatch(/<img\s[^>]*src=/);
    }
  });
});
