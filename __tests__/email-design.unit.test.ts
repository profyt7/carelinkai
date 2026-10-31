/**
 * Shared branded email layout (feat/email-design). Every email sent through guardedResendSend:
 *  - is wrapped once in the layout (gray page, white card, logo with alt text, footer with phone/site/privacy/terms);
 *  - has at most ONE primary CTA (a bulletproof table button with a plain-link fallback);
 *  - has no emoji in the subject or headings;
 *  - keeps its plain-text version unchanged;
 *  - carries no PHI (a fixture full of patient details never reaches any body).
 * Snapshots pin each key template.
 */
const sent: any[] = [];
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn(async (args: any) => { sent.push(args); return { data: { id: 'em_1' }, error: null }; }) } })) }));
jest.mock('@/lib/email/suppression', () => ({ filterSuppressed: jest.fn(async (to: string[]) => ({ allowed: to, suppressed: [] })) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import * as email from '@/lib/email';
import { conciergeConfirmationEmail, conciergePaymentLinkEmail, conciergePaymentReminderEmail, conciergeShortlistReleasedEmail } from '@/lib/concierge/family-emails';
import { emailButton, renderEmailLayout, stripEmoji, LAYOUT_MARKER } from '@/lib/email/layout';

const PHI = ['Jane Doe', 'advanced dementia', 'insulin', 'POA is daughter', '216-555-0100', 'patientName', 'medicalNeeds'];
const ctaCount = (html: string) => (html.match(/data-cta="primary"/g) ?? []).length;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

beforeAll(() => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.NEXT_PUBLIC_APP_URL = 'https://getcarelinkai.com';
  process.env.ADMIN_NOTIFY_EMAIL = 'admin@example.test';
});
beforeEach(() => { sent.length = 0; });

async function capture(fn: () => Promise<unknown>) {
  await fn();
  expect(sent).toHaveLength(1);
  return sent[0];
}

const CASES: { name: string; run: () => Promise<unknown>; cta: string | null }[] = [
  { name: 'concierge confirmation (family)', cta: null, run: () => email.sendConciergeFamilyEmail({ toEmail: 'fam@example.test', email: conciergeConfirmationEmail({ waitlisted: false }), kind: 'confirmation' } as any) },
  { name: 'payment link (family)', cta: 'Pay $399 securely', run: () => email.sendConciergeFamilyEmail({ toEmail: 'fam@example.test', email: conciergePaymentLinkEmail({ paymentLinkUrl: 'https://buy.stripe.com/test_x?client_reference_id=ord1' }), kind: 'payment_link' } as any) },
  { name: 'payment reminder (family)', cta: 'Pay $399 securely', run: () => email.sendConciergeFamilyEmail({ toEmail: 'fam@example.test', email: conciergePaymentReminderEmail({ paymentLinkUrl: 'https://buy.stripe.com/test_x' }), kind: 'payment_reminder' } as any) },
  { name: 'shortlist released (family)', cta: 'View your shortlist', run: () => email.sendConciergeFamilyEmail({ toEmail: 'fam@example.test', email: conciergeShortlistReleasedEmail({ shortlistUrl: 'https://getcarelinkai.com/concierge/shortlist/tok' }), kind: 'shortlist_released' } as any) },
  { name: 'admin new concierge request', cta: 'Review & build the shortlist', run: () => email.sendConciergeRequestNotification({ requestId: 'ps-1', dpName: 'Dana Planner', dpOrganization: 'Metro Hospital' }) },
  { name: 'claim approved (operator)', cta: 'Open your listing', run: () => email.sendHomeClaimDecisionEmail({ to: 'op@example.test', firstName: 'Pat', homeName: 'Maple Grove', decision: 'approved', homeId: 'h-1' }) },
  { name: 'claim rejected (operator)', cta: null, run: () => email.sendHomeClaimDecisionEmail({ to: 'op@example.test', firstName: 'Pat', homeName: 'Maple Grove', decision: 'rejected', homeId: 'h-1' }) },
  { name: 'new claim (admin)', cta: 'Review claim', run: () => email.sendHomeClaimAdminNotice({ homeName: 'Maple Grove', operatorEmail: 'op@example.test', claimId: 'c-1' }) },
  { name: 'operator claim notice (admin)', cta: 'Review claim', run: () => email.sendOperatorClaimNotification({ facilityName: 'Maple Grove', operatorEmail: 'op@example.test', homeId: 'h-1', status: 'PENDING_REVIEW' }) },
  { name: 'concierge paid (admin)', cta: null, run: () => email.sendConciergePaidNotification({ requestId: 'ps-1', orderId: 'ord1', amountCents: 39900 }) },
  { name: 'shortlist ready (DP)', cta: null, run: () => email.sendConciergeShortlistReadyEmail({ toEmail: 'dp@example.test', count: 3 }) },
  { name: 'concierge admin notice', cta: null, run: () => email.sendConciergeAdminNotice({ subject: 'Order expired (unpaid 14 days)', text: 'Order ord1 expired.', requestId: 'ps-1' }) },
  { name: 'new tour lead (operator)', cta: null, run: () => email.sendNewLeadOperatorEmail({ facilityName: 'Maple Grove', toEmail: 'op@example.test', operatorFirstName: 'Pat', leadType: 'tour', ctaUrl: 'https://getcarelinkai.com/operator/tours' }) },
  { name: 'facility accept/decline request', cta: null, run: () => email.sendFacilityResponseRequestEmail({ toEmail: 'home@example.test', facilityName: 'Maple Grove', summary: { careLevel: 'Memory care', payerLane: 'Private pay', feeLane: 'FEE_ELIGIBLE', timeline: 'Within 2 weeks' }, token: 'tok', appUrl: 'https://getcarelinkai.com', postalAddress: '123 Test St, Cleveland, OH', unsubscribeUrl: 'https://getcarelinkai.com/u' }) },
  { name: 'verification', cta: null, run: () => email.sendVerificationEmail('pat@example.test', 'Pat', 'verify-token') },
  { name: 'password reset', cta: null, run: () => email.sendPasswordResetEmail('pat@example.test', 'Pat', 'reset-token') },
];

describe('every email: layout, one CTA, no emoji in subject/headings, plain text kept, no PHI', () => {
  it.each(CASES.map((c) => [c.name, c] as const))('%s', async (_n, c) => {
    const msg = await capture(c.run);
    const html: string = msg.html;
    expect(html).toContain(LAYOUT_MARKER);
    expect(html.split(LAYOUT_MARKER)).toHaveLength(2); // wrapped exactly once
    expect(html).toContain('alt="CareLinkAI"');
    expect(html).toContain('/images/logo.png');
    expect(html).toContain('CareLinkAI · Cleveland, Ohio');
    expect(html).toContain('(216) 245-9482');
    expect(html).toContain('/privacy');
    expect(html).toContain('/terms');
    expect(ctaCount(html)).toBeLessThanOrEqual(1);
    if (c.cta) {
      expect(ctaCount(html)).toBe(1);
      expect(html).toContain(c.cta.replace('&', '&amp;'));
      expect(html).toContain('Or open this link:');
    }
    expect(msg.subject).not.toMatch(EMOJI);
    for (const h of html.match(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi) ?? []) expect(h).not.toMatch(EMOJI);
    expect(typeof msg.text).toBe('string');
    expect(msg.text).not.toContain('<table');
    for (const phi of PHI) expect(html + msg.text).not.toContain(phi);
    const stable = html
      .replace(/https:\/\/buy\.stripe\.com[^"<\s]*/g, 'STRIPE')
      .replace(/\w+day, \w+ \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M ET/g, 'DATE') // "claimed at" timestamps
      .replace(/\s+/g, ' ');
    expect(stable).toMatchSnapshot();
  });
});

describe('layout pieces', () => {
  it('the button is a bulletproof table with VML for Outlook and a plain link under it', () => {
    const b = emailButton('View your shortlist', 'https://x.test/a?b=1&c=2');
    expect(b).toContain('role="presentation"');
    expect(b).toContain('v:roundrect');
    expect(b).toContain('#3978FC');
    expect(b).toContain('https://x.test/a?b=1&amp;c=2');
    expect(b).toContain('Or open this link:');
  });
  it('wraps once, strips an outer document, supports dark mode, and strips emoji', () => {
    const once = renderEmailLayout({ html: '<html><head><title>x</title></head><body><p>Hi</p></body></html>' });
    expect(renderEmailLayout({ html: once })).toBe(once);
    expect(once).not.toMatch(/<body[^>]*>\s*<html/i);
    expect(once).toContain('prefers-color-scheme: dark');
    expect(once).toContain('/images/logo-on-dark.png');
    expect(stripEmoji('🧑‍⚕️ New concierge placement request')).toBe('New concierge placement request');
    expect(stripEmoji('🎉 New CareLinkAI claim — Maple')).toBe('New CareLinkAI claim — Maple');
  });
});
