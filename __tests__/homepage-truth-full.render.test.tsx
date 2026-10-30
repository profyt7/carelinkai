/**
 * @jest-environment jsdom
 *
 * Homepage truth audit, whole page (OL-240). Renders the homepage with production flags as they are,
 * opens every benefits tab and every FAQ answer, and fails if any of it:
 *   - makes an unsourced speed / time / percentage claim ("in minutes", "Responds in seconds",
 *     "60% faster", "Saves 5+ hours", "Hire in 3 clicks", "< 15 min", "50+ data points" …);
 *   - promises plumbing that isn't live (employment records, Stripe collecting payment, SMS dispatch);
 *   - shows a price for a product whose flag is off (operator plans, Caregiver Pro, background checks,
 *     compliance kits, affiliate commission rates). The Family Concierge is a live, founder-run offer
 *     (request mode without checkout, src/lib/concierge/offer.ts), so its $399 price and 2-business-day
 *     guarantee are allowed.
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import HomePageClient from '@/app/HomePageClient';
import { loadProductTour } from '@/lib/marketing/product-tour';

jest.mock('framer-motion', () => {
  const React = require('react');
  const strip = ({ initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, viewport, layout, ...rest }: any) => rest;
  const motion = new Proxy({}, { get: (_t, tag: string) => React.forwardRef(function MotionStub(p: any, ref: any) { return React.createElement(tag, { ...strip(p), ref }); }) });
  return { motion, AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children), useInView: () => true };
});
jest.mock('@/hooks/usePaidFeatures', () => ({ usePaidFeature: () => ({ enabled: false, loading: false }) }));
jest.mock('next/image', () => function Image(p: any) { return require('react').createElement('img', { alt: p.alt, src: typeof p.src === 'string' ? p.src : '' }); });
jest.mock('@/components/marketing/DemoRequestForm', () => function DemoRequestForm() { return null; });

beforeAll(() => {
  window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as any);
});

const TABS = ['For Families', 'For Operators', 'For Caregivers', 'For Healthcare', 'For Providers', 'For Affiliates'];

/**
 * Every piece of copy a visitor can reach: the page, each benefits tab, each FAQ answer.
 * Buttons are re-queried before every click: the page's AnimatedSection wrapper is declared inside the
 * component, so each state change remounts its children and old element references go stale.
 */
function allText(props: Parameters<typeof HomePageClient>[0]) {
  const { container } = render(<HomePageClient {...props} />);
  const chunks = [container.textContent ?? ''];
  const tabs = () => Array.from(container.querySelectorAll('#benefits button'));
  const faqs = () => Array.from(container.querySelectorAll('button')).filter((b) => /\?\s*$/.test((b.textContent ?? '').trim()));
  const tabLabels = tabs().map((b) => b.textContent);
  for (const label of tabLabels) {
    fireEvent.click(tabs().find((b) => b.textContent === label)!);
    chunks.push(container.textContent ?? '');
  }
  // Opening one answer closes the previous one, so a single click per question reaches every answer.
  const questions = faqs().map((b) => b.textContent);
  for (const q of questions) {
    fireEvent.click(faqs().find((b) => b.textContent === q)!);
    chunks.push(container.textContent ?? '');
  }
  return { text: chunks.join('\n'), tabsClicked: tabLabels.length, faqs: questions.length, tabLabels };
}

const SPEED = /in minutes|within minutes|under 15 min|< ?15 min|in seconds|Responds in seconds|\d+% faster|Saves \d+\+? hours|\d clicks|hours instead of days|days, not months|50\+|\b5[- ]min|\(5 min\)|Setup in \d+ minutes|instantly|filling the shift/i;
const PLUMBING = /employment record|Stripe (collects|handles)|via SMS|SMS and IVR|\bIVR\b|texts caregivers/i;
// "$0" is allowed (free); so is the live Family Concierge offer. Any other price needs its product's flag on.
const CONCIERGE = /\$399|\$5,000/g;
const PRICE = /\$\s?[1-9]/;
const RATE = /\b\d{2}%|\d{2}–\d{2}%/;

/** The matching snippets, so a failure names the offending copy instead of dumping the page. */
const hits = (text: string, re: RegExp) => {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  return Array.from(new Set(Array.from(text.matchAll(g), (m) => text.slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 40))));
};

describe('whole homepage, production flags (paid and booking flags off)', () => {
  for (const providerListingOn of [false, true]) {
    it(`PROVIDER_LISTING ${providerListingOn ? 'on' : 'off'}: no speed claims, no dead plumbing, no prices or rates`, () => {
      const { text, tabsClicked, faqs } = allText({ providerListingOn });
      expect(tabsClicked).toBeGreaterThanOrEqual(TABS.length);
      expect(faqs).toBeGreaterThanOrEqual(10);
      expect(hits(text, SPEED)).toEqual([]);
      expect(hits(text, PLUMBING)).toEqual([]);
      expect(hits(text.replace(CONCIERGE, ''), PRICE)).toEqual([]);
      expect(hits(text, RATE)).toEqual([]);
      expect(hits(text, /Plans from|free trial|Start Free Trial|Care homes pay/i)).toEqual([]);
      expect(text).toContain('Care Homes List Free');
      // Proof the tabs and FAQ answers were really opened (their copy only renders on click).
      for (const t of ['Resident Transport Requests', 'Referral Tracking', 'Concierge Placement Help', 'Ohio assisted-living compliance document kits', 'both of you get a confirmation email']) expect(text).toContain(t);
      expect(text).not.toContain('On-Call AI Shift');
    });
  }

  it('How It Works subtitle names providers only with PROVIDER_LISTING', () => {
    expect(allText({}).text).toContain('Free for families, caregivers and discharge planners. Free to list for care homes.');
    const on = allText({ providerListingOn: true }).text;
    expect(on).toContain('Free for families, caregivers and discharge planners. Free to list for care homes and providers.');
  });
});

describe('prices come back only with their flags', () => {
  it('operator plans, Caregiver Pro, background checks and kits', () => {
    const { text } = allText({ operatorPlansOn: true, caregiverProOn: true, backgroundChecksOn: true, complianceKitsOn: true });
    for (const t of ['$99', '$249', 'Pro ($19/mo)', 'from $19.99', '$149–$199', 'AI Shift Auto-fill']) expect(text).toContain(t);
    expect(text).not.toContain('Care Homes List Free');
    // Speed claims stay out whatever the flags.
    expect(hits(text, SPEED)).toEqual([]);
  });
});

describe('"See CareLinkAI in action" section', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_DEMO_VIDEO_ID;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_DEMO_VIDEO_ID;
    else process.env.NEXT_PUBLIC_DEMO_VIDEO_ID = ORIGINAL;
  });
  const demo = () => document.querySelector('#request-demo') as HTMLElement;

  it('no video id: no Watch Demo button, no placeholder tile, no setup text anywhere', () => {
    delete process.env.NEXT_PUBLIC_DEMO_VIDEO_ID;
    const { text } = allText({});
    for (const t of ['Set NEXT_PUBLIC', 'NEXT_PUBLIC_DEMO_VIDEO_ID', 'Watch Demo', 'Watch the overview', 'Demo video coming soon', 'See every feature in action']) expect(text).not.toContain(t);
    expect(demo().querySelector('iframe')).toBeNull();
    expect(demo().querySelector('[data-testid="product-tour"]')).toBeNull();
  });

  it('intro speaks to every audience; bullets are live capabilities only (no billing, analytics)', () => {
    delete process.env.NEXT_PUBLIC_DEMO_VIDEO_ID;
    const { text } = allText({});
    expect(text).toContain("Request a personalized walkthrough. We'll show families how to find and compare verified communities, and show care homes, caregivers and providers how to manage inquiries, staffing and listings in one place.");
    expect(text).not.toMatch(/billing, analytics/i);
    const bullets = Array.from(demo().querySelectorAll('[data-testid="demo-capabilities"] li'), (li) => li.textContent?.replace('✓', '').trim());
    expect(bullets).toEqual([
      'Operator dashboard: inquiries, residents, shifts',
      'Inquiry pipeline with AI-drafted replies',
      'Marketplace: applications, direct hire, per-diem shifts',
      'Family portal: search, documents, messaging',
    ]);
    // Still true with every paid flag on: billing / analytics never come back here.
    const on = allText({ operatorPlansOn: true, caregiverProOn: true, backgroundChecksOn: true, complianceKitsOn: true, providerListingOn: true }).text;
    expect(on).not.toMatch(/billing, analytics/i);
  });

  it('video id set: Watch Demo + the embed show as before, still no setup text', () => {
    process.env.NEXT_PUBLIC_DEMO_VIDEO_ID = 'abc123XYZ';
    const { container } = render(<HomePageClient />);
    expect(container.textContent).toContain('Watch Demo');
    expect(container.querySelector('#request-demo iframe')?.getAttribute('src')).toContain('youtube.com/embed/abc123XYZ');
    expect(container.textContent).not.toContain('Set NEXT_PUBLIC');
  });

  it('the committed tour renders in the section, with the 90-second lead and the sample-data note', () => {
    const tour = loadProductTour();
    expect(tour).not.toBeNull();
    const { container } = render(<HomePageClient tour={tour} />);
    const demo = container.querySelector('#request-demo')!;
    expect(demo.querySelector('[data-testid="product-tour"]')).not.toBeNull();
    expect(demo.textContent).toContain("Take a 90-second tour, or request a personalized walkthrough. We'll show families how to find and compare verified communities, and show care homes, caregivers and providers how to manage inquiries, staffing and listings in one place.");
    expect(demo.textContent).toContain('All names, homes and prices shown are sample data.');
  });
});
