/** The admin concierge-tour email says which kind of listing it is, and is marked [TEST] for demo/test. */
import { jest } from '@jest/globals';

const sent: any[] = [];
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn(async (a: any) => { sent.push(a); return { data: { id: 'em_1' }, error: null }; }) } })) }));
jest.mock('@/lib/email/suppression', () => ({ filterSuppressed: async (to: string[]) => ({ allowed: to, suppressed: [] }) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { sendConciergeTourNotification } from '@/lib/email';

beforeAll(() => { process.env.RESEND_API_KEY = 're_dummy'; process.env.ADMIN_NOTIFY_EMAIL = 'admin@example.com'; });
beforeEach(() => { sent.length = 0; });

const send = async (over: Record<string, unknown>) => {
  await sendConciergeTourNotification({ requestId: 'ps-1', facilityName: 'Lakeview', claimed: true, ...over } as any);
  expect(sent).toHaveLength(1);
  return sent[0] as { subject: string; text: string };
};

describe('sendConciergeTourNotification subject', () => {
  it('claimed', async () => expect((await send({})).subject).toBe('Concierge tour request (claimed listing) — Lakeview'));
  it('unclaimed', async () => expect((await send({ claimed: false })).subject).toBe('Concierge tour request (unclaimed listing) — Lakeview'));
  it('demo listing → [TEST], nobody contacted', async () => {
    const m = await send({ claimed: false, demoListing: true });
    expect(m.subject).toBe('[TEST] Concierge tour request (demo listing) — Lakeview');
    expect(m.text).toContain('no operator or facility was contacted');
  });
  it('test request → [TEST]', async () => {
    const m = await send({ isTest: true });
    expect(m.subject.startsWith('[TEST] ')).toBe(true);
    expect(m.text).toContain('TEST request');
  });
});
