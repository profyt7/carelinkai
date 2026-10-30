/**
 * Homepage truth audit (10/30): "How It Works", "Now Live" and "Coming Soon". These fail if:
 *   - a card promises speed or plumbing that isn't true today ("instantly", "in minutes", "live bed",
 *     "real-time", "employment record", "Stripe collects", SMS / IVR dispatch);
 *   - a flag-off product shows up as live, or shows a price;
 *   - "Now Live" lists text-message features (Twilio A2P not approved) or background-check badges
 *     (Checkr not live) while their flags are off;
 *   - "Coming Soon" brings back the placeholder items, carries a date, or repeats something live;
 *   - the Providers card shows without PROVIDER_LISTING_ENABLED, or the grid stops fitting 4 / 5 cards;
 *   - the care-home footer asks homes to pay to be listed, or the discharge-planner card overpromises.
 */
import { renderToString } from 'react-dom/server';
import HomePageClient from '@/app/HomePageClient';
import { comingSoonItems, nowLiveItems, ROADMAP_FLAGS_OFF } from '@/lib/marketing/roadmap';

type Props = Parameters<typeof HomePageClient>[0];
const section = (html: string, id: string) => {
  const start = html.indexOf(`id="${id}"`);
  return html.slice(start, html.indexOf('</section>', start));
};
const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const render = (p: Props = {}) => {
  const html = renderToString(<HomePageClient {...p} />);
  return { how: text(section(html, 'how-it-works')), roadmap: text(section(html, 'roadmap')), howHtml: section(html, 'how-it-works'), roadmapHtml: section(html, 'roadmap') };
};
const nowLive = (roadmapHtml: string) => text(roadmapHtml.slice(roadmapHtml.indexOf('data-testid="roadmap-now-live"'), roadmapHtml.indexOf('data-testid="roadmap-coming-soon"')));
const comingSoon = (roadmapHtml: string) => text(roadmapHtml.slice(roadmapHtml.indexOf('data-testid="roadmap-coming-soon"')));

const OVERCLAIM = /instantly|in minutes|in seconds|live bed|real-time|realtime|employment record|Stripe collects|under 15 min|3 clicks|IVR|\bSMS\b|text message|auto-dispatch|guarantee/i;
const PRICE = /\$\s?\d/;
const DATE = /\b(Q[1-4]|20\d\d|January|February|March|April|May|June|July|August|September|October|November|December|next month|this (spring|summer|fall|winter))\b/i;

describe('production flags as they are (paid flags off; provider listing about to be on)', () => {
  for (const providerListingOn of [false, true]) {
    describe(`PROVIDER_LISTING ${providerListingOn ? 'on' : 'off'}`, () => {
      const r = render({ providerListingOn });

      it('How It Works and the roadmap make no speed / plumbing overclaims and show no prices', () => {
        expect(r.how).not.toMatch(OVERCLAIM);
        expect(r.roadmap).not.toMatch(OVERCLAIM);
        expect(r.how).not.toMatch(PRICE);
        expect(r.roadmap).not.toMatch(PRICE);
      });

      it('Now Live lists only what works today', () => {
        const live = nowLive(r.roadmapHtml);
        for (const t of ['Caregiver Marketplace', 'Direct Caregiver Hire', 'Caregiver Reliability Score', 'Caregiver Points & Tiers', 'Discharge Planner Portal', 'Provider Marketplace', 'Transport Ride Requests', 'Referral Program']) expect(live).toContain(t);
        for (const t of ['On-Call', 'Shift Auto-fill', 'Compliance Document Kits', 'background', 'Affiliate Program', '20/25/30', 'verified caregivers', 'bookable']) expect(live).not.toContain(t);
        expect(live).toContain('Online payment is coming soon');
        expect(live).toContain('availability shows as verified with a date, or "contact to confirm"');
      });

      it('Coming Soon has the real roadmap (no dates, no placeholders) plus the flag-off features', () => {
        const soon = comingSoon(r.roadmapHtml);
        for (const t of ['Secure in-app payments', 'Family-reported pricing & reviews', 'More provider categories', 'Hospice, home safety, adult day and respite', 'Weekly availability check-ins', 'Text-message shift coverage', 'AI Shift Auto-fill', 'Compliance Document Kits']) expect(soon).toContain(t);
        for (const t of ['Mobile App', 'Video Tours', 'Multi-Language', 'EHR']) expect(soon).not.toContain(t);
        expect(soon).not.toMatch(DATE);
      });

      it('How It Works: Providers card only with the flag; the grid fits 4 or 5 cards cleanly', () => {
        expect(r.howHtml.includes('data-testid="how-providers"')).toBe(providerListingOn);
        expect(r.howHtml).toContain(`data-cards="${providerListingOn ? 5 : 4}"`);
        if (providerListingOn) {
          for (const t of ['List your services free', 'Get found by families and care homes', 'Respond to inquiries']) expect(r.how).toContain(t);
          expect(r.howHtml).toContain('lg:[&amp;&gt;*]:w-[calc((100%-4rem)/3)]');
          expect(r.howHtml).not.toContain('/5)]');
        } else {
          expect(r.howHtml).toContain('lg:[&amp;&gt;*]:w-[calc((100%-6rem)/4)]');
        }
      });

      it('care homes list free; the discharge-planner card describes the real concierge flow', () => {
        expect(r.how).toContain("Free to list. Claim your community's listing or add a new one.");
        expect(r.how).not.toMatch(/Plans from|free trial/i);
        for (const t of ['Send a Case Securely', 'Get Verified Options', "See What's Confirmed"]) expect(r.how).toContain(t);
      });
    });
  }
});

describe('cards follow the flags', () => {
  it('each flag moves its feature between Coming Soon and Now Live, never both', () => {
    const on = { providerListingOn: true, ridesPaymentsOn: true, backgroundChecksOn: true, operatorPlansOn: true, complianceKitsOn: true };
    const live = nowLiveItems(on).map((i) => i.key);
    const soon = comingSoonItems(on).map((i) => i.key);
    expect(live).toEqual(expect.arrayContaining(['autofill', 'kits']));
    expect(soon).not.toEqual(expect.arrayContaining(['autofill']));
    expect(soon).not.toContain('kits');
    const off = ROADMAP_FLAGS_OFF;
    expect(nowLiveItems(off).map((i) => i.key)).not.toEqual(expect.arrayContaining(['autofill']));
    expect(comingSoonItems(off).map((i) => i.key)).toEqual(expect.arrayContaining(['autofill', 'kits']));
    for (const f of [on, off]) {
      const l = new Set(nowLiveItems(f).map((i) => i.key));
      for (const k of comingSoonItems(f).map((i) => i.key)) expect(l.has(k)).toBe(false);
    }
  });

  it('ride payment and background-check wording appear only with their flags', () => {
    const rides = (o: boolean) => nowLiveItems({ ...ROADMAP_FLAGS_OFF, ridesPaymentsOn: o }).find((i) => i.key === 'rides')!.desc;
    expect(rides(false)).toContain('Online payment is coming soon');
    expect(rides(true)).toContain('paid online');
    const market = (o: boolean) => nowLiveItems({ ...ROADMAP_FLAGS_OFF, backgroundChecksOn: o }).find((i) => i.key === 'caregiver-marketplace')!.desc;
    expect(market(false)).not.toMatch(/background/i);
    expect(market(true)).toContain('background-check badges');
  });

  it('text-message shift coverage stays in Coming Soon whatever the flags (no A2P campaign yet)', () => {
    const on = { providerListingOn: true, ridesPaymentsOn: true, backgroundChecksOn: true, operatorPlansOn: true, complianceKitsOn: true };
    expect(comingSoonItems(on).map((i) => i.key)).toContain('sms-coverage');
    expect(nowLiveItems(on).map((i) => i.desc).join(' ')).not.toMatch(/\bSMS\b|text message|IVR/i);
  });
});

describe('LIVE TODAY features block and trust stats (OL-240)', () => {
  const html = renderToString(<HomePageClient />);
  const features = text(section(html, 'features'));
  const stats = text(section(html, 'testimonials'));
  // Phrases removed in this audit; none may come back (the whole-page render test covers tabs and FAQs).
  const GONE = /in minutes|Responds in seconds|60% faster|Saves 5\+ hours|Hire in 3 clicks|3 clicks|employment record|created instantly|instantly|< ?15 min|50\+|SMS|IVR|real time/i;

  it('describes what each feature does, with no unsourced numbers or speed claims', () => {
    expect(features).not.toMatch(GONE);
    expect(features).not.toMatch(PRICE);
    expect(features).not.toContain('On-Call AI Shift Coverage');
    for (const t of ['AI drafts a personalized reply', 'The caregiver gets an in-app notification', 'both get a confirmation email']) expect(features).toContain(t);
  });

  it('trust stats carry no unsourced numbers', () => {
    expect(stats).not.toMatch(GONE);
    expect(stats).not.toMatch(/On-Call AI Shift Fill|AI Match Data Points/);
    expect(stats).toContain('To List Your Community');
  });
});

describe('founder UX truth (OL-241): no unsourced figures or callback promises we can\'t keep', () => {
  // "$5,000 mistake" had no source; "one business hour" is a callback time nobody guarantees yet.
  const BANNED = /\$5,000 mistake|one business hour/i;
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');

  it('the rendered homepage carries neither phrase, and the concierge block leads with the verified shortlist', () => {
    const html = renderToString(<HomePageClient />);
    expect(text(html)).not.toMatch(BANNED);
    expect(text(html)).toContain('Get a verified shortlist before you commit to a home.');
  });

  it('neither phrase is anywhere in the homepage source or the shared contact line (FAQ answers render on click)', () => {
    for (const f of ['src/app/HomePageClient.tsx', 'src/lib/contact.ts']) {
      expect(fs.readFileSync(path.join(process.cwd(), f), 'utf8')).not.toMatch(BANNED);
    }
  });
});
