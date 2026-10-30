/**
 * Truth fixes from the product-tour screenshots (OL-243):
 *  - operator dashboard: "2 new inquiries" (was "inquirys"); occupancy is labeled as listing-reported
 *    beds, apart from resident records;
 *  - family "Rides" (nav) / "My Rides" (dashboard) only while RIDES_PAYMENTS is on; providers keep /rides.
 */
import { getNavForRole } from '@/config/navigation';
import { newInquiryLabel } from '@/components/operator/OperatorDashboardPage';
import type { NavItem } from '@/config/navigation/types';

const hrefs = (items: NavItem[]): string[] => items.flatMap((i) => [i.href ?? '', ...hrefs(i.children ?? [])]).filter(Boolean);

describe('operator dashboard copy', () => {
  it('pluralizes "new inquiry" correctly', () => {
    expect(newInquiryLabel(1)).toBe('new inquiry');
    expect(newInquiryLabel(2)).toBe('new inquiries');
    expect(newInquiryLabel(0)).toBe('new inquiries');
  });
});

describe('family rides follow RIDES_PAYMENTS', () => {
  it('FAMILY nav: no /rides while RIDES_PAYMENTS is off; back with it on', () => {
    expect(hrefs(getNavForRole('FAMILY', { paidFeatures: {} }))).not.toContain('/rides');
    expect(hrefs(getNavForRole('FAMILY', { paidFeatures: { RIDES_PAYMENTS: true } }))).toContain('/rides');
  });
  it('PROVIDER nav keeps /rides (dispatch) whatever the flag', () => {
    expect(hrefs(getNavForRole('PROVIDER', { paidFeatures: {} }))).toContain('/rides');
  });
});
