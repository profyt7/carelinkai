/**
 * Pre-launch leftovers. These fail if:
 *   - the caregiver profile shows the "$99 marketplace access fee" line without MARKETPLACE_HIRE_FEE_ENABLED;
 *   - the listing map stops isolating Leaflet's z-indexes (its attribution painted over the sticky header at 390).
 * The /settings/family/billing → /settings/family redirect is covered in retire-family-plus.unit.test.ts.
 */
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('caregiver profile hire-fee line', () => {
  const src = read('src/app/marketplace/caregivers/[id]/page.tsx');

  it('renders only inside the MARKETPLACE_HIRE_FEE branch', () => {
    const at = src.indexOf('$99 marketplace access fee applies on Starter');
    expect(at).toBeGreaterThan(-1);
    expect(src.split('$99 marketplace access fee').length - 1).toBe(1);
    const gate = src.lastIndexOf("isPaidFeatureEnabled('MARKETPLACE_HIRE_FEE')", at);
    expect(gate).toBeGreaterThan(-1);
    expect(at - gate).toBeLessThan(400);
    expect(src.slice(at, at + 200)).toMatch(/\) : null\}/);
  });

  it('the flag reads MARKETPLACE_HIRE_FEE_ENABLED, off by default', async () => {
    const { isPaidFeatureEnabled, PAID_FEATURES } = await import('@/lib/billing/paid-features');
    expect(PAID_FEATURES.MARKETPLACE_HIRE_FEE.env).toBe('MARKETPLACE_HIRE_FEE_ENABLED');
    const old = process.env.MARKETPLACE_HIRE_FEE_ENABLED;
    delete process.env.MARKETPLACE_HIRE_FEE_ENABLED;
    expect(isPaidFeatureEnabled('MARKETPLACE_HIRE_FEE')).toBe(false);
    process.env.MARKETPLACE_HIRE_FEE_ENABLED = '1';
    expect(isPaidFeatureEnabled('MARKETPLACE_HIRE_FEE')).toBe(true);
    if (old === undefined) delete process.env.MARKETPLACE_HIRE_FEE_ENABLED;
    else process.env.MARKETPLACE_HIRE_FEE_ENABLED = old;
  });
});

describe('listing map stacking', () => {
  it('the map wrapper is its own stacking context (isolate), so Leaflet layers stay under the header', () => {
    expect(read('src/components/search/SimpleMap.tsx')).toContain('className="relative isolate h-full w-full"');
    expect(read('src/components/site/SiteHeader.tsx')).toMatch(/<header className="sticky top-0 z-40/);
  });
});
