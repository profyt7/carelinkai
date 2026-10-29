/**
 * @jest-environment jsdom
 *
 * OL-226 privacy guard. These fail if:
 *   - a non-allowlisted key reaches the transport;
 *   - an email, a phone number or a long free-text string reaches it;
 *   - the free-text search query appears in any payload or page path;
 *   - inquiry_submitted / tour_requested can fire outside the success branch of a 2xx POST;
 *   - anything is sent, or a session id created, without analytics consent.
 */
import fs from 'fs';
import path from 'path';
import {
  ANON_SESSION_KEY,
  EVENT_SCHEMA,
  FUNNEL_EVENT_NAMES,
  resultCountBucket,
  sanitizeEvent,
  setTransportForTests,
  track,
  trackPageView,
} from '@/lib/analytics/events';
import { looksSensitive, routePattern, sanitizePath } from '@/lib/analytics/sanitize';

const CONSENT_KEY = 'carelinkai_cookie_consent';
const QUERY = 'memory care for my mom jane doe near beachwood';
const EMAIL = 'jane.doe@example.com';
const PHONE = '(216) 555-0199';

type Sent = { name: string; props: Record<string, unknown>; sid: string };
let sent: Sent[] = [];
let restore: () => void;

function consent(analytics: boolean) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ necessary: true, analytics, marketing: false }));
}

beforeAll(() => {
  if (!(globalThis.crypto && 'randomUUID' in globalThis.crypto)) {
    Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => '3f2a9c1e-5b7d-4e2f-9a1c-0d8e7f6a5b4c' }, configurable: true });
  }
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sent = [];
  restore = setTransportForTests((name, props, sid) => sent.push({ name, props, sid }));
});
afterEach(() => restore());

const everyString = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(everyString) : v && typeof v === 'object' ? Object.values(v).flatMap(everyString) : [];

describe('consent', () => {
  it('page views: nothing without consent; with consent only the event name, no props', () => {
    trackPageView();
    consent(false);
    trackPageView();
    expect(sent).toHaveLength(0);
    consent(true);
    trackPageView();
    expect(sent).toEqual([{ name: 'page_view', props: {}, sid: expect.any(String) }]);
  });

  it('sends nothing and creates no session id without analytics consent', () => {
    track('inquiry_started', { listing_id: 'cmhome123abc', entry: 'rail' });
    consent(false);
    track('inquiry_started', { listing_id: 'cmhome123abc', entry: 'rail' });
    expect(sent).toHaveLength(0);
    expect(sessionStorage.getItem(ANON_SESSION_KEY)).toBeNull();
  });

  it('sends with consent, with a random session id in sessionStorage (no cookie)', () => {
    consent(true);
    track('inquiry_started', { listing_id: 'cmhome123abc', entry: 'cta_bar' });
    expect(sent).toHaveLength(1);
    expect(sent[0].sid).toBe(sessionStorage.getItem(ANON_SESSION_KEY));
    expect(document.cookie).toBe('');
  });
});

describe('allowlist', () => {
  beforeEach(() => consent(true));

  it('drops every key that is not allowlisted for the event', () => {
    track('search_performed', {
      has_budget_filter: true,
      has_location_filter: false,
      verified_only: false,
      medicaid_waiver: false,
      view: 'grid',
      result_count_bucket: '6-20',
      // not allowlisted:
      ...({ query: QUERY, q: QUERY, location: 'Beachwood', email: EMAIL, name: 'Jane' } as object),
    } as never);
    expect(sent).toHaveLength(1);
    const allowed = Object.keys(EVENT_SCHEMA.search_performed);
    for (const key of Object.keys(sent[0].props)) expect(allowed).toContain(key);
    expect(sent[0].props).not.toHaveProperty('query');
    expect(sent[0].props).not.toHaveProperty('q');
  });

  it('every event only ever carries its allowlisted keys (fuzz with extras)', () => {
    const extras = { message: 'hello', notes: 'x', phone: PHONE, email: EMAIL, careNeeds: ['dementia'], diagnosis: 'x', userId: 'u1' };
    for (const name of FUNNEL_EVENT_NAMES) {
      const out = sanitizeEvent(name, { ...extras, listing_id: 'cmhome123abc' });
      expect(out).not.toBeNull();
      const allowed = Object.keys(EVENT_SCHEMA[name]);
      for (const key of Object.keys(out!.props)) expect(allowed).toContain(key);
      for (const key of Object.keys(extras)) expect(out!.props).not.toHaveProperty(key);
    }
  });

  it('rejects unknown event names', () => {
    expect(sanitizeEvent('explain_match_opened', { homeId: 'x' })).toBeNull();
    expect(sanitizeEvent('personalization_applied', {})).toBeNull();
  });

  it('rejects out-of-enum and wrong-typed values', () => {
    const out = sanitizeEvent('listing_clicked', {
      listing_id: 'cmhome123abc', position: 9999, source: 'email', availability_state: 'maybe', has_photo: 'yes', has_price: true,
    });
    expect(out!.props).toEqual({ listing_id: 'cmhome123abc', has_price: true });
  });
});

describe('screening of values', () => {
  beforeEach(() => consent(true));

  it.each([
    ['email', EMAIL],
    ['phone', PHONE],
    ['phone digits', '2165550199'],
    ['phone intl', '+1 216 555 0199'],
    ['free text > 40 chars', 'x'.repeat(41)],
    ['search query', QUERY],
  ])('a %s never reaches the transport', (_label, bad) => {
    track('inquiry_started', { listing_id: bad, entry: 'rail' });
    track('concierge_clicked', { source_page: bad });
    track('listing_clicked', { listing_id: bad, position: 1, source: 'search', availability_state: 'verified', has_photo: true, has_price: true });
    for (const s of sent) {
      for (const v of everyString(s.props)) {
        expect(v).not.toBe(bad);
        expect(looksSensitive(v)).toBe(false);
      }
    }
  });

  it('opaque ids with digit runs (cuid / uuid) are not mistaken for phone numbers', () => {
    expect(looksSensitive('cmql0xbos0006r7jcitqgqhds')).toBe(false);
    expect(looksSensitive('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    track('profile_viewed', { listing_id: 'cmql0xbos0006r7jcitqgqhds', availability_state: 'unverified', has_photo: false, has_price: false, claimed: false, has_inspection: false });
    expect(sent[0].props.listing_id).toBe('cmql0xbos0006r7jcitqgqhds');
  });
});

describe('page paths', () => {
  it('strips the search query and every non-allowlisted param', () => {
    const p = sanitizePath(`/search?q=${encodeURIComponent(QUERY)}&location=Beachwood&name=Jane&email=${encodeURIComponent(EMAIL)}&phone=2165550199&message=hi&notes=x&view=grid&page=2`);
    expect(p).toBe('/search?view=grid&page=2');
    expect(p).not.toContain('memory');
    expect(p).not.toContain('q=');
  });

  it('keeps the origin for an absolute page_location and drops fragments', () => {
    expect(sanitizePath('https://getcarelinkai.com/search?q=mom#x', 'https://getcarelinkai.com')).toBe('https://getcarelinkai.com/search');
  });

  it('drops allowlisted params whose values are not short tokens', () => {
    expect(sanitizePath(`/search?view=${encodeURIComponent(EMAIL)}&page=${'1'.repeat(30)}`)).toBe('/search');
  });

  it('route patterns never carry concrete ids or queries', () => {
    expect(routePattern('/homes/cmql0xbos0006r7jcitqgqhds?q=mom')).toBe('/homes/[id]');
    expect(routePattern('/cleveland/assisted-living/beachwood')).toBe('/cleveland/assisted-living/[suburb]');
    expect(routePattern('/search?q=mom')).toBe('/search');
  });
});

describe('search_performed carries no free text', () => {
  beforeEach(() => consent(true));

  it('payload has only filter shape + a bucket', () => {
    track('search_performed', {
      care_levels: ['MEMORY_CARE'],
      has_budget_filter: false,
      has_location_filter: true,
      verified_only: true,
      medicaid_waiver: false,
      view: 'list',
      result_count_bucket: resultCountBucket(37),
    });
    const json = JSON.stringify(sent);
    expect(json).not.toContain('beachwood');
    expect(json).not.toContain('mom');
    expect(sent[0].props.result_count_bucket).toBe('21+');
  });

  it('the /search page builds search_performed from filters only (never the query or location text)', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/app/search/page.tsx'), 'utf8');
    const start = src.indexOf("track('search_performed'");
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, src.indexOf('});', start));
    expect(block).not.toMatch(/params\.query|naturalQuery|params\.location\b(?! \|\|)/);
    expect(block).toMatch(/has_location_filter: Boolean\(params\.location \|\| params\.radius\)/);
  });
});

describe('submitted / requested fire only on success', () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'src/app/homes/[id]/page.tsx'), 'utf8');

  it('inquiry_submitted is emitted once, after the !res.ok early return and the confirmation step', () => {
    const occurrences = page.split("track('inquiry_submitted'").length - 1;
    expect(occurrences).toBe(1);
    const at = page.indexOf("track('inquiry_submitted'");
    const handler = page.lastIndexOf('const handleTourSchedule', at);
    expect(handler).toBeGreaterThan(-1);
    const body = page.slice(handler, at);
    const failBranch = body.indexOf('if (!res.ok) {');
    expect(failBranch).toBeGreaterThan(-1);
    expect(body.indexOf('return;', failBranch)).toBeGreaterThan(failBranch);
    expect(body.lastIndexOf('setBookingStep(3);')).toBeGreaterThan(body.indexOf('return;', failBranch));
    // …and not in a catch block or a click handler.
    expect(body.slice(body.lastIndexOf('setBookingStep(3);'))).not.toMatch(/catch\s*\(/);
  });

  it('tour_requested fires only from success branches (form 2xx with a tour date, DP tour ok, modal confirmed)', () => {
    const idx: number[] = [];
    let i = page.indexOf("track('tour_requested'");
    while (i !== -1) { idx.push(i); i = page.indexOf("track('tour_requested'", i + 1); }
    expect(idx).toHaveLength(3);
    for (const at of idx) {
      const before = page.slice(Math.max(0, at - 400), at);
      expect(before).toMatch(/setBookingStep\(3\)|setConciergeTourState\('done'\)|onConfirmed=\{\(\) => $/m);
    }
    const modal = fs.readFileSync(path.join(process.cwd(), 'src/components/tours/TourRequestModal.tsx'), 'utf8');
    const call = modal.indexOf('onConfirmed?.()');
    expect(call).toBeGreaterThan(modal.indexOf('if (!response.ok)'));
    expect(modal.slice(modal.lastIndexOf('if (data.success)', call), call)).toContain('setCurrentStep("confirmation")');
  });

});

// OL-228 / OL-229: the Meta Pixel and Microsoft Clarity are gone from the app, and stay gone.
describe('no Meta Pixel or Microsoft Clarity anywhere in src/', () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
      return /\.(tsx?|jsx?|mjs)$/.test(e.name) ? [p] : [];
    });
  const files = walk(path.join(process.cwd(), 'src'));
  const FORBIDDEN: Array<[string, RegExp]> = [
    ['fbq() call', /\bfbq\s*\(/],
    ['Meta Pixel loader', /connect\.facebook\.net|fbevents\.js|facebook\.com\/tr\b/],
    ['Pixel env var', /NEXT_PUBLIC_(FACEBOOK|FB)_PIXEL/],
    ['Clarity loader', /clarity\.ms/],
    ['Clarity env var', /NEXT_PUBLIC_CLARITY/],
    ['Clarity API', /window\.clarity|\(window as any\)\.clarity|data-clarity-/],
  ];

  it('scans a real file set', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it.each(FORBIDDEN)('no %s', (_label, re) => {
    const hits = files.filter((f) => re.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(process.cwd(), f));
    expect(hits).toEqual([]);
  });

  it('.env.example documents neither tracker id', () => {
    const env = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
    expect(env).not.toMatch(/^NEXT_PUBLIC_(FACEBOOK_PIXEL|FB_PIXEL|CLARITY)\w*=/m);
  });
});
