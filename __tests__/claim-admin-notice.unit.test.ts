/**
 * Admin email per listing claim (self-serve PENDING_REVIEW and emailed-link token claims):
 *   - subject "New listing claim: {facility} ({city})"; body has facility, city, claimant name + email,
 *     claim type, time and the admin link (queue for self-serve, listing admin page for a token claim);
 *   - sent once per claim (a second call for the same claim sends nothing);
 *   - test claimants (+cltest@, *.test, carelinkai.com) get no email, but the event is still logged;
 *   - the logged event carries ids/status only (no names or emails);
 *   - the token-claim route calls it once with kind 'token'.
 * No real email: the Resend helper is mocked.
 */
const send = jest.fn(async (_a: any) => ({ data: { id: 'm1' }, error: null }));
jest.mock('@/lib/email', () => ({ guardedResendSend: (a: any) => send(a) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

const events: any[] = [];
jest.mock('@/lib/prisma', () => ({
  prisma: {
    entityEvent: {
      findFirst: jest.fn(async (a: any) => events.find((e) => e.entityId === a.where.entityId && e.eventType === a.where.eventType && e.newValue?.id === a.where.newValue.equals) ?? null),
      create: jest.fn(async (a: any) => { events.push(a.data); return { id: `e${events.length}` }; }),
    },
  },
}));

import { notifyAdminOfListingClaim, isTestClaimant, listingClaimSubject } from '@/lib/claims/claim-admin-notice';

const OLD = process.env;
beforeAll(() => { process.env = { ...OLD, ADMIN_NOTIFY_EMAIL: 'admin-inbox@example.com', NEXT_PUBLIC_APP_URL: 'https://app.example' } as NodeJS.ProcessEnv; });
afterAll(() => { process.env = OLD; });
beforeEach(() => { send.mockClear(); events.length = 0; });

const base = {
  claimKey: 'claim-1', kind: 'self_serve' as const, homeId: 'home-1', facility: 'Pleasant Pointe Assisted Living', city: 'Barberton',
  claimantName: 'Terry Owner', claimantEmail: 'terry@pleasantpointe.example', actor: { userId: 'u1', role: 'OPERATOR' },
  now: new Date('2026-11-15T15:30:00Z'),
};

describe('listing claim admin email', () => {
  it('self-serve: one email to ADMIN_NOTIFY_EMAIL with the agreed subject and body', async () => {
    expect(await notifyAdminOfListingClaim(base)).toBe('sent');
    expect(send).toHaveBeenCalledTimes(1);
    const m = send.mock.calls[0][0];
    expect(m.to).toEqual(['admin-inbox@example.com']);
    expect(m.subject).toBe('New listing claim: Pleasant Pointe Assisted Living (Barberton)');
    for (const part of ['Facility: Pleasant Pointe Assisted Living', 'City: Barberton', 'Claimant: Terry Owner — terry@pleasantpointe.example',
      'Claim type: Self-serve claim — needs your approval', 'Time: Sunday, November 15, 2026 at 10:30 AM ET', 'https://app.example/admin/home-claims']) {
      expect(m.text).toContain(part);
    }
    expect(m.html).toContain('https://app.example/admin/home-claims');
  });

  it('token claim: "claim completed" and a link to the listing admin page', async () => {
    expect(await notifyAdminOfListingClaim({ ...base, claimKey: 'token:home-1:op-1', kind: 'token' })).toBe('sent');
    const m = send.mock.calls[0][0];
    expect(m.text).toContain('Claim type: Emailed claim link — claim completed');
    expect(m.text).toContain('https://app.example/admin/homes/home-1');
  });

  it('is sent once per claim; a different claim on the same home still sends', async () => {
    expect(await notifyAdminOfListingClaim(base)).toBe('sent');
    expect(await notifyAdminOfListingClaim(base)).toBe('duplicate');
    expect(send).toHaveBeenCalledTimes(1);
    expect(await notifyAdminOfListingClaim({ ...base, claimKey: 'claim-2' })).toBe('sent');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it.each(['owner+cltest@gmail.com', 'claim-new@test.carelinkai.test', 'ops@carelinkai.com'])('test claimant %s: no email, event still logged', async (email) => {
    expect(isTestClaimant(email)).toBe(true);
    expect(await notifyAdminOfListingClaim({ ...base, claimantEmail: email })).toBe('skipped_test');
    expect(send).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ entityType: 'LISTING_CLAIM', entityId: 'home-1', eventType: 'claim.admin_notified', newValue: { id: 'claim-1', status: 'PENDING_REVIEW', delivery: 'skipped_test' } });
    // And still only once.
    expect(await notifyAdminOfListingClaim({ ...base, claimantEmail: email })).toBe('duplicate');
  });

  it('the logged event has no names or emails (PHI-safe)', async () => {
    await notifyAdminOfListingClaim(base);
    const json = JSON.stringify(events);
    expect(json).not.toContain('Terry');
    expect(json).not.toContain('@');
    expect(events[0].newValue).toEqual({ id: 'claim-1', status: 'PENDING_REVIEW', delivery: 'email' });
  });

  it('a missing city reads "city unknown"; real operator domains are not test', () => {
    expect(listingClaimSubject('Maple Grove', null)).toBe('New listing claim: Maple Grove (city unknown)');
    expect(isTestClaimant('kfuller@arden-courts.com')).toBe(false);
    expect(isTestClaimant(null)).toBe(false);
  });

  it('a send failure is reported, never thrown', async () => {
    send.mockResolvedValueOnce({ data: null, error: { message: 'boom' } } as any);
    expect(await notifyAdminOfListingClaim(base)).toBe('failed');
  });
});
