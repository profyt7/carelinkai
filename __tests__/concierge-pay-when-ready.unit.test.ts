/**
 * Family Concierge, pay when ready (10/31): the admin's order actions, the family's signed shortlist link,
 * and the family emails.
 *  - "send payment link" needs a saved shortlist, an unpaid order and a buy.stripe.com URL; it stores the
 *    link and emails it; history rows carry statuses and timestamps only (never the URL or the email).
 *  - "mark paid" moves REQUESTED_UNPAID → PAID; "release" needs PAID and emails a signed shortlist link.
 *  - the family's shortlist stays hidden until PAID + released; tokens can't be forged or reused past expiry.
 *  - no family email carries health or case details, and none promises a turnaround.
 */
jest.mock('@/lib/prisma', () => {
  const p: any = {
    conciergeOrder: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }) },
  };
  p.$transaction = jest.fn(async (fn: any) => fn(p));
  return { prisma: p };
});
jest.mock('@/lib/email', () => ({ sendConciergeFamilyEmail: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { prisma } from '@/lib/prisma';
import { sendConciergeFamilyEmail } from '@/lib/email';
import { isStripePaymentLinkUrl, markPaid, releaseShortlist, sendPaymentLink } from '@/lib/concierge/pay-when-ready';
import { isShortlistVisibleToFamily, signShortlistToken, verifyShortlistToken } from '@/lib/concierge/shortlist-token';
import { conciergeConfirmationEmail, conciergePaymentLinkEmail, conciergeShortlistReleasedEmail } from '@/lib/concierge/family-emails';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';

const find = (prisma as any).conciergeOrder.findUnique as jest.Mock;
const update = (prisma as any).conciergeOrder.update as jest.Mock;
const event = (prisma as any).entityEvent.create as jest.Mock;
const send = sendConciergeFamilyEmail as jest.Mock;
const actor = { userId: 'admin-1', role: 'ADMIN' };
const LINK = 'https://buy.stripe.com/test_abc123';

const order = (over: Record<string, unknown> = {}) => ({
  id: 'ord-1', status: 'REQUESTED_UNPAID', email: 'fam@example.com', amountCents: 39900,
  paymentLinkSentAt: null, shortlistReleasedAt: null,
  placementSearch: { id: 'ps-1', conciergeStatus: 'SHORTLIST_READY', curatedHomes: [{ homeId: 'h1' }, { homeId: 'h2' }] },
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'test-secret-pay-when-ready';
});

describe('isStripePaymentLinkUrl', () => {
  it('accepts buy.stripe.com links only', () => {
    expect(isStripePaymentLinkUrl(LINK)).toBe(true);
    expect(isStripePaymentLinkUrl('https://buy.stripe.com/aEU5kD0')).toBe(true);
    for (const bad of ['http://buy.stripe.com/x', 'https://evil.com/buy.stripe.com', 'https://buy.stripe.com.evil.com/x', 'https://buy.stripe.com/', 'https://u:p@buy.stripe.com/x', 'javascript:alert(1)', 'not a url'])
      expect(isStripePaymentLinkUrl(bad)).toBe(false);
  });
});

describe('sendPaymentLink', () => {
  it('stores the link, records a URL-free history row and emails the family', async () => {
    find.mockResolvedValue(order());
    const r = await sendPaymentLink({ orderId: 'ord-1', paymentLinkUrl: LINK, actor });
    expect(r).toEqual({ ok: true, status: 'REQUESTED_UNPAID', emailed: true });
    expect(update).toHaveBeenCalledWith({ where: { id: 'ord-1' }, data: { paymentLinkUrl: LINK, paymentLinkSentAt: expect.any(Date) } });
    const ev = event.mock.calls[0][0].data;
    expect(ev.eventType).toBe('order.payment_link_sent');
    expect(JSON.stringify(ev)).not.toMatch(/stripe\.com|fam@example/);
    expect(send).toHaveBeenCalledWith({ toEmail: 'fam@example.com', email: expect.objectContaining({ subject: expect.any(String) }), kind: 'payment_link' });
    expect(send.mock.calls[0][0].email.text).toContain(LINK);
  });
  it('refuses before the shortlist is saved, for a paid order, and for a non-Stripe URL', async () => {
    find.mockResolvedValue(order({ placementSearch: { id: 'ps-1', conciergeStatus: 'MATCHING', curatedHomes: null } }));
    expect(await sendPaymentLink({ orderId: 'ord-1', paymentLinkUrl: LINK, actor })).toMatchObject({ ok: false, code: 409 });
    find.mockResolvedValue(order({ status: 'PAID' }));
    expect(await sendPaymentLink({ orderId: 'ord-1', paymentLinkUrl: LINK, actor })).toMatchObject({ ok: false, code: 409 });
    expect(await sendPaymentLink({ orderId: 'ord-1', paymentLinkUrl: 'https://example.com/pay', actor })).toMatchObject({ ok: false, code: 400 });
    expect(update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('markPaid', () => {
  it('REQUESTED_UNPAID → PAID with paidAt and an ADMIN history row; idempotent on PAID; refuses waitlist', async () => {
    find.mockResolvedValue(order());
    expect(await markPaid({ orderId: 'ord-1', actor })).toEqual({ ok: true, status: 'PAID' });
    expect(update).toHaveBeenCalledWith({ where: { id: 'ord-1' }, data: { status: 'PAID', paidAt: expect.any(Date) } });
    expect(event.mock.calls[0][0].data).toMatchObject({ eventType: 'order.paid', source: 'ADMIN' });
    update.mockClear();
    find.mockResolvedValue(order({ status: 'PAID' }));
    expect(await markPaid({ orderId: 'ord-1', actor })).toEqual({ ok: true, status: 'PAID' });
    expect(update).not.toHaveBeenCalled();
    find.mockResolvedValue(order({ status: 'WAITLIST' }));
    expect(await markPaid({ orderId: 'ord-1', actor })).toMatchObject({ ok: false, code: 409 });
  });
});

describe('releaseShortlist', () => {
  it('refuses until the order is PAID', async () => {
    find.mockResolvedValue(order());
    expect(await releaseShortlist({ orderId: 'ord-1', actor })).toMatchObject({ ok: false, code: 409 });
    expect(send).not.toHaveBeenCalled();
  });
  it('PAID: stamps the release and emails a signed link that opens only this order', async () => {
    find.mockResolvedValue(order({ status: 'PAID' }));
    expect(await releaseShortlist({ orderId: 'ord-1', actor })).toEqual({ ok: true, status: 'PAID', emailed: true });
    expect(update).toHaveBeenCalledWith({ where: { id: 'ord-1' }, data: { shortlistReleasedAt: expect.any(Date) } });
    const text = send.mock.calls[0][0].email.text as string;
    const token = decodeURIComponent(text.match(/\/concierge\/shortlist\/([^\s]+)/)![1]);
    expect(verifyShortlistToken(token, 'test-secret-pay-when-ready')?.orderId).toBe('ord-1');
  });
});

describe('the family shortlist is hidden until marked paid and released', () => {
  it('visibility', () => {
    expect(isShortlistVisibleToFamily(null)).toBe(false);
    expect(isShortlistVisibleToFamily({ status: 'REQUESTED_UNPAID', shortlistReleasedAt: new Date() })).toBe(false);
    expect(isShortlistVisibleToFamily({ status: 'PAID', shortlistReleasedAt: null })).toBe(false);
    expect(isShortlistVisibleToFamily({ status: 'REFUNDED', shortlistReleasedAt: new Date() })).toBe(false);
    expect(isShortlistVisibleToFamily({ status: 'PAID', shortlistReleasedAt: new Date() })).toBe(true);
  });
  it('tokens: tampered, wrong secret or expired → null', () => {
    const t = signShortlistToken('ord-1', 's1');
    expect(verifyShortlistToken(t, 's1')?.orderId).toBe('ord-1');
    expect(verifyShortlistToken(t, 's2')).toBeNull();
    expect(verifyShortlistToken(t.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')), 's1')).toBeNull();
    expect(verifyShortlistToken(signShortlistToken('ord-1', 's1', { ttlDays: -1 }), 's1')).toBeNull();
  });
});

describe('family emails', () => {
  const all = [
    conciergeConfirmationEmail({ waitlisted: false }),
    conciergeConfirmationEmail({ waitlisted: true }),
    conciergePaymentLinkEmail({ paymentLinkUrl: LINK }),
    conciergeShortlistReleasedEmail({ shortlistUrl: 'https://getcarelinkai.com/concierge/shortlist/x.y' }),
  ];
  it('the confirmation carries the terms word for word, the next steps and our phone number', () => {
    const c = all[0]!;
    expect(c.text).toContain(CONCIERGE_OFFER.terms);
    for (const s of CONCIERGE_OFFER.nextSteps) expect(c.text).toContain(s);
    expect(c.text).toContain('(216) 245-9482');
  });
  it('no email promises a turnaround or a placement, and every one has the phone number', () => {
    for (const e of all) {
      const blob = `${e.subject}\n${e.text}\n${e.html}`;
      expect(blob).not.toMatch(/business day|within \d+ (hours?|days?)|full refund/i);
      expect(e.text).toContain('(216) 245-9482');
    }
  });
});
