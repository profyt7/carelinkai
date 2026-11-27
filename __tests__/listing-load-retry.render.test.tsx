/**
 * @jest-environment jsdom
 *
 * Public listing page (/homes/[id]): a failed listing fetch is retried automatically; if every try fails the
 * page shows "Try again" (not a permanent "Could not load listing"), and clicking it loads the listing.
 * A 404 is final: "We couldn't find this listing", no retry button.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'h-1' }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/homes/h-1',
}));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));
jest.mock('next/dynamic', () => () => () => null);
jest.mock('@/components/layout/BrowseShell', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));
// Real retry logic, no real waiting between tries.
jest.mock('@/lib/http/fetch-retry', () => {
  const actual = jest.requireActual('@/lib/http/fetch-retry');
  return { ...actual, fetchWithRetry: (u: string, i?: RequestInit) => actual.fetchWithRetry(u, i, { sleep: async () => undefined }) };
});

import ListingPage from '@/app/homes/[id]/ListingDetailClient'; // no initialHome: the browser-fetch fallback

const listingCalls = () => (global.fetch as jest.Mock).mock.calls.filter(([u]) => u === '/api/homes/h-1').length;
// jsdom has no Response class: a minimal response-shaped object is enough for the page.
const reply = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const okListing = () => reply(200, { success: true, data: { id: 'h-1', name: 'Maple Grove', address: { city: 'Parma', state: 'OH' }, careLevel: [], amenities: [], photos: [], operator: { company: 'Maple Ops' } } });

// Browser APIs the page uses that jsdom lacks.
beforeAll(() => {
  window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as any;
  class NoopObserver { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  (window as any).IntersectionObserver = (window as any).IntersectionObserver || NoopObserver;
  (window as any).ResizeObserver = (window as any).ResizeObserver || NoopObserver;
  window.scrollTo = (() => undefined) as any;
});

let mode: 'down' | 'up' | '404' = 'down';
beforeEach(() => {
  mode = 'down';
  global.fetch = jest.fn(async (u: any) => {
    if (u === '/api/homes/h-1') {
      if (mode === 'down') throw new TypeError('Failed to fetch');
      if (mode === '404') return reply(404);
      return okListing();
    }
    return reply(200);
  }) as any;
});

it('retries automatically, then offers "Try again", which loads the listing', async () => {
  render(<ListingPage />);
  expect(await screen.findByTestId('listing-load-retry', {}, { timeout: 5000 })).toBeTruthy();
  expect(listingCalls()).toBe(3); // 3 automatic tries before giving up
  expect(screen.queryByText('Could not load listing')).toBeNull();
  mode = 'up';
  fireEvent.click(screen.getByTestId('listing-load-retry'));
  await waitFor(() => expect(screen.getAllByText('Maple Grove').length).toBeGreaterThan(0), { timeout: 5000 });
  expect(screen.queryByTestId('listing-load-error')).toBeNull();
});

it('a 404 is final: not-found message, one try, no retry button', async () => {
  mode = '404';
  render(<ListingPage />);
  expect(await screen.findByText('We couldn’t find this listing', {}, { timeout: 5000 })).toBeTruthy();
  expect(screen.queryByTestId('listing-load-retry')).toBeNull();
  expect(listingCalls()).toBe(1);
});
