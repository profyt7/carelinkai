/**
 * Family-facing Family Concierge emails (pay when ready, 10/31). Pure builders — subject, text and html —
 * so the copy can be tested without sending. Every email carries the terms word for word where money is
 * involved, what happens next and our phone number. None ever carries the family's health or case details
 * (care needs, location, timeline, notes) or their name: only what we promise and how to reach us.
 */

import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { emailButton, emailDisclaimer } from '@/lib/email/layout';
import { CONTACT_NO_PHI_LINE, CONTACT_PHONE_DISPLAY } from '@/lib/contact';

export type FamilyEmail = { subject: string; text: string; html: string };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const phoneLine = `Questions? Call us at ${CONTACT_PHONE_DISPLAY}. ${CONTACT_NO_PHI_LINE}`;
const p = (s: string) => `<p>${esc(s)}</p>`;
/** Disclaimers (the not-a-placement line, the phone/no-PHI line): 14px muted, wording unchanged. */
const small = (s: string) => emailDisclaimer(esc(s));
const button = (href: string, label: string, linkText: string) => emailButton(label, href, linkText);

/** Sent right after a request is submitted. `waitlisted` = the month's capacity was reached. */
export function conciergeConfirmationEmail(opts: { waitlisted: boolean }): FamilyEmail {
  if (opts.waitlisted) {
    const lines = [
      'Thanks for your Family Concierge request. Nothing has been charged.',
      'We take a small number of family searches each month so every one gets a person, and this month is full. You are on the waitlist, and we will email you when a slot opens. The free directory and guides are yours in the meantime.',
    ];
    return {
      subject: 'You’re on the Family Concierge waitlist',
      text: [...lines, `When we start your search, the terms are:\n${CONCIERGE_OFFER.terms}`, phoneLine].join('\n\n'),
      html: lines.map(p).join('') + p('When we start your search, the terms are:') + p(CONCIERGE_OFFER.terms) + small(phoneLine),
    };
  }
  const steps = CONCIERGE_OFFER.nextSteps;
  return {
    subject: 'We got your Family Concierge request',
    text: [
      'Thanks for your Family Concierge request. Nothing has been charged.',
      `What happens next:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      `The terms:\n${CONCIERGE_OFFER.terms}`,
      phoneLine,
    ].join('\n\n'),
    html:
      p('Thanks for your Family Concierge request. Nothing has been charged.') +
      `<p><strong>What happens next</strong></p><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` +
      `<p><strong>The terms</strong></p>` + p(CONCIERGE_OFFER.terms) +
      small(phoneLine),
  };
}

/** "Shortlist ready — send payment link": the admin pasted a Stripe Payment Link. */
export function conciergePaymentLinkEmail(opts: { paymentLinkUrl: string }): FamilyEmail {
  const pay = `Your personalized shortlist is ready. Pay ${CONCIERGE_OFFER.priceDisplay} securely through Stripe, and we’ll send you the full shortlist as soon as it’s paid.`;
  return {
    subject: 'Your Family Concierge shortlist is ready',
    text: [pay, `Secure payment link:\n${opts.paymentLinkUrl}`, CONCIERGE_OFFER.notAPlacementLine, phoneLine].join('\n\n'),
    html: p(pay) + button(opts.paymentLinkUrl, `Pay ${CONCIERGE_OFFER.priceDisplay} securely`, 'Open secure payment link') + small(CONCIERGE_OFFER.notAPlacementLine) + small(phoneLine),
  };
}

/** "Release shortlist": payment is marked received; the link opens the family's shortlist page. */
export function conciergeShortlistReleasedEmail(opts: { shortlistUrl: string }): FamilyEmail {
  const intro = 'Thank you — your payment is received. Your full Family Concierge shortlist is ready to view.';
  return {
    subject: 'Your Family Concierge shortlist',
    text: [intro, `View your shortlist:\n${opts.shortlistUrl}`, CONCIERGE_OFFER.notAPlacementLine, phoneLine].join('\n\n'),
    html: p(intro) + button(opts.shortlistUrl, 'View your shortlist', 'Open your shortlist') + small(CONCIERGE_OFFER.notAPlacementLine) + small(phoneLine),
  };
}

/** Phase 2 (OL-248): the ONE reminder, 3 days after the payment link went out, if still unpaid. */
export function conciergePaymentReminderEmail(opts: { paymentLinkUrl: string }): FamilyEmail {
  const pay = `A reminder: your personalized shortlist is ready. Pay ${CONCIERGE_OFFER.priceDisplay} securely through Stripe, and we’ll send you the full shortlist as soon as it’s paid. This is our only reminder.`;
  return {
    subject: 'Reminder: your Family Concierge shortlist is ready',
    text: [pay, `Secure payment link:\n${opts.paymentLinkUrl}`, CONCIERGE_OFFER.notAPlacementLine, phoneLine].join('\n\n'),
    html: p(pay) + button(opts.paymentLinkUrl, `Pay ${CONCIERGE_OFFER.priceDisplay} securely`, 'Open secure payment link') + small(CONCIERGE_OFFER.notAPlacementLine) + small(phoneLine),
  };
}
