/**
 * OL-174 — /concierge FAQ. One array feeds BOTH the visible Q&A block and the
 * FAQPage JSON-LD, so the schema can never drift from what a family reads
 * (pinned by __tests__/concierge-faq.unit.test.ts).
 *
 * Copy rules: every answer is built from what offer.ts and contact.ts already
 * say. No dollar figure anywhere in this file — the cost answer points to the
 * payer question, because Medicaid / Medicare / VA families are never shown a
 * price (OL-165 / OL-166b). The guarantee is quoted verbatim from
 * CONCIERGE_OFFER.guarantee. No outcome or savings promises, no facility fee.
 */

import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { CONTACT_HOURS_LINE, CONTACT_NO_PHI_LINE, CONTACT_PHONE_DISPLAY } from '@/lib/contact';

export type ConciergeFaqItem = { question: string; answer: string };

/** Short names for the concierge deliverables (the full wording lives in CONCIERGE_OFFER.inclusions). */
export const CONCIERGE_INCLUDED_SUMMARY = [
  'A 20-minute intake call within 1 business day',
  'A verified shortlist of 3–5 homes, availability and price confirmed',
  'A fit check against each home’s acceptance criteria',
  'A Medicaid runway plan',
  'Real prices in writing, plus what to ask for before signing',
  'A contract red-flag review in plain English',
  'Discharge coordination with the hospital',
] as const;

export const CONCIERGE_FAQ: readonly ConciergeFaqItem[] = [
  {
    question: 'Who is the Family Concierge for?',
    answer:
      'Families in Greater Cleveland who will pay for assisted living or memory care privately or through long-term care insurance, and who want a person to check fit, prices and the contract with them before they sign. If care will be paid through Medicaid, Medicare or the VA, our help is free instead.',
  },
  {
    question: 'What does it cost, and who pays?',
    answer: `The concierge is a flat, one-time fee per family search, private pay only; the price is shown after the payer question on this page. It is free when Medicaid, Medicare or the VA pays, and searching CareLinkAI never costs any family anything. ${CONCIERGE_OFFER.honestyLine}`,
  },
  {
    question: 'What is included, and what is not?',
    answer: `Included: ${CONCIERGE_INCLUDED_SUMMARY.join('; ')}; tour scheduling; and check-ins after move-in. Not included: ${CONCIERGE_OFFER.notIncluded.join('; ')}. ${CONCIERGE_OFFER.noOutcomeLine}`,
  },
  {
    question: 'How fast is the shortlist, and what if it is late?',
    answer: `${CONCIERGE_OFFER.subhead} The guarantee, word for word: ${CONCIERGE_OFFER.guarantee}`,
  },
  {
    question: 'We are paying through Medicaid, Medicare or the VA. Can you still help?',
    answer: `Yes, and it is free. ${CONCIERGE_OFFER.freeLaneSubhead} Answer the payer question on this page and it takes you straight to the free directory, including the homes accepting new Medicaid Assisted Living Waiver residents.`,
  },
  {
    question: 'Can I talk to a person?',
    answer: `Yes. Call ${CONTACT_PHONE_DISPLAY}. ${CONTACT_HOURS_LINE}`,
  },
  {
    question: 'Can I share my parent’s medical details on the phone?',
    answer: `No. ${CONTACT_NO_PHI_LINE} The request form on this page is encrypted and visible only to the people the family chooses.`,
  },
];

/** FAQPage JSON-LD built from the same array the page renders. */
export function buildConciergeFaqJsonLd(items: readonly ConciergeFaqItem[] = CONCIERGE_FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}
