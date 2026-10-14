/**
 * Sprint W4 0b — targeted claim re-send list (LIST ONLY):
 *  - registered addresses are dropped, suppressed addresses are dropped (and counted);
 *  - warm leads (Pleasant Pointe, Eliza Jennings) sort first, then clicked-never-registered;
 *  - each row carries a freshly minted /claim?token= link that verifies, with
 *    the cohort preserved when the home carried one;
 *  - CSV has the admin columns and escapes commas.
 */

import { buildResendRows, isWarmLead, resendListToCsv, type ResendInput } from '@/lib/claim-engine/resend-list';
import { verifyClaimToken } from '@/lib/claim-token';

const SECRET = 'test-secret';
const NOW = new Date('2026-10-14T12:00:00Z').getTime();
const d = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000);

const input = (over: Partial<ResendInput> & Pick<ResendInput, 'homeId' | 'name' | 'outreachEmail'>): ResendInput => ({
  city: 'Cleveland',
  claimNudgeLastSentAt: d(5),
  cohort: null,
  registered: false,
  suppressed: false,
  clickedAt: null,
  ...over,
});

describe('buildResendRows', () => {
  const inputs: ResendInput[] = [
    input({ homeId: 'h-reg', name: 'Registered Manor', outreachEmail: 'reg@x.com', registered: true }),
    input({ homeId: 'h-sup', name: 'Unsubscribed Home', outreachEmail: 'sup@x.com', suppressed: true }),
    input({ homeId: 'h-old', name: 'Old Nudge Home', outreachEmail: 'old@x.com', claimNudgeLastSentAt: d(40) }),
    input({ homeId: 'h-click', name: 'Clicked Home', outreachEmail: 'Click@X.com', clickedAt: d(2) }),
    input({ homeId: 'h-warm', name: 'Pleasant Pointe', outreachEmail: 'teresa@pp.com', claimNudgeLastSentAt: d(60), cohort: 'CLEVELAND_AGENCIES' }),
    input({ homeId: 'h-warm2', name: 'Eliza Jennings Home', outreachEmail: 'l@ej.org' }),
    input({ homeId: 'h-new', name: 'Recent Home', outreachEmail: 'new@x.com', claimNudgeLastSentAt: d(1), cohort: 'NOT_A_COHORT' }),
  ];
  const list = buildResendRows(inputs, SECRET, NOW);

  it('drops registered + suppressed and counts everything', () => {
    expect(list.rows.map((r) => r.homeId)).not.toContain('h-reg');
    expect(list.rows.map((r) => r.homeId)).not.toContain('h-sup');
    expect(list.counts).toEqual({ nudged: 7, registered: 1, suppressed: 1, listed: 5, warm: 2, clicked: 1 });
  });

  it('warm leads first, then clicked-never-registered, then most recent nudge', () => {
    // Warm first (newest nudge first within the tier), then clicked, then newest nudge.
    expect(list.rows.map((r) => r.homeId)).toEqual(['h-warm2', 'h-warm', 'h-click', 'h-new', 'h-old']);
    expect(list.rows[0].warm).toBe(true);
    expect(list.rows[1].warm).toBe(true);
    expect(list.rows[2]).toMatchObject({ clicked: true, clickedAt: d(2).toISOString(), contactEmail: 'click@x.com' });
  });

  it('mints a verifying 45-day link per row and preserves a real cohort only', () => {
    for (const r of list.rows) {
      const token = decodeURIComponent(r.claimLink.split('token=')[1]);
      const payload = verifyClaimToken(token, SECRET);
      expect(payload).toMatchObject({ operatorEmail: r.contactEmail, homeId: r.homeId, clevelandFounder: true });
      expect(r.claimLink).toMatch(/\/claim\?token=/);
    }
    const warm = list.rows.find((r) => r.homeId === 'h-warm')!;
    expect(warm.cohort).toBe('CLEVELAND_AGENCIES');
    expect(verifyClaimToken(decodeURIComponent(warm.claimLink.split('token=')[1]), SECRET)?.cohort).toBe('CLEVELAND_AGENCIES');
    expect(list.rows.find((r) => r.homeId === 'h-new')!.cohort).toBeNull();
    expect(list.rows[0].expiresAt).toBe(new Date(NOW + 45 * 86_400_000).toISOString());
  });

  it('isWarmLead matches the two VA warm leads loosely', () => {
    expect(isWarmLead('Pleasant Pointe Senior Living')).toBe(true);
    expect(isWarmLead('ELIZA JENNINGS')).toBe(true);
    expect(isWarmLead('Maple Grove')).toBe(false);
  });

  it('CSV has the admin columns and escapes commas/quotes', () => {
    const csv = resendListToCsv(buildResendRows([input({ homeId: 'h1', name: 'Home, "The Best"', outreachEmail: 'a@b.co' })], SECRET, NOW));
    const [header, row] = csv.trim().split('\n');
    expect(header).toBe('facility,city,contact_email,nudge_sent_at,clicked,clicked_at,warm_lead,cohort,claim_link,link_expires_at');
    expect(row.startsWith('"Home, ""The Best""",Cleveland,a@b.co,')).toBe(true);
    expect(row).toContain(',no,,no,,');
  });
});
