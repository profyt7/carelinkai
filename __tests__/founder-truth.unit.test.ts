/**
 * OL-248 — founder and app-wide truth.
 *  a. The Founding Operator card promises only verified tools; no fixed free duration, "unlimited",
 *     "full access", "priority support" or future discounts; plan cards and trial copy only with plans ON.
 *  b. How-To guides drop On-Call "texts and calls" and plan prices unless their flags are on.
 *  c. Founder status comes only from the claim link; an existing free period is never reset.
 *  e. The discharge-planner dashboard makes no speed claim.
 *  f. Banned phrases on every app page (not just the homepage).
 */
import fs from 'fs';
import path from 'path';
import { FOUNDING_OPERATOR_HEADLINE, FOUNDING_OPERATOR_TOOLS } from '@/lib/operator/founding-offer';
import { withLearnFlags, LEARN_FLAGS_OFF } from '@/lib/howto/flags';
import { HOWTO_GUIDES, getHowToGuide } from '@/app/learn/howto/content';
import { founderUpdateFromClaim, FOUNDER_FREE_ACCESS_DAYS } from '@/lib/claim-founder';

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), 'utf8');
const ONBOARDING = 'src/app/operator/onboarding/[step]/page.tsx';

describe('a. Founding Operator card', () => {
  it('headline and tools, word for word rules', () => {
    expect(FOUNDING_OPERATOR_HEADLINE).toBe('Founding Operator — Free listing. No credit card required.');
    expect(FOUNDING_OPERATOR_TOOLS).toContain('Direct founder support');
    const all = [FOUNDING_OPERATOR_HEADLINE, ...FOUNDING_OPERATOR_TOOLS].join('\n');
    expect(all).not.toMatch(/\d+\s*months?|unlimited|full (platform )?access|priority support|discount|% off|forever|On-Call|auto-?fill|SMS|text/i);
  });

  it('the onboarding page renders the card from that list and drops the old promises', () => {
    const src = read(ONBOARDING);
    expect(src).toContain('FOUNDING_OPERATOR_HEADLINE');
    expect(src).toContain('FOUNDING_OPERATOR_TOOLS.map');
    for (const gone of ['Free for 6 months', '6 months free', '6 months of free access', 'Full platform access', 'Cleveland Founder Program'])
      expect(src).not.toContain(gone);
  });

  it('plan cards and trial copy render only once plans are loaded and ON (nothing flashes while loading)', () => {
    const src = read(ONBOARDING);
    expect(src).toContain('const [plansLoaded, setPlansLoaded] = useState(false);');
    expect(src).toMatch(/!plansLoaded \? \(\s*<div[^>]*data-testid="onboarding-plans-loading"/);
    // The paid list filters by the server's purchasable tiers only (no pre-load fallback list).
    expect(src).toContain('PLANS.filter((plan) => (availablePlans ?? []).includes(plan.key))');
    expect(src).not.toContain('availablePlans === null ? plan.key !== "AGENCY"');
  });
});

describe('b. How-To guides follow the flags', () => {
  const off = (slug: string) => withLearnFlags(getHowToGuide(slug)!, LEARN_FLAGS_OFF);
  const text = (g: ReturnType<typeof off>) => JSON.stringify({ t: g.title, s: g.summary, w: g.whoFor, st: g.steps, tp: g.tips, f: g.faq });

  it('flags off: no On-Call texts/calls, no auto-fill, no operator plan prices anywhere (Provider Boost is live and stays)', () => {
    for (const g of HOWTO_GUIDES.map((x) => withLearnFlags(x, LEARN_FLAGS_OFF))) {
      const t = text(g);
      expect({ slug: g.slug, oncall: /texts and calls|text\/call|On-Call AI/i.test(t), price: /\$(99|249|499|799)\b/.test(t) }).toEqual({ slug: g.slug, oncall: false, price: false });
    }
    expect(off('shifts-and-oncall-ai').title).toBe('Shifts');
    expect(text(off('shifts-and-oncall-ai'))).not.toMatch(/Auto-fill/);
    expect(off('analytics-and-billing').title).toBe('Analytics');
    expect(off('analytics-and-billing').steps.some((s) => /Export Inquiries CSV/.test(s.text))).toBe(true);
  });

  it('flags on: the full copy comes back', () => {
    const on = { onCall: true, operatorPlans: true };
    expect(text(withLearnFlags(getHowToGuide('shifts-and-oncall-ai')!, on))).toMatch(/texts and calls/);
    expect(text(withLearnFlags(getHowToGuide('analytics-and-billing')!, on))).toMatch(/\$249\/mo/);
  });

  it('the learn pages render guides through withLearnFlags', () => {
    expect(read('src/app/learn/page.tsx')).toContain('withLearnFlags(g, learnFlags)');
    expect(read('src/app/learn/howto/[slug]/page.tsx')).toContain('withLearnFlags(raw, flags)');
  });
});

describe('c. founder status from the link only; the free period is never reset', () => {
  const now = new Date('2026-11-01T00:00:00Z');
  it('a founder link on a fresh operator sets founder + one free period', () => {
    const d = founderUpdateFromClaim({ clevelandFounder: false, freeAccessUntil: null }, { clevelandFounder: true, homeId: 'h1' }, now);
    expect(d).toEqual({ clevelandFounder: true, freeAccessUntil: new Date(now.getTime() + FOUNDER_FREE_ACCESS_DAYS * 864e5), seededHomeId: 'h1' });
  });
  it('a cohort link minted clevelandFounder:false never makes a founder or a free period', () => {
    expect(founderUpdateFromClaim({ clevelandFounder: false, freeAccessUntil: null }, { clevelandFounder: false, homeId: 'h2' }, now)).toEqual({ seededHomeId: 'h2' });
  });
  it('claiming another home keeps the existing free period and founder flag untouched', () => {
    const existing = { clevelandFounder: true, freeAccessUntil: new Date('2026-12-01T00:00:00Z') };
    expect(founderUpdateFromClaim(existing, { clevelandFounder: true, homeId: 'h3' }, now)).toEqual({ seededHomeId: 'h3' });
    // …and a non-founder link never clears founder status.
    expect(founderUpdateFromClaim(existing, { clevelandFounder: false }, now)).toEqual({ seededHomeId: null });
  });
  it('both write paths use the helper (no hard-coded founder: true or +6 months)', () => {
    for (const f of ['src/app/api/operator/claim/route.ts', 'src/app/api/auth/register/route.ts']) {
      const src = read(f);
      expect(src).toContain('founderUpdateFromClaim(');
      expect(src).not.toMatch(/data:\s*\{[^}]*clevelandFounder:\s*true|setMonth\(.*\+ 6\)|60 \* 24 \* 180/s);
    }
  });
});

describe('e + f. banned phrases on app pages', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
    }
  };
  walk('src/app');
  walk('src/components');
  walk('src/lib/concierge');

  it('the discharge-planner dashboard sends a referral, it does not promise speed', () => {
    const src = read('src/app/discharge-planner/_components/DischargePlannerDashboard.tsx');
    expect(src).toContain('Send a referral and get a shortlist, with each home&apos;s availability clearly labeled.');
    expect(src).not.toMatch(/in seconds/i);
  });

  it('no "in seconds", "$5,000 mistake", "or you pay nothing", "2 business days", "pay only after we deliver" in any page or component', () => {
    const hits = files.flatMap((f) =>
      read(f).split('\n').flatMap((line, i) =>
        /in seconds|\$5,000 mistake|or you pay nothing|2 business days|two business days|pay only after we deliver/i.test(line) ? [`${f}:${i + 1}`] : [],
      ),
    );
    expect(hits).toEqual([]);
  });

  it('"14-day free trial" appears only on a line gated by the plans flag', () => {
    const ungated = files.flatMap((f) => {
      const lines = read(f).split('\n');
      return lines.flatMap((line, i) => {
        if (!/14-day free trial/i.test(line)) return [];
        const ctx = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
        return /operatorPlansOn|plansEnabled|OPERATOR_PLANS/.test(ctx) ? [] : [`${f}:${i + 1}`];
      });
    });
    expect(ungated).toEqual([]);
  });
});
