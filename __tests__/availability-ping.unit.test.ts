/**
 * Sprint W4-1 — one-tap availability ping:
 *  - parser: bare integer / "none" / "full" → count; STOP words → stop; garbage,
 *    empty and out-of-range → admin review; email reply bodies have quoted
 *    history stripped first;
 *  - email render: the one line, the 0–5 one-tap links, STOP + unsubscribe and
 *    the CAN-SPAM postal address in BOTH text and HTML; no PHI fields;
 *  - run gating: PING_ENABLED unset → disabled, nothing read or written;
 *    unclaimed listings skipped unless opt-in source is admin_call; outstanding
 *    ping / recently verified skipped; SMS-preferred contacts skipped (stub);
 *    no RESEND key → ping row created with delivery=skipped_no_resend (nothing sent).
 */

jest.mock('@/lib/prisma', () => {
  // Sprint W5-1: writes now commit alongside an EntityEvent row inside
  // prisma.$transaction(callback); the mock runs the callback against itself.
  const p: any = {
    availabilityContact: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    availabilityPing: { updateMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    assistedLivingHome: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ availabilityCount: null, availabilityVerifiedAt: null, availabilitySource: null }) },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }), findMany: jest.fn().mockResolvedValue([]) },
  };
  p.$transaction = jest.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[])));
  return { prisma: p };
});
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendAvailabilityPingEmail: jest.fn() }));

import { prisma } from '@/lib/prisma';
import { sendAvailabilityPingEmail } from '@/lib/email';
import {
  PING_EXPIRY_DAYS,
  extractReplyText,
  parsePingReply,
  pingEnabled,
  pingLine,
  renderPingEmail,
  smsPingEnabled,
} from '@/lib/availability/ping';
import { findEligibleContacts, runAvailabilityPing, applyPingReply } from '@/lib/availability/ping-engine';

const findMany = prisma.availabilityContact.findMany as jest.Mock;
const updateMany = prisma.availabilityPing.updateMany as jest.Mock;
const createPing = prisma.availabilityPing.create as jest.Mock;
const updatePing = prisma.availabilityPing.update as jest.Mock;
const sendEmail = sendAvailabilityPingEmail as jest.Mock;

const NOW = new Date('2026-10-13T14:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

function contact(over: Partial<{
  id: string; homeId: string; email: string | null; preferredChannel: 'EMAIL' | 'SMS'; optedInSource: string | null;
  operatorEmail: string; verifiedAt: Date | null; outstanding: boolean; name: string;
}> = {}) {
  const o = {
    id: 'c1', homeId: 'h1', email: 'ops@facility.com', preferredChannel: 'EMAIL' as const, optedInSource: 'operator_portal',
    operatorEmail: 'owner@facility.com', verifiedAt: null, outstanding: false, name: 'Facility One', ...over,
  };
  return {
    id: o.id, homeId: o.homeId, name: 'Pat', email: o.email, mobile: null, preferredChannel: o.preferredChannel, optedInSource: o.optedInSource,
    home: { name: o.name, availabilityVerifiedAt: o.verifiedAt, operator: { user: { email: o.operatorEmail } } },
    pings: o.outstanding ? [{ id: 'p-open' }] : [],
  };
}

afterEach(() => jest.clearAllMocks());

describe('parsePingReply', () => {
  it.each([
    ['3', 3], [' 0 ', 0], ['12', 12], ['2 beds', 2], ['4 openings.', 4], ['1 open', 1],
    ['none', 0], ['None.', 0], ['FULL', 0], ['no', 0], ['zero', 0], ['we are full', 0],
  ])('%p → count %p', (raw, count) => {
    expect(parsePingReply(raw)).toEqual({ kind: 'count', count });
  });

  it.each(['STOP', 'stop', 'Stop.', 'unsubscribe', 'STOPALL', 'opt out', 'remove me', 'cancel'])('%p → stop', (raw) => {
    expect(parsePingReply(raw)).toEqual({ kind: 'stop' });
  });

  it.each(['', '   ', 'maybe 2 next week', 'call me', 'three', '3-4', '9999', 'yes', 'STOP calling, 2 beds'])('%p → admin review', (raw) => {
    expect(parsePingReply(raw).kind).toBe('admin_review');
  });

  it('never throws on null/undefined', () => {
    expect(parsePingReply(null).kind).toBe('admin_review');
    expect(parsePingReply(undefined).kind).toBe('admin_review');
  });
});

describe('extractReplyText', () => {
  it('takes the first own line and drops quoted history / signatures', () => {
    expect(extractReplyText('2\r\n\r\nOn Mon, Oct 13, 2026 CareLinkAI wrote:\r\n> Open beds this week?')).toBe('2');
    expect(extractReplyText('\n\nnone\n--\nPat, Admissions')).toBe('none');
    expect(extractReplyText('> quoted first\n3')).toBe('');
    expect(parsePingReply(extractReplyText('STOP\n\n-----Original Message-----\nFrom: x'))).toEqual({ kind: 'stop' });
  });
});

describe('renderPingEmail (CAN-SPAM)', () => {
  const mail = renderPingEmail({ facilityName: 'Maple Grove', contactName: 'Pat Lee', appUrl: 'https://getcarelinkai.com', token: 'tok123', postalAddress: '123 Main St, Cleveland, OH 44113' });

  it('carries the one line, one-tap links 0–5, STOP + unsubscribe and the postal address in text and html', () => {
    const line = pingLine('Maple Grove');
    expect(line).toBe('Open beds this week at Maple Grove? Reply with a number (0 is fine). Reply STOP to opt out.');
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('Open beds this week at Maple Grove?');
      // HTML attributes carry `&amp;`; text carries a raw `&`.
      for (const n of [0, 1, 2, 3, 4, 5]) expect(body).toMatch(new RegExp(`/availability/ping\\?token=tok123(&|&amp;)reply=${n}\\b`));
      expect(body).toMatch(/\/availability\/ping\?token=tok123(&|&amp;)reply=STOP/);
      expect(body).toContain('/api/availability/ping/unsubscribe?token=tok123');
      expect(body).toContain('123 Main St, Cleveland, OH 44113');
      expect(body).toMatch(/unsubscribe/i);
    }
    expect(mail.subject).toBe('Open beds this week at Maple Grove?');
    expect(mail.unsubscribeUrl).toBe('https://getcarelinkai.com/api/availability/ping/unsubscribe?token=tok123');
    expect(mail.text).toContain('Hi Pat,');
  });

  it('contains no PHI-shaped content', () => {
    expect(mail.html + mail.text).not.toMatch(/resident name|diagnosis|date of birth|DOB/i);
  });
});

describe('flags', () => {
  it('PING_ENABLED / SMS_PING_ENABLED default OFF', () => {
    expect(pingEnabled({})).toBe(false);
    expect(pingEnabled({ PING_ENABLED: '0' })).toBe(false);
    expect(pingEnabled({ PING_ENABLED: '1' })).toBe(true);
    expect(pingEnabled({ PING_ENABLED: 'true' })).toBe(true);
    expect(smsPingEnabled({})).toBe(false);
    expect(smsPingEnabled({ SMS_PING_ENABLED: 'yes' })).toBe(true);
  });
});

describe('findEligibleContacts', () => {
  it('claimed + opted-in + nothing outstanding → eligible; unclaimed only via admin_call; recent/outstanding/SMS-without-mobile rules', async () => {
    findMany.mockResolvedValue([
      contact({ id: 'ok' }),
      contact({ id: 'unclaimed', homeId: 'h2', operatorEmail: 'directory-unclaimed@carelinkai.system' }),
      contact({ id: 'warm', homeId: 'h3', operatorEmail: 'directory-unclaimed@carelinkai.system', optedInSource: 'admin_call' }),
      contact({ id: 'busy', homeId: 'h4', outstanding: true }),
      contact({ id: 'fresh', homeId: 'h5', verifiedAt: daysAgo(1) }),
      contact({ id: 'stale-ok', homeId: 'h6', verifiedAt: daysAgo(7) }),
      contact({ id: 'noemail', homeId: 'h7', email: null }),
    ]);
    const { eligible, skipped } = await findEligibleContacts(NOW);
    expect(eligible.map((e) => e.contactId)).toEqual(['ok', 'warm', 'stale-ok']);
    expect(skipped).toEqual({ unclaimed: 1, outstanding_ping: 1, recently_verified: 1, no_email: 1 });
    // The query itself only ever asks for opted-in contacts of ACTIVE, non-demo homes.
    expect(findMany.mock.calls[0][0].where).toEqual({ optedIn: true, home: { status: 'ACTIVE', isDemo: false } });
  });
});

describe('runAvailabilityPing', () => {
  it('PING_ENABLED unset → disabled, touches nothing', async () => {
    const r = await runAvailabilityPing({ now: NOW, env: {} });
    expect(r.disabled).toBe(true);
    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(createPing).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('enabled: expires stale pings, creates a ping per eligible contact, email only; SMS stubbed; no key → nothing sent', async () => {
    updateMany.mockResolvedValue({ count: 2 });
    findMany.mockResolvedValue([contact({ id: 'e' }), contact({ id: 's', homeId: 'h9', preferredChannel: 'SMS', email: null })]);
    createPing.mockImplementation(async ({ data }: { data: { homeId: string } }) => ({ id: `p-${data.homeId}` }));
    updatePing.mockResolvedValue({});
    sendEmail.mockResolvedValue('skipped_no_resend');
    const r = await runAvailabilityPing({ now: NOW, env: { PING_ENABLED: '1', COMPANY_POSTAL_ADDRESS: '1 Main St', NEXTAUTH_URL: 'http://localhost:3000' } as NodeJS.ProcessEnv });
    expect(r.disabled).toBe(false);
    expect(r.expired).toBe(2);
    expect(updateMany.mock.calls[0][0]).toEqual({ where: { outcome: null, expiresAt: { lt: NOW } }, data: { outcome: 'EXPIRED' } });
    expect(r.eligible).toBe(2);
    // SMS-preferred contact is skipped before a row is created when SMS_PING_ENABLED is unset.
    expect(r.skippedSms).toBe(1);
    expect(createPing).toHaveBeenCalledTimes(1);
    const created = createPing.mock.calls[0][0].data;
    expect(created).toMatchObject({ homeId: 'h1', contactId: 'e', channel: 'EMAIL', sentAt: NOW });
    expect(created.expiresAt.getTime()).toBe(NOW.getTime() + PING_EXPIRY_DAYS * 86_400_000);
    expect(created.token).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(r.sent).toBe(0);
    expect(r.skippedNoResend).toBe(1);
    expect(r.pings).toEqual([{ pingId: 'p-h1', homeId: 'h1', channel: 'EMAIL', delivery: 'skipped_no_resend' }]);
  });

  it('SMS_PING_ENABLED set: still only the stub — no provider call, ping marked skipped_sms_stub', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findMany.mockResolvedValue([contact({ id: 's', homeId: 'h9', preferredChannel: 'SMS', email: null })]);
    createPing.mockResolvedValue({ id: 'p-sms' });
    updatePing.mockResolvedValue({});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = await runAvailabilityPing({ now: NOW, env: { PING_ENABLED: '1', SMS_PING_ENABLED: '1', COMPANY_POSTAL_ADDRESS: '1 Main St' } as NodeJS.ProcessEnv });
    expect(r.pings[0]).toMatchObject({ channel: 'SMS', delivery: 'skipped_sms_stub' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SMS transport not wired'));
    warn.mockRestore();
  });

  it('refuses to email without a postal address (CAN-SPAM) — row kept, delivery=failed', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findMany.mockResolvedValue([contact({ id: 'e' })]);
    createPing.mockResolvedValue({ id: 'p1' });
    updatePing.mockResolvedValue({});
    const r = await runAvailabilityPing({ now: NOW, env: { PING_ENABLED: '1' } as NodeJS.ProcessEnv });
    expect(r.noPostalAddress).toBe(true);
    expect(r.failed).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('applyPingReply', () => {
  const findPing = prisma.availabilityPing.findUnique as jest.Mock;
  const homeUpdate = prisma.assistedLivingHome.update as jest.Mock;
  const open = { id: 'p1', homeId: 'h1', contactId: 'c1', expiresAt: daysAgo(-5), outcome: null, parsedCount: null, home: { name: 'Maple Grove' } };

  it('integer → availability updated with source=PING, ping UPDATED', async () => {
    findPing.mockResolvedValue(open);
    homeUpdate.mockResolvedValue({ availabilityCount: 2, availabilityVerifiedAt: NOW, availabilitySource: 'PING' });
    updatePing.mockResolvedValue({});
    const r = await applyPingReply({ token: 't', raw: '2', via: 'link', now: NOW });
    expect(r).toMatchObject({ ok: true, kind: 'count', count: 2, facilityName: 'Maple Grove' });
    expect(homeUpdate.mock.calls[0][0].data).toMatchObject({ availabilityCount: 2, availabilitySource: 'PING' });
    expect(updatePing.mock.calls[0][0].data).toMatchObject({ outcome: 'UPDATED', parsedCount: 2, replyRaw: '2', replyVia: 'link' });
  });

  it('STOP → contact opted out + ping STOP; garbage → ADMIN_REVIEW with raw kept; closed/expired/unknown refused', async () => {
    findPing.mockResolvedValue(open);
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
    expect(await applyPingReply({ token: 't', raw: 'STOP', via: 'link', now: NOW })).toMatchObject({ ok: true, kind: 'stop' });
    expect(homeUpdate).not.toHaveBeenCalled();

    updatePing.mockResolvedValue({});
    expect(await applyPingReply({ token: 't', raw: 'call me', via: 'email_reply', now: NOW })).toMatchObject({ ok: true, kind: 'admin_review' });
    expect(updatePing.mock.calls.at(-1)![0].data).toMatchObject({ outcome: 'ADMIN_REVIEW', replyRaw: 'call me' });

    findPing.mockResolvedValue({ ...open, outcome: 'UPDATED', parsedCount: 3 });
    expect(await applyPingReply({ token: 't', raw: '1', via: 'link', now: NOW })).toMatchObject({ ok: false, error: 'already_answered', parsedCount: 3 });

    findPing.mockResolvedValue({ ...open, expiresAt: daysAgo(1) });
    expect(await applyPingReply({ token: 't', raw: '1', via: 'link', now: NOW })).toMatchObject({ ok: false, error: 'expired' });
    expect(updatePing.mock.calls.at(-1)![0].data).toEqual({ outcome: 'EXPIRED' });

    findPing.mockResolvedValue(null);
    expect(await applyPingReply({ token: 'nope', raw: '1', via: 'link', now: NOW })).toEqual({ ok: false, error: 'invalid' });
  });
});
