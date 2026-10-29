/**
 * OL-230: inquiry / tour / concierge / search handlers and their API routes never log a
 * user-entered field, and Sentry never receives one (or a free-text search query).
 */
import fs from 'fs';
import path from 'path';
import { errorSummary } from '@/lib/log-safe';
import { scrubBreadcrumb, scrubErrorText, scrubEvent, scrubUrlsInString } from '@/lib/sentry/scrub-event';
import { scrubPhi } from '@/lib/phi-scrubber';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const scanner = require('../scripts/pii-log-scan.cjs') as {
  SCOPE: string[];
  filesInScope: () => string[];
  scanAll: () => Array<{ file: string; line: number; reasons: string[]; text: string }>;
  scanSource: (file: string, text: string) => Array<{ reasons: string[] }>;
};

describe('log guard: no user-entered field reaches console/logger', () => {
  it('covers the inquiry, tour, concierge and search handlers and routes', () => {
    const files = scanner.filesInScope().map((f) => path.relative(process.cwd(), f));
    for (const must of [
      'src/app/homes/[id]/page.tsx',
      'src/components/tours/TourRequestModal.tsx',
      'src/app/concierge/ConciergeRequestForm.tsx',
      'src/app/concierge/ConciergeScreener.tsx',
      'src/app/api/inquiries/route.ts',
      'src/app/api/family/tours/request/route.ts',
      'src/app/api/concierge/request/route.ts',
      'src/app/api/discharge-planner/concierge/[id]/tour/route.ts',
      'src/app/api/search/route.ts',
    ]) {
      expect(files).toContain(must);
    }
  });

  it('finds zero unsafe log calls in scope', () => {
    const hits = scanner.scanAll().map((h) => `${h.file}:${h.line} [${h.reasons.join(', ')}] ${h.text}`);
    expect(hits).toEqual([]);
  });

  // The guard itself must catch the patterns that used to be in the code.
  it.each([
    ["console.log('  ├─ inquiryForm.email:', inquiryForm.email);", 'client'],
    ["console.log('state', { name: inquiryForm.name, phone: inquiryForm.phone });", 'client'],
    ["console.log('Request payload:', JSON.stringify(payload, null, 2));", 'client'],
    ["console.log('Raw body:', JSON.stringify(body));", 'route'],
    ["console.log('Body fields:', { notes: validatedData.familyNotes });", 'route'],
    ["console.info(`search for ${q}`);", 'route'],
    ["console.warn('query', searchParams.get('q'));", 'route'],
    ["console.log('Care needs', residentName, careNeeded);", 'client'],
    ["console.log({ email });", 'client'],
    ["console.error('Error creating inquiry:', error);", 'route'],
    ["console.error('Error message:', error.message);", 'route'],
    ["console.error('Validation errors:', JSON.stringify(error.errors));", 'route'],
  ])('flags %s', (code, where) => {
    const file = where === 'route' ? 'src/app/api/x/route.ts' : 'src/app/x/page.tsx';
    expect(scanner.scanSource(file, code).length).toBe(1);
  });

  it.each([
    "console.error('Error creating inquiry:', errorSummary(error));",
    "console.error('[TOUR API] home not active', home.status);",
    "console.warn(`[search] ${totalCount} matches exceed the cap`);",
    "console.error('Analytics track error', err instanceof Error ? err.name : 'unknown');",
  ])('allows %s', (code) => {
    expect(scanner.scanSource('src/app/api/x/route.ts', code)).toEqual([]);
  });

  it('errorSummary keeps only the class and code', () => {
    const e = Object.assign(new Error('Invalid `prisma.inquiry.create()` invocation: { contactEmail: "a@b.co" }'), { code: 'P2002' });
    e.name = 'PrismaClientKnownRequestError';
    expect(errorSummary(e)).toBe('PrismaClientKnownRequestError P2002');
    expect(errorSummary(new TypeError('Jane Doe 216-555-0100'))).toBe('TypeError');
    expect(errorSummary('a@b.co')).toBe('string');
  });

  it('the old listing handler diagnostics are gone', () => {
    const page = fs.readFileSync(path.join(process.cwd(), 'src/app/homes/[id]/page.tsx'), 'utf8');
    expect(page).not.toMatch(/TOUR DIAGNOSTIC|inquiryForm\.(email|phone|name):/);
    const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/family/tours/request/route.ts'), 'utf8');
    expect(route).not.toMatch(/Raw body|Body fields|Family details|Data to insert/);
  });
});

describe('Sentry scrubbing: no search query or inquiry field', () => {
  it('strips query strings from URLs in any string', () => {
    expect(scrubUrlsInString('https://getcarelinkai.com/search?q=mom%20dementia%20jane&view=map')).toBe('https://getcarelinkai.com/search?view=map');
    expect(scrubUrlsInString('GET /api/search?q=jane+doe&page=2')).toBe('GET /api/search?page=2');
    expect(scrubUrlsInString('/search?q=x')).toBe('/search');
    expect(scrubUrlsInString('no url here?')).toBe('no url here?');
  });

  it('drops console breadcrumbs and scrubs navigation/fetch URLs', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'inquiryForm.email: a@b.co' })).toBeNull();
    const nav = scrubBreadcrumb({ category: 'navigation', data: { from: '/', to: '/search?q=jane%20doe%20alzheimers' } });
    expect(nav?.data).toEqual({ from: '/', to: '/search' });
    const fetchCrumb = scrubBreadcrumb({ category: 'fetch', data: { url: '/api/search?q=jane&view=list', method: 'GET' } });
    expect(fetchCrumb?.data).toEqual({ url: '/api/search?view=list', method: 'GET' });
  });

  it('scrubs request, transaction, spans, trace data and error text on an event', () => {
    const event = scrubEvent({
      transaction: 'GET /search?q=jane',
      request: { url: 'https://getcarelinkai.com/api/search?q=jane%20doe', query_string: 'q=jane%20doe' },
      exception: { values: [{ value: 'Invalid `prisma.tourRequest.create()` invocation:\n{ familyNotes: "Mom has dementia", email: "a@b.co" }' }] },
      breadcrumbs: [{ category: 'console', message: 'x' }, { category: 'navigation', data: { to: '/search?q=jane' } }],
      spans: [{ description: 'GET /api/search?q=jane', data: { 'url.full': 'https://x.test/api/search?q=jane', 'http.query': 'q=jane' } }],
      contexts: { trace: { data: { 'http.url': '/search?q=jane', 'url.query': '?q=jane' } } },
      message: '{"received": "jane doe", "code": "invalid_enum_value"}',
    });
    const s = JSON.stringify(event);
    expect(s).not.toMatch(/jane|dementia|a@b\.co/i);
    expect(event.request?.query_string).toBeUndefined();
    expect(event.exception?.values?.[0].value).toBe('Invalid `prisma.tourRequest.create()` invocation:');
    expect(event.breadcrumbs).toHaveLength(1);
  });

  it('scrubErrorText leaves ordinary errors readable', () => {
    expect(scrubErrorText('Cannot read properties of undefined')).toBe('Cannot read properties of undefined');
  });

  it('scrubPhi redacts the inquiry and search fields', () => {
    const out = scrubPhi({ residentName: 'x', careNeeded: ['x'], message: 'x', familyNotes: 'x', q: 'x', naturalQuery: 'x', homeId: 'h1' });
    expect(out).toEqual({ residentName: '[REDACTED]', careNeeded: '[REDACTED]', message: '[REDACTED]', familyNotes: '[REDACTED]', q: '[REDACTED]', naturalQuery: '[REDACTED]', homeId: 'h1' });
  });

  it('every Sentry init scrubs events, transactions and breadcrumbs; the client has no Session Replay', () => {
    for (const f of ['src/instrumentation-client.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts']) {
      const src = fs.readFileSync(path.join(process.cwd(), f), 'utf8');
      expect(src).toMatch(/beforeSend\(event\)[\s\S]*scrubEvent\(event\)/);
      expect(src).toMatch(/beforeSendTransaction[\s\S]*scrubEvent\(/);
      expect(src).toMatch(/beforeBreadcrumb\(breadcrumb\)[\s\S]*scrubBreadcrumb\(breadcrumb\)/);
    }
    const client = fs.readFileSync(path.join(process.cwd(), 'src/instrumentation-client.ts'), 'utf8');
    expect(client).not.toMatch(/replayIntegration\(|replaysSessionSampleRate|replaysOnErrorSampleRate/);
  });
});
