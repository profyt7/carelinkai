/**
 * Concierge admin-notification email — PHI safety + correct routing.
 *
 * Verifies sendConciergeRequestNotification (the only outbound side effect of a
 * concierge submit) emits a PHI-FREE message to the admin inbox: DP identity +
 * a deep link only, with explicit "details kept in-app / never emailed" language.
 */

const mockSend = jest.fn().mockResolvedValue({ data: { id: 'email_test_1' }, error: null });
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { sendConciergeRequestNotification } from '@/lib/email';

describe('sendConciergeRequestNotification — PHI-free admin alert', () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.ADMIN_NOTIFY_EMAIL = 'chris@getcarelinkai.com';
    delete process.env.CLAIM_NOTIFY_EMAIL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://getcarelinkai.com';
  });

  it('sends to the admin inbox with a deep link and no patient data', async () => {
    const ok = await sendConciergeRequestNotification({
      requestId: 'search-xyz',
      dpName: 'Pat Planner',
      dpOrganization: 'County Hospital',
    });
    expect(ok).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);

    const payload = mockSend.mock.calls[0][0];
    expect(payload.to).toEqual(['chris@getcarelinkai.com']);

    const blob = JSON.stringify(payload);
    // Deep link into the admin concierge queue (where the PHI actually lives).
    expect(blob).toContain('/admin/concierge/search-xyz');
    // DP identity is fine to include (not PHI).
    expect(blob).toContain('Pat Planner');
    // Explicitly tells the admin the details are in-app, not in the email.
    expect(blob.toLowerCase()).toMatch(/in-app|never emailed/);
  });

  it('no-ops safely when RESEND_API_KEY is absent', async () => {
    delete process.env.RESEND_API_KEY;
    const ok = await sendConciergeRequestNotification({ requestId: 's1' });
    expect(ok).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
