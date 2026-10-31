/**
 * OL-241 — operator tools show only when the server would accept them. operatorCapabilities mirrors the
 * route checks (OPERATOR + planHasFeature(plan, 'PROFESSIONAL'); On-Call also needs SMS sending), and the
 * nav hides an item whose capability is off or unknown.
 */
jest.mock('@/lib/prisma', () => ({ prisma: {} }));

import { operatorCapabilities, NO_CAPABILITIES } from '@/lib/operator/capabilities';
import { flattenNav, getNavForRole } from '@/config/navigation';

describe('operatorCapabilities', () => {
  it('a founding operator today (no plan) gets neither tool, whether or not SMS is configured', () => {
    expect(operatorCapabilities('OPERATOR', null, false)).toEqual({ ONCALL: false, SHIFT_AUTOFILL: false });
    expect(operatorCapabilities('OPERATOR', null, true)).toEqual({ ONCALL: false, SHIFT_AUTOFILL: false });
    expect(operatorCapabilities('OPERATOR', 'STARTER' as any, true)).toEqual({ ONCALL: false, SHIFT_AUTOFILL: false });
  });

  it('Professional gets auto-fill; On-Call also needs SMS sending', () => {
    expect(operatorCapabilities('OPERATOR', 'PROFESSIONAL' as any, false)).toEqual({ ONCALL: false, SHIFT_AUTOFILL: true });
    expect(operatorCapabilities('OPERATOR', 'GROWTH' as any, true)).toEqual({ ONCALL: true, SHIFT_AUTOFILL: true });
  });

  it('non-operators and users without an Operator row get nothing (both routes are operator-only)', () => {
    for (const role of ['ADMIN', 'STAFF', 'FAMILY', undefined]) expect(operatorCapabilities(role, 'ENTERPRISE' as any, true)).toEqual(NO_CAPABILITIES);
    expect(operatorCapabilities('OPERATOR', undefined, true)).toEqual(NO_CAPABILITIES);
  });
});

describe('operator nav', () => {
  const hrefs = (role: string, capabilities?: Record<string, boolean>) =>
    flattenNav(getNavForRole(role, { capabilities, marketplaceEnabled: true })).map((i) => i.href);

  it('hides On-Call AI unless ONCALL is on (unknown = hidden)', () => {
    for (const role of ['OPERATOR', 'STAFF', 'ADMIN']) {
      expect(hrefs(role)).not.toContain('/operator/oncall');
      expect(hrefs(role, { ONCALL: false })).not.toContain('/operator/oncall');
    }
    expect(hrefs('OPERATOR', { ONCALL: true })).toContain('/operator/oncall');
  });

  it('keeps Shifts visible either way (the auto-fill panel inside it is gated separately)', () => {
    expect(hrefs('OPERATOR').some((h) => h?.startsWith('/operator/shifts'))).toBe(true);
  });
});
