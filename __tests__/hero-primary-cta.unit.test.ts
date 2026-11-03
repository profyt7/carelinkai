/**
 * fix/hero-primary-cta
 *  1. The homepage hero has ONE primary button, "Find Senior Care" → /search (public, no sign-up wall), and a
 *     secondary "Watch the 90-second tour". The duplicate "Get Started — It's Free" is gone from the hero; sign-up
 *     stays further down the page.
 *  2. Listing pages show "Last confirmed <date>" as visible text next to price and availability ("Not yet
 *     confirmed" without a date). Only the community's own confirmation counts.
 */
import fs from 'fs';
import path from 'path';
import { lastConfirmedLabel } from '@/components/ui/LastConfirmed';
import { pricingView } from '@/lib/pricing/pricing';
import { isPublicPage } from '@/lib/routing/public-routes';

const ROOT = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const home = read('src/app/HomePageClient.tsx');
const hero = home.slice(home.indexOf('data-testid="home-hero-headline"'), home.indexOf('{/* Trust indicators */}'));

describe('1. hero CTAs', () => {
  it('one primary button: "Find Senior Care" → /search', () => {
    expect(hero).toMatch(/href="\/search"\s+data-testid="hero-primary-cta"/);
    expect(hero).toContain('Find Senior Care');
    expect(hero.match(/bg-gradient-to-r from-primary-500 to-secondary-500/g)).toHaveLength(1); // one primary style
  });
  it('secondary: "Watch the 90-second tour" → the Get Started panel (only when the tour video exists)', () => {
    expect(hero).toMatch(/\{tourVideo && \([\s\S]*href=\{`#\$\{GET_STARTED_ANCHOR\}`\}\s+data-testid="hero-secondary-cta"[\s\S]*Watch the 90-second tour/);
  });
  it('no sign-up button in the hero; sign-up stays elsewhere on the page', () => {
    expect(hero).not.toContain('Get Started — It&apos;s Free');
    expect(hero).not.toContain('/auth/register');
    expect(hero).not.toContain('Find Care Now');
    expect(home).toContain('href="/auth/register"'); // final CTA "Get Started Free"
    expect(home).toContain('<GetStartedPanel');
  });
  it('/search is public (no sign-in wall)', () => {
    expect(isPublicPage('/search')).toBe(true);
  });
});

describe('2. "Last confirmed" on listing pages', () => {
  it('formats the date, or says "Not yet confirmed"', () => {
    expect(lastConfirmedLabel('2026-10-21T15:00:00.000Z')).toBe('Last confirmed Oct 21, 2026');
    expect(lastConfirmedLabel(null)).toBe('Not yet confirmed');
    expect(lastConfirmedLabel('not a date')).toBe('Not yet confirmed');
  });
  it('a price counts as confirmed only when the community gave it (operator or its QA-approved phone answer)', () => {
    const at = new Date('2026-10-21T15:00:00Z');
    expect(pricingView({ startingPriceMonthly: 4000, priceSource: 'OPERATOR', priceUpdatedAt: at }).confirmedAt).toBe(at.toISOString());
    expect(pricingView({ startingPriceMonthly: 4000, priceSource: 'AI_CALL', priceUpdatedAt: at }).confirmedAt).toBe(at.toISOString());
    expect(pricingView({ startingPriceMonthly: 4000, priceSource: 'OPERATOR', priceUpdatedAt: null }).confirmedAt).toBeNull();
    expect(pricingView({ priceRangeLow: 3500, priceSource: 'PUBLIC', priceUpdatedAt: at }).confirmedAt).toBeNull();
    expect(pricingView({ priceRangeLow: 3500, priceSource: 'DP_ESTIMATE', priceUpdatedAt: at }).confirmedAt).toBeNull();
    expect(pricingView({}).confirmedAt).toBeNull();
  });
  it('the listing panel shows both lines as visible text, and the Pricing section shows the price one', () => {
    const page = read('src/app/homes/[id]/page.tsx');
    expect(page).toContain('<LastConfirmed at={availability.verifiedAt} testId="availability-last-confirmed" />');
    expect(page).toContain('<LastConfirmed at={realHome.pricing?.confirmedAt} testId="price-last-confirmed" />');
    expect(page).toContain('testId="pricing-section-last-confirmed"');
    // Visible: the component is a plain <p>, not sr-only or a title tooltip.
    const comp = read('src/components/ui/LastConfirmed.tsx');
    expect(comp).not.toMatch(/sr-only|title=/);
  });
});
