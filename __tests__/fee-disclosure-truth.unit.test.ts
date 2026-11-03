/**
 * fix/fee-disclosure-copy — public copy describes today's fee model without a permanent promise.
 *
 * The standard (Terms, "Who pays"; CONCIERGE_OFFER.feeDisclosureLine): "If a home ever pays CareLinkAI a fee when a
 * resident moves in, we tell you before you tour; it never changes your price or which homes we show you."
 *
 * Public copy (pages outside the signed-in areas, the site chrome, SEO / JSON-LD / llms.txt, concierge copy, emails)
 * may NOT:
 *   - say we never take / charge / accept placement fees, commissions or a cut of a move-in;
 *   - say the concierge is paid "never by a home", or that we are "funded by care home operators";
 *   - attack commission-based models ("leans toward whoever pays", "paid a commission by the home").
 * "Today we don't charge homes a placement fee; if that ever changes, …" is allowed: it describes today and
 * carries the disclosure promise.
 */
import fs from 'fs';
import path from 'path';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { buildLlmsTxt } from '@/lib/seo/llms-txt';
import { FEE_MODEL_LINE } from '@/lib/seo/jsonld';

const ROOT = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (src: string) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

/** Signed-in / internal route segments: not public marketing copy. */
const PRIVATE = /^(api|admin|operator|settings|dashboard|caregiver|family|discharge-planner|affiliate|provider|messages|design-preview|marketplace|auth)$/;

function publicSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string, skipPrivate: boolean) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (skipPrivate && PRIVATE.test(e.name)) continue;
        walk(p, skipPrivate);
      } else if (/\.(tsx?|txt)$/.test(e.name) && !/\.test\./.test(e.name) && !p.includes('__tests__')) out.push(p);
    }
  };
  walk(path.join(ROOT, 'src/app'), true);
  for (const d of ['src/components/site', 'src/components/marketing', 'src/lib/seo', 'src/lib/concierge']) walk(path.join(ROOT, d), false);
  for (const f of ['src/lib/email.ts', 'src/lib/email-templates.ts', 'src/lib/contact.ts']) out.push(path.join(ROOT, f));
  return out;
}

const BANNED: { name: string; re: RegExp }[] = [
  { name: 'never takes placement fees / commissions', re: /\b(never|won['’]t|will not|don['’]t ever)\s+(take|takes|charge|charges|accept|accepts|receive|receives|earn|earns)\b[^.\n]{0,40}\b(placement fees?|commissions?|referral fees?|finder['’]?s fees?)/i },
  { name: 'no placement fee from homes, ever', re: /\b(no|never a)\s+(placement fee|commission)s?\b[^.\n]{0,30}\b(from|to) (the )?homes?\b[^.\n]{0,20}\bever\b/i },
  { name: 'don’t take a cut', re: /\b(don['’]t|do not|never|won['’]t)\s+take a cut\b/i },
  { name: 'never by a home', re: /\bnever by a home\b/i },
  { name: 'funded by care home operators', re: /\bfunded by (care home )?operators\b/i },
  { name: 'attacks commission models', re: /leans? toward whoever pays|paid a commission by the home|commission[^.\n]{0,60}\b(bias|biased|leans?|steers?|conflict of interest)\b/i },
];

/** "We don't charge homes a placement fee" is allowed only as today's fact with the disclosure ("Today … if that ever changes"). */
const UNQUALIFIED_NO_FEE = /(?<!Today )\bwe (don['’]t|do not) charge homes a placement fee\b(?![^.\n]*;?\s*if that ever changes)/i;

function violations(text: string): string[] {
  const hits: string[] = [];
  for (const { name, re } of BANNED) {
    const m = text.match(re);
    if (m) hits.push(`${name}: "${m[0]}"`);
  }
  const m = text.match(UNQUALIFIED_NO_FEE);
  if (m) hits.push(`unqualified no-placement-fee promise: "${m[0]}"`);
  return hits;
}

describe('fee model copy: no permanent promise, no attack on commission models', () => {
  it('the patterns catch the copy this PR removed (so the scan is not vacuous)', () => {
    expect(violations('National placement agencies are paid a commission by the home — often a month’s rent — which is why their “free” shortlist leans toward whoever pays.')).not.toEqual([]);
    expect(violations('paid by you, flat, never by a home.')).not.toEqual([]);
    expect(violations('CareLinkAI is funded by care home operators, not families.')).not.toEqual([]);
    expect(violations('We don’t charge homes a placement fee, and we don’t take a cut when a family moves in.')).toHaveLength(2);
    expect(violations('We never take placement fees or commissions.')).not.toEqual([]);
  });

  it('allows today’s fact with the disclosure, and the Terms disclosure itself', () => {
    expect(violations('Today we don’t charge homes a placement fee; if that ever changes, we’ll tell you before you tour.')).toEqual([]);
    expect(violations(CONCIERGE_OFFER.feeDisclosureLine)).toEqual([]);
    expect(violations(CONCIERGE_OFFER.disclosureComparisonLine)).toEqual([]);
  });

  it('no public page, chrome, SEO copy, concierge copy or email breaks the rule', () => {
    const found = publicSources().flatMap((f) => violations(stripComments(fs.readFileSync(f, 'utf8'))).map((v) => `${path.relative(ROOT, f)} → ${v}`));
    expect(found).toEqual([]);
  });

  it('rendered copy: concierge offer, llms.txt and the JSON-LD fee line', () => {
    expect(violations(JSON.stringify(CONCIERGE_OFFER))).toEqual([]);
    expect(violations(buildLlmsTxt())).toEqual([]);
    expect(violations(FEE_MODEL_LINE)).toEqual([]);
  });

  it('the requested replacements are in place', () => {
    expect(CONCIERGE_OFFER.honestyLine).toBe('Homes never pay to be listed or ranked. Your concierge fee is paid by you.');
    const concierge = read('src/app/concierge/page.tsx');
    expect(concierge).toContain('CONCIERGE_OFFER.disclosureComparisonLine');
    expect(concierge).toContain('CONCIERGE_OFFER.feeDisclosureLine');
    expect(read('src/app/terms/page.tsx')).toContain('Homes never pay to be listed or ranked. {CONCIERGE_OFFER.feeDisclosureLine}');
    const hub = read('src/app/cleveland/page.tsx');
    expect(hub).toContain("t: 'No pay-to-rank'");
    expect(hub).toContain('Homes don’t pay to be listed or ranked. Today we don’t charge homes a placement fee; if that ever changes, we’ll tell you before you tour, and it won’t change your price or which homes we show you.');
    const home = read('src/app/HomePageClient.tsx');
    expect(home).toContain('Free for families to search. Homes never pay to be listed or ranked.');
    expect(home).not.toMatch(/funded by care home operators/);
    // Homepage FAQ "What makes CareLinkAI different?" (found by this scan): no "never charge families" / "take a cut".
    expect(home).toContain('Searching is free for families, and homes never pay to be listed or ranked. Today we don’t charge homes a placement fee; if that ever changes, we’ll tell you before you tour.');
    expect(home).not.toMatch(/never charge families|take a cut/);
    const llms = buildLlmsTxt();
    expect(llms).not.toMatch(/No broker fees|lead resale/);
    expect(llms).toContain('Today we don’t charge homes a placement fee; if that ever changes, we tell families before they tour');
    for (const f of publicSources()) expect({ f: path.relative(ROOT, f), hit: /ranked or recommended/.test(fs.readFileSync(f, 'utf8')) }).toEqual({ f: path.relative(ROOT, f), hit: false });
  });
});
