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
const filterSuppressed = jest.fn(async (to: string[], _opts?: unknown) => ({ allowed: to, suppressed: [] as string[] }));
jest.mock('@/lib/email/suppression', () => ({ filterSuppressed: (to: string[], opts?: unknown) => filterSuppressed(to, opts) }));
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
beforeEach(() => { sent.length = 0; filterSuppressed.mockClear(); });

async function capture(fn: () => Promise<unknown>) {
  await fn();
  expect(sent).toHaveLength(1);
  return sent[0];
}

const CASES: { name: string; run: () => Promise<unknown>; cta: string | null; marketing?: boolean }[] = [
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
  { name: 'facility accept/decline request', cta: null, marketing: true, run: () => email.sendFacilityResponseRequestEmail({ toEmail: 'home@example.test', facilityName: 'Maple Grove', summary: { careLevel: 'Memory care', payerLane: 'Private pay', feeLane: 'FEE_ELIGIBLE', timeline: 'Within 2 weeks' }, token: 'tok', appUrl: 'https://getcarelinkai.com', postalAddress: '123 Test St, Cleveland, OH', unsubscribeUrl: 'https://getcarelinkai.com/u' }) },
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
    // (a) logos: absolute https on our domain, alt text, explicit width and height (email-sized files)
    expect(html).toMatch(/<img src="https:\/\/getcarelinkai\.com\/images\/email-logo\.png" width="148" height="38" alt="CareLinkAI"/);
    // Always light (fix/email-always-light): one logo, no dark-mode styles, light declared, colors inline.
    expect(html).not.toContain('email-logo-on-dark.png');
    expect(html).not.toMatch(/prefers-color-scheme|data-ogsc|data-ogsb/);
    expect(html).toContain('<meta name="color-scheme" content="light only">');
    expect(html).toContain('<meta name="supported-color-schemes" content="light only">');
    expect(html).toContain(':root { color-scheme: light only; supported-color-schemes: light only; }');
    expect(html).toMatch(/<table role="presentation" width="100%"[^>]*bgcolor="#F4F5F7"[^>]*style="background:#F4F5F7;/);
    expect(html).toMatch(/<td class="clk-card clk-card-pad" align="left" bgcolor="#FFFFFF" style="text-align:left;background:#FFFFFF;[^"]*color:#1A1A1A"/);
    // fix/email-polish: the logo is centered above the card; headings and paragraphs stay left (the card cell is left).
    expect(html).toMatch(/<td align="center"[^>]*style="[^"]*text-align:center[^"]*">\s*<a href="https:\/\/getcarelinkai\.com"[^>]*>\s*<img src="https:\/\/getcarelinkai\.com\/images\/email-logo\.png"/);
    // Disclaimers are 14px muted #63666A wherever they appear.
    for (const d of html.match(/<p class="clk-disclaimer"[^>]*>/g) ?? []) expect(d).toMatch(/font-size:14px;[^"]*color:#63666A/);
    // No text element anywhere in the email leans on an inherited color.
    const bare = (html.replace(/<!--[\s\S]*?-->/g, '').match(/<(h[1-6]|p|li|td|th|span|div|strong|b|em|a)\b[^>]*>/gi) ?? [])
      .filter((t) => {
        const m = t.match(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
        return !(m && /(^|;)\s*color\s*:/i.test(m[1] ?? m[2] ?? ''));
      });
    expect(bare).toEqual([]);
    expect(html).toContain('CareLinkAI · Cleveland, Ohio');
    expect(html).toContain('(216) 245-9482');
    expect(html).toContain('/privacy');
    expect(html).toContain('/terms');
    expect(ctaCount(html)).toBeLessThanOrEqual(1);
    if (c.cta) {
      expect(ctaCount(html)).toBe(1);
      // (b) the button (VML + HTML) and its fallback link all point to the same URL
      const block = html.slice(html.indexOf('data-cta="primary"'));
      const hrefs = [...block.slice(0, block.indexOf('</p>')).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.length).toBe(3);
      expect(new Set(hrefs).size).toBe(1);
      expect(html).toContain(c.cta.replace('&', '&amp;'));
      // Centered: the table, its cell (which holds the Outlook VML too) and the fallback line.
      expect(block.slice(0, 400)).toMatch(/^data-cta="primary"><tr><td align="center" style="text-align:center[^"]*"><!--\[if mso\]><v:roundrect/);
      expect(html).toMatch(/<table role="presentation" align="center"[^>]*data-cta="primary"/);
      // The fallback shows descriptive linked text, never the raw URL; the plain text keeps the full URL.
      const fallback = block.slice(block.indexOf('clk-fallback'), block.indexOf('</p>'));
      const visible = fallback.replace(/^[^>]*>/, '').replace(/<[^>]+>/g, '');
      expect(visible).toMatch(/^Open /);
      expect(visible).not.toMatch(/https?:|www\./);
      expect(html).not.toContain('Or open this link:');
      expect(msg.text).toContain(hrefs[0]!.replace(/&amp;/g, '&'));
    }
    expect(msg.subject).not.toMatch(EMOJI);
    for (const h of html.match(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi) ?? []) expect(h).not.toMatch(EMOJI);
    expect(typeof msg.text).toBe('string');
    expect(msg.text).not.toContain('<table');
    // (d) no care details in the subject, any preview text, the body, the plain text or any URL
    for (const phi of PHI) expect(`${msg.subject}\n${html}\n${msg.text}`).not.toContain(phi);
    expect(html).not.toMatch(/display:none;max-height:0/); // no hidden preheader text is added
    // (e) transactional: a marketing 'unsubscribe' never blocks it, and there is no unsubscribe/marketing language
    if (!c.marketing) {
      expect(filterSuppressed).toHaveBeenCalledWith(expect.any(Array), { ignoreReasons: ['unsubscribe'] });
      expect(html).not.toMatch(/unsubscribe|marketing|opt.?out|email preferences/i);
    } else {
      expect(filterSuppressed).toHaveBeenCalledWith(expect.any(Array), {});
    }
    const stable = html
      .replace(/https:\/\/buy\.stripe\.com[^"<\s]*/g, 'STRIPE')
      .replace(/\w+day, \w+ \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M ET/g, 'DATE') // "claimed at" timestamps
      .replace(/\s+/g, ' ');
    expect(stable).toMatchSnapshot();
  });
});

describe('(c) multi-action emails keep every link', () => {
  it('availability ping: all one-tap replies (0–5, other, STOP) and the unsubscribe link survive; no primary button is added', async () => {
    const msg = await capture(() => email.sendAvailabilityPingEmail({ toEmail: 'home@example.test', contactName: 'Ann Lee', facilityName: 'Maple Grove', token: 'tok123', appUrl: 'https://getcarelinkai.com', postalAddress: '123 Test St, Cleveland, OH' }));
    const links = [...msg.html.matchAll(/href="([^"]+)"/g)].map((m: RegExpMatchArray) => m[1]!.replace(/&amp;/g, '&'));
    for (const n of ['0', '1', '2', '3', '4', '5', 'STOP']) expect(links.some((l: string) => l.includes('token=tok123') && l.includes(`reply=${n}`))).toBe(true);
    expect(links.some((l: string) => /unsubscribe/i.test(l))).toBe(true);
    expect(ctaCount(msg.html)).toBe(0);
    expect(filterSuppressed).toHaveBeenCalledWith(expect.any(Array), {}); // marketing: a marketing unsubscribe still blocks it
  });

  it('facility accept/decline request keeps both actions', async () => {
    const msg = await capture(() => email.sendFacilityResponseRequestEmail({ toEmail: 'home@example.test', facilityName: 'Maple Grove', summary: { careLevel: 'Memory care', payerLane: 'Private pay', feeLane: 'FEE_ELIGIBLE', timeline: 'Within 2 weeks' }, token: 'tokFR', appUrl: 'https://getcarelinkai.com', postalAddress: '123 Test St', unsubscribeUrl: 'https://getcarelinkai.com/u' }));
    const links = [...msg.html.matchAll(/href="([^"]+)"/g)].map((m: RegExpMatchArray) => m[1]!);
    expect(links.filter((l: string) => l.includes('tokFR')).length).toBeGreaterThanOrEqual(1);
    expect(links).toContain('https://getcarelinkai.com/u');
  });
});

describe('claim approved copy', () => {
  it('"We confirmed your claim. The listing is now yours." and the button is the single action (no inline "here: {url}")', async () => {
    const msg = await capture(() => email.sendHomeClaimDecisionEmail({ to: 'op@example.test', firstName: 'Pat', homeName: 'Maple Grove', decision: 'approved', homeId: 'h-1' }));
    expect(msg.html).toContain('We confirmed your claim. The listing is now yours.');
    expect(msg.html).not.toContain('We verified it');
    expect(msg.html).not.toMatch(/availability here:/);
    expect(msg.html.match(/\/operator\/homes\/h-1/g)).toHaveLength(3); // VML href, button href, fallback href (its text says "Open your listing") — nothing else
    expect(msg.text).toContain('Open your listing: https://getcarelinkai.com/operator/homes/h-1');
  });
});

describe('layout pieces', () => {
  it('the button is a centered bulletproof table with VML for Outlook and a descriptive fallback link under it', () => {
    const b = emailButton('View your shortlist', 'https://x.test/a?b=1&c=2', 'Open your shortlist');
    expect(b).toContain('role="presentation"');
    expect(b).toContain('v:roundrect');
    expect(b).toContain('#3978FC');
    expect(b.match(/href="https:\/\/x\.test\/a\?b=1&amp;c=2"/g)).toHaveLength(3); // VML, button, fallback: same destination
    expect(b).toMatch(/<table role="presentation" align="center"[^>]*><tr><td align="center" style="text-align:center"><!--\[if mso\]>/);
    expect(b).toMatch(/<p class="clk-muted clk-fallback" align="center" style="[^"]*text-align:center"><a href="https:\/\/x\.test\/a\?b=1&amp;c=2" style="color:#3978FC">Open your shortlist<\/a><\/p>$/);
    expect(b.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')).not.toContain('x.test');
  });
  it('family emails: fallback says "Open secure payment link" / "Open your shortlist"; the not-a-placement line is a 14px muted disclaimer, wording unchanged', () => {
    const pay = conciergePaymentLinkEmail({ paymentLinkUrl: 'https://buy.stripe.com/test_x?client_reference_id=ord1' });
    const rem = conciergePaymentReminderEmail({ paymentLinkUrl: 'https://buy.stripe.com/test_x' });
    const rel = conciergeShortlistReleasedEmail({ shortlistUrl: 'https://getcarelinkai.com/concierge/shortlist/tok' });
    for (const e of [pay, rem]) {
      expect(e.html).toContain('>Open secure payment link</a>');
      expect(e.text).toContain('Secure payment link:\nhttps://buy.stripe.com/test_x');
    }
    expect(rel.html).toContain('>Open your shortlist</a>');
    expect(rel.text).toContain('View your shortlist:\nhttps://getcarelinkai.com/concierge/shortlist/tok');
    for (const e of [pay, rem, rel]) {
      expect(e.html).toMatch(/<p class="clk-disclaimer" style="[^"]*font-size:14px;[^"]*color:#63666A[^"]*">You&#39;re paying for the research and shortlist, not a guaranteed opening or placement\.<\/p>/);
      expect(e.text).toContain("You're paying for the research and shortlist, not a guaranteed opening or placement.");
    }
  });
  it('admin emails: fallback says "Open the request" / "Open the claim"; destinations unchanged', async () => {
    const req = await capture(() => email.sendConciergeRequestNotification({ requestId: 'ps-1', dpName: 'Dana Planner', dpOrganization: 'Metro Hospital' }));
    expect(req.html).toMatch(/<a href="https:\/\/getcarelinkai\.com\/admin\/concierge\/ps-1" style="color:#3978FC">Open the request<\/a>/);
    expect(req.text).toContain('https://getcarelinkai.com/admin/concierge/ps-1');
  });
  it('wraps once, strips an outer document, always renders light, and strips emoji', () => {
    const once = renderEmailLayout({ html: '<html><head><title>x</title></head><body><p>Hi</p><p style="color:#B91C1C">Keep</p><a href="/x">L</a></body></html>' });
    expect(renderEmailLayout({ html: once })).toBe(once);
    expect(once).not.toMatch(/<body[^>]*>\s*<html/i);
    expect(once).not.toMatch(/prefers-color-scheme|data-ogsc|data-ogsb|email-logo-on-dark|clk-logo-dark/);
    expect(once).toContain('content="light only"');
    expect(once).toContain('/images/email-logo.png');
    // Sender text without a color gets body text / brand blue inline; an explicit color is kept.
    expect(once).toContain('<p style="color:#1A1A1A">Hi</p>');
    expect(once).toContain('<p style="color:#B91C1C">Keep</p>');
    expect(once).toContain('<a href="/x" style="color:#3978FC">L</a>');
    // Footer: muted #63666A, the wording unchanged.
    expect(once).toMatch(/class="clk-footer"[^>]*color:#63666A/);
    expect(once.replace(/<[^>]+>/g, '')).toContain('CareLinkAI · Cleveland, Ohio · (216) 245-9482');
    expect(stripEmoji('🧑‍⚕️ New concierge placement request')).toBe('New concierge placement request');
    expect(stripEmoji('🎉 New CareLinkAI claim — Maple')).toBe('New CareLinkAI claim — Maple');
  });
});
