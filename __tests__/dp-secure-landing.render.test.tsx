/**
 * @jest-environment jsdom
 *
 * DP landing without 2FA: aggregate availability + "secure your account" card; the case list
 * (dashboard API) is never requested. With 2FA: the normal case dashboard.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const session = { current: null as any };
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: session.current, status: 'authenticated' }) }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: () => (p: any) => <div>{p.children}</div> }) }));

import DischargePlannerDashboard from '@/app/discharge-planner/_components/DischargePlannerDashboard';

const SUMMARY = { totalHomes: 42, verifiedHomes: 10, homesWithOpenings: 6, openings: 9, lastVerifiedAt: '2026-11-10T12:00:00.000Z', byCareLevel: [{ careLevel: 'MEMORY_CARE', homes: 12, homesWithOpenings: 2, openings: 3 }] };
const DASHBOARD = { recentSearches: [], pendingRequests: [], stats: { totalSearches: 7, totalPlacements: 0, successfulPlacements: 0, pendingResponses: 0, searchesLast30Days: 0, placementsLast30Days: 0 } };
const calls: string[] = [];
const respond = (url: string, status: number, body: unknown) => ({ ok: status < 400, status, clone() { return this; }, json: async () => body, bodyUsed: false, url });

beforeEach(() => {
  calls.length = 0;
  (global as any).fetch = jest.fn(async (url: string) => {
    calls.push(url);
    if (url.startsWith('/api/discharge-planner/availability/summary')) return respond(url, 200, { success: true, summary: SUMMARY });
    if (url.startsWith('/api/discharge-planner/dashboard')) return respond(url, 200, DASHBOARD);
    return respond(url, 404, {});
  });
});

it('DP without 2FA: secure landing with aggregate availability; never requests the case list', async () => {
  session.current = { user: { role: 'DISCHARGE_PLANNER', twoFactorStepUpRequired: true } };
  render(<DischargePlannerDashboard />);
  expect(screen.getByText('Secure your account to submit or view patient cases')).toBeTruthy();
  const link = screen.getByRole('link', { name: 'Set up two-factor authentication' }) as HTMLAnchorElement;
  const href = new URL(link.getAttribute('href')!, 'http://x');
  expect(href.pathname).toBe('/auth/setup-2fa');
  expect(href.searchParams.get('callbackUrl')).toBe('/discharge-planner');
  expect(href.searchParams.get('reason')).toBe('phi');
  await waitFor(() => expect(screen.getByTestId('total-homes').textContent).toBe('42'));
  expect(screen.getByTestId('homes-with-openings').textContent).toBe('6');
  expect(screen.getByText('Memory care')).toBeTruthy();
  expect(calls.some((u) => u.startsWith('/api/discharge-planner/dashboard'))).toBe(false);
});

it('stale session (no claim) but the case-list API says step-up → secure landing', async () => {
  session.current = { user: { role: 'DISCHARGE_PLANNER' } };
  (global as any).fetch = jest.fn(async (url: string) => {
    calls.push(url);
    if (url.startsWith('/api/discharge-planner/dashboard')) return respond(url, 403, { error: 'TWO_FACTOR_STEP_UP_REQUIRED', code: 'TWO_FACTOR_STEP_UP_REQUIRED' });
    return respond(url, 200, { success: true, summary: SUMMARY });
  });
  render(<DischargePlannerDashboard />);
  await waitFor(() => expect(screen.getByText('Secure your account to submit or view patient cases')).toBeTruthy());
});

it('DP with 2FA: the normal case dashboard, no secure-account card', async () => {
  session.current = { user: { role: 'DISCHARGE_PLANNER', twoFactorStepUpRequired: false } };
  render(<DischargePlannerDashboard />);
  await waitFor(() => expect(calls.some((u) => u.startsWith('/api/discharge-planner/dashboard'))).toBe(true));
  await waitFor(() => expect(screen.queryByText('Loading dashboard...')).toBeNull());
  expect(screen.queryByTestId('secure-account-card')).toBeNull();
});
