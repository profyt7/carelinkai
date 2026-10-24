/**
 * OL-174 — /concierge polish:
 *  - the FAQPage JSON-LD is built from the same array the page renders
 *    (schema == visible content, question for question, answer for answer);
 *  - 5–7 Q&As; the guarantee is quoted verbatim from CONCIERGE_OFFER.guarantee;
 *    no dollar figure anywhere in the FAQ (a free-lane family can read it);
 *  - the lane cards and the FAQ module carry no literal dollar amount; the
 *    private-pay card renders the price from CONCIERGE_OFFER only, and only
 *    for a private-pay / not-sure answer (never for the free lane);
 *  - the published number comes from src/lib/contact.ts (no literal);
 *  - copy rules: no "AI" pitch, no outcome / savings promise, no facility fee.
 */
import fs from 'fs';
import path from 'path';
import { CONCIERGE_FAQ, buildConciergeFaqJsonLd } from '@/lib/concierge/faq';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { CONTACT_NO_PHI_LINE, CONTACT_PHONE_DISPLAY } from '@/lib/contact';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

describe('concierge FAQ', () => {
  it('has 5–7 Q&As with unique questions', () => {
    expect(CONCIERGE_FAQ.length).toBeGreaterThanOrEqual(5);
    expect(CONCIERGE_FAQ.length).toBeLessThanOrEqual(7);
    expect(new Set(CONCIERGE_FAQ.map((f) => f.question)).size).toBe(CONCIERGE_FAQ.length);
  });

  it('FAQPage JSON-LD == the visible array, exactly', () => {
    const ld = buildConciergeFaqJsonLd();
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity.map((q) => ({ question: q.name, answer: q.acceptedAnswer.text }))).toEqual(
      CONCIERGE_FAQ.map((f) => ({ question: f.question, answer: f.answer })),
    );
    for (const q of ld.mainEntity) {
      expect(q['@type']).toBe('Question');
      expect(q.acceptedAnswer['@type']).toBe('Answer');
    }
  });

  it('the page renders the FAQ and the JSON-LD from the same module', () => {
    const page = read('src/app/concierge/page.tsx');
    expect(page).toMatch(/from '@\/lib\/concierge\/faq'/);
    expect(page).toContain('CONCIERGE_FAQ.map');
    expect(page).toContain('buildConciergeFaqJsonLd()');
  });

  it('quotes the guarantee verbatim and covers cost, Medicaid/Medicare/VA, phone, no patient details by phone', () => {
    const all = CONCIERGE_FAQ.map((f) => `${f.question} ${f.answer}`).join('\n');
    expect(all).toContain(CONCIERGE_OFFER.guarantee);
    expect(all).toContain(CONCIERGE_OFFER.subhead);
    expect(all).toContain(CONTACT_PHONE_DISPLAY);
    expect(all).toContain(CONTACT_NO_PHI_LINE);
    expect(all).toMatch(/Medicaid, Medicare or the VA/);
    expect(all).toMatch(/private pay only/);
  });

  it('shows no price: no dollar figure in any answer, and the cost answer points to the payer question', () => {
    for (const f of CONCIERGE_FAQ) {
      expect({ q: f.question, dollar: /\$\s?\d/.test(`${f.question} ${f.answer}`), price: f.answer.includes(CONCIERGE_OFFER.priceDisplay) }).toEqual({
        q: f.question,
        dollar: false,
        price: false,
      });
    }
    const cost = CONCIERGE_FAQ.find((f) => /cost/i.test(f.question));
    expect(cost?.answer).toMatch(/shown after the payer question/);
    expect(cost?.answer).toMatch(/free when Medicaid, Medicare or the VA pays/);
  });
});

describe('lane cards + FAQ module source rules', () => {
  const files = ['src/app/concierge/ConciergeLaneCards.tsx', 'src/lib/concierge/faq.ts', 'src/app/concierge/page.tsx', 'src/app/concierge/ConciergeIntro.tsx'];

  it('no literal dollar amount, no literal phone number', () => {
    for (const f of files) {
      const src = read(f);
      expect({ f, dollar: /\$\s?\d/.test(src), phone: /245-9482/.test(src) }).toEqual({ f, dollar: false, phone: false });
    }
  });

  it('the private-pay card renders the price from CONCIERGE_OFFER only for private pay / not sure, and is dropped for the free lane', () => {
    const src = read('src/app/concierge/ConciergeLaneCards.tsx');
    expect(src).toContain('CONCIERGE_OFFER.priceDisplay');
    expect(src).toMatch(/const showPrice = route === 'private_pay' \|\| route === 'both';/);
    expect(src).toMatch(/const freeOnly = route === 'free_help';/);
    expect(src).toMatch(/\{!freeOnly && \(/);
    expect(src).toContain('Private pay only');
    expect(src).toMatch(/href=\{CONTACT_PHONE_TEL\}/);
    expect(src).toContain('{CONTACT_NO_PHI_LINE}');
    expect(src).toContain('{CONCIERGE_OFFER.subhead}');
    expect(src).toContain('{CONCIERGE_OFFER.guarantee}');
  });

  it('copy rules: no "AI" pitch, no outcome / savings promise, no facility fee', () => {
    for (const f of files) {
      const src = read(f);
      expect({
        f,
        ai: /\bAI\b/.test(src),
        promise: /we['’]ll find|guaranteed placement|save you/i.test(src),
        fee: /pays CareLinkAI a fee|move-in fee|referral fee|placement fee/i.test(src),
      }).toEqual({ f, ai: false, promise: false, fee: false });
    }
  });
});
