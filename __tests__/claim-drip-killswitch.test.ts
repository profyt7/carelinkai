/**
 * Master kill switch for the claim drip (OL-109). Paused by default so a redeploy
 * can never silently resume autonomous outreach; re-enable is one Render env flip.
 */
import { claimDripEnabled } from '@/lib/claim-engine/claim-drip';

describe('claimDripEnabled — paused by default', () => {
  const orig = process.env['CLAIM_DRIP_ENABLED'];
  afterEach(() => { process.env['CLAIM_DRIP_ENABLED'] = orig; });

  it('is OFF when unset', () => {
    delete process.env['CLAIM_DRIP_ENABLED'];
    expect(claimDripEnabled()).toBe(false);
  });

  it('is OFF for empty / falsy values', () => {
    for (const v of ['', '0', 'false', 'no', 'off', 'disabled']) {
      process.env['CLAIM_DRIP_ENABLED'] = v;
      expect(claimDripEnabled()).toBe(false);
    }
  });

  it('is ON only for explicit truthy values', () => {
    for (const v of ['1', 'true', 'TRUE', 'yes', 'on']) {
      process.env['CLAIM_DRIP_ENABLED'] = v;
      expect(claimDripEnabled()).toBe(true);
    }
  });
});
