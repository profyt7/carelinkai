/**
 * OL-229: GA4 gets only sanitized, allowlisted data, server-side (Measurement Protocol).
 * These fail if a raw query string, an inquiry field or a non-allowlisted key could reach
 * the GA request body, if GA is contacted without analytics consent, or if the endpoint
 * override works in production.
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({ prisma: { analyticsEvent: { create: jest.fn(async () => ({ id: 'e1' })) } } }));

import { buildMpBody, gaMpConfig, GA_MP_DEFAULT_ENDPOINT } from '@/lib/analytics/ga-mp';
import { POST } from '@/app/api/analytics/track/route';
import { prisma } from '@/lib/prisma';

const SID = '3f2a9c1e-5b7d-4e2f-9a1c-0d8e7f6a5b4c';
const QUERY = 'memory care for my mom jane doe';
const create = prisma.analyticsEvent.create as unknown as jest.Mock;

describe('gaMpConfig', () => {
  it('fails closed without a measurement id or API secret', () => {
    expect(gaMpConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBeNull();
    expect(gaMpConfig({ NODE_ENV: 'production', NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-ABC1234' } as NodeJS.ProcessEnv)).toBeNull();
    expect(gaMpConfig({ NODE_ENV: 'production', GA_MP_API_SECRET: 's' } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('ignores the endpoint override in production unless dev endpoints are allowed', () => {
    const base = { NODE_ENV: 'production', GA_MEASUREMENT_ID: 'G-ABC1234', GA_MP_API_SECRET: 's', GA_MP_ENDPOINT: 'http://127.0.0.1:4599/mp/collect' };
    expect(gaMpConfig(base as unknown as NodeJS.ProcessEnv)?.endpoint).toBe(GA_MP_DEFAULT_ENDPOINT);
    expect(gaMpConfig({ ...base, ALLOW_DEV_ENDPOINTS: '1' } as unknown as NodeJS.ProcessEnv)?.endpoint).toBe('http://127.0.0.1:4599/mp/collect');
  });
});

describe('buildMpBody', () => {
  it('rebuilds page_location from the sanitized path on the canonical origin', () => {
    const body = buildMpBody('page_view', {}, SID, `/search?q=${encodeURIComponent(QUERY)}&view=map&email=a%40b.co`, 'https://getcarelinkai.com');
    expect(body.events[0].params).toMatchObject({ page_location: 'https://getcarelinkai.com/search?view=map', page_path: '/search?view=map' });
    expect(JSON.stringify(body)).not.toMatch(/jane|memory|a%40b|q=/);
    expect(body.client_id).toBe(SID);
    expect(body.non_personalized_ads).toBe(true);
  });

  it('carries only the props it is given, plus session/engagement fields', () => {
    const body = buildMpBody('search_performed', { care_levels: ['ASSISTED', 'MEMORY_CARE'], view: 'grid' }, SID, '/search', 'https://getcarelinkai.com');
    expect(Object.keys(body.events[0].params).sort()).toEqual(['care_levels', 'engagement_time_msec', 'page_location', 'page_path', 'session_id', 'view']);
    expect(body.events[0].params.care_levels).toBe('ASSISTED,MEMORY_CARE');
  });
});

describe('POST /api/analytics/track → GA', () => {
  const OLD_ENV = process.env;
  let fetchMock: jest.Mock;
  const post = (payload: unknown) =>
    POST(new NextRequest('http://localhost:3000/api/analytics/track', { method: 'POST', body: JSON.stringify(payload) }));
  const gaBodies = () => fetchMock.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)));

  beforeEach(() => {
    process.env = { ...OLD_ENV, GA_MEASUREMENT_ID: 'G-TEST1234', GA_MP_API_SECRET: 'secret', GA_MP_ENDPOINT: 'http://ga.test/mp/collect' };
    fetchMock = jest.fn(async () => new Response(null, { status: 204 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    create.mockClear();
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('forwards a funnel event with allowlisted props only; injected keys and the query never reach GA', async () => {
    await post({
      name: 'search_performed',
      sid: SID,
      consent: 'analytics',
      path: `/search?q=${encodeURIComponent(QUERY)}`,
      props: { view: 'grid', has_budget_filter: false, has_location_filter: true, verified_only: false, medicaid_waiver: false, result_count_bucket: '6-20', query: QUERY, email: 'a@b.co' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('http://ga.test/mp/collect?measurement_id=G-TEST1234&api_secret=secret');
    const body = gaBodies()[0];
    expect(body.events[0].name).toBe('search_performed');
    expect(Object.keys(body.events[0].params).sort()).toEqual(
      ['engagement_time_msec', 'has_budget_filter', 'has_location_filter', 'medicaid_waiver', 'page_location', 'page_path', 'result_count_bucket', 'session_id', 'verified_only', 'view'],
    );
    expect(body.events[0].params.page_location).toBe('https://getcarelinkai.com/search');
    expect(JSON.stringify(body)).not.toMatch(/jane|memory|a@b\.co|q=/);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('forwards page_view (not stored) with the sanitized path', async () => {
    await post({ name: 'page_view', sid: SID, consent: 'analytics', path: '/search?q=jane&page=2', props: { title: 'Jane' } });
    expect(create).not.toHaveBeenCalled();
    const body = gaBodies()[0];
    expect(body.events[0]).toEqual({ name: 'page_view', params: expect.objectContaining({ page_location: 'https://getcarelinkai.com/search?page=2' }) });
    expect(JSON.stringify(body)).not.toMatch(/jane|title/i);
  });

  it('contacts GA and stores nothing without analytics consent', async () => {
    await post({ name: 'page_view', sid: SID, path: '/' });
    await post({ name: 'inquiry_started', sid: SID, consent: 'none', props: { listing_id: 'cmhome123', entry: 'rail' } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('sends nothing to GA when it is not configured', async () => {
    delete process.env.GA_MP_API_SECRET;
    await post({ name: 'inquiry_started', sid: SID, consent: 'analytics', path: '/homes/cmhome123', props: { listing_id: 'cmhome123', entry: 'rail' } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
  });
});
