/**
 * Claim-drip email copy (OL-109 approved). Guards the rules that must hold:
 *  - 2 touches, honest PROACTIVE framing — NEVER fabricates a specific family inquiry.
 *  - Named-human sender (chris@), reply-to a monitored inbox.
 *  - CAN-SPAM footer (unsubscribe link + postal address) always present.
 *  - The "a family asked" line appears ONLY in the reserved real-inquiry variant.
 */

const mockSend = jest.fn().mockResolvedValue({ data: { id: 'email_test' }, error: null });
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { sendClaimDripEmail } from '@/lib/email';

const base = {
  facilityName: 'Pleasant Pointe',
  toEmail: 'teresa@pleasantviewhealthcare.com',
  claimUrl: 'https://getcarelinkai.com/auth/register?role=OPERATOR&claimToken=tok',
  unsubscribeUrl: 'https://getcarelinkai.com/api/outreach/unsubscribe?token=u',
  postalAddress: '1234 Main St, Cleveland, OH 44114',
  city: 'Barberton',
};

beforeEach(() => {
  mockSend.mockClear();
  process.env.RESEND_API_KEY = 're_test';
  process.env.OUTREACH_REPLY_TO = 'chris@getcarelinkai.com';
  process.env.NEXT_PUBLIC_APP_URL = 'https://getcarelinkai.com';
});

function payloadFor(over: Record<string, unknown>) {
  return mockSend.mock.calls[0][0] as { from: string; replyTo: string; subject: string; text: string; html: string; headers: Record<string, string> };
  void over;
}

describe('sendClaimDripEmail — approved copy (OL-109)', () => {
  it('touch 1 is proactive and never fabricates an inquiry; named sender + CAN-SPAM footer', async () => {
    const ok = await sendClaimDripEmail({ ...base, touch: 1 });
    expect(ok).toBe(true);
    const p = payloadFor({});
    // Named-human sender from chris@, reply-to monitored inbox.
    expect(p.from).toContain('chris@getcarelinkai.com');
    expect(p.from.toLowerCase()).toContain('chris');
    expect(p.replyTo).toBe('chris@getcarelinkai.com');
    // Honest demand framing — must NOT claim a specific family asked/inquired.
    expect(p.text.toLowerCase()).not.toContain('a family asked');
    expect(p.text.toLowerCase()).not.toContain('a family just used carelinkai to ask');
    expect(p.text).toContain('Pleasant Pointe');
    expect(p.subject.length).toBeGreaterThan(0);
    // CAN-SPAM: unsubscribe + postal in the footer, plus List-Unsubscribe header.
    expect(p.text).toContain(base.unsubscribeUrl);
    expect(p.text).toContain(base.postalAddress);
    expect(p.headers['List-Unsubscribe']).toContain(base.unsubscribeUrl);
  });

  it('touch 2 is a soft follow-up, still no fabricated inquiry', async () => {
    await sendClaimDripEmail({ ...base, touch: 2 });
    const p = payloadFor({});
    expect(p.subject.toLowerCase()).toContain('still taking new residents');
    expect(p.text.toLowerCase()).not.toContain('a family asked');
    expect(p.text).toContain(base.unsubscribeUrl);
  });

  it('reserved real-inquiry variant (opt-in only) uses the "a family asked" subject', async () => {
    await sendClaimDripEmail({ ...base, touch: 1, realInquiry: true });
    const p = payloadFor({});
    expect(p.subject).toBe('A family asked about Pleasant Pointe');
    expect(p.text.toLowerCase()).toContain('a family just used carelinkai to ask');
  });

  it('falls back gracefully when first name / city are missing', async () => {
    await sendClaimDripEmail({ ...base, city: null, touch: 1 });
    const p = payloadFor({});
    expect(p.text.startsWith('Hi there,')).toBe(true);
    expect(p.text).toContain('your area'); // city fallback
  });
});
