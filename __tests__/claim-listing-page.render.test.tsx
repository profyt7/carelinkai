/**
 * /homes/[id]/claim by role (server-rendered):
 *   - signed out: "Create a free operator account" (signup with the home's claim intent) + "I already have an
 *     operator account" (login, back here);
 *   - signed in as FAMILY: no dead end — "Sign out and create an operator account" / "Sign in with an operator
 *     account" (both sign out first);
 *   - signed in as OPERATOR: the one-click claim button.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const session = { current: null as any };
jest.mock('next-auth', () => ({ getServerSession: async () => session.current }));
jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); }, useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock('@/lib/claims/self-serve', () => ({ listingClaimState: async () => 'open' }));
jest.mock('@/lib/prisma', () => ({
  prisma: { assistedLivingHome: { findUnique: async () => ({ id: 'h-1', name: 'Maple Grove', address: { city: 'Barberton', state: 'OH' }, operator: { user: { email: 'directory-unclaimed@carelinkai.system' } } }) } },
}));

import ClaimListingPage from '@/app/homes/[id]/claim/page';

const OLD = process.env;
beforeAll(() => { process.env = { ...OLD, NEXTAUTH_SECRET: 'test-secret-claim-page' } as NodeJS.ProcessEnv; });
afterAll(() => { process.env = OLD; });

const render = async () => renderToStaticMarkup(await ClaimListingPage({ params: Promise.resolve({ id: 'h-1' }) }));

it('signed out: create-operator-account (home carried through) and sign-in buttons', async () => {
  session.current = null;
  const html = await render();
  expect(html).toContain('data-testid="claim-page-signed-out"');
  expect(html).toMatch(/href="\/auth\/register\?role=OPERATOR&amp;claimIntent=[^"]+"[^>]*data-testid="claim-page-register"|data-testid="claim-page-register"[^>]*href="\/auth\/register/);
  expect(html).toContain('Create a free operator account');
  expect(html).toContain(`href="/auth/login?callbackUrl=${encodeURIComponent('/homes/h-1/claim')}"`);
});

it('signed in as FAMILY: offers to sign out and create (or sign in to) an operator account', async () => {
  session.current = { user: { id: 'u-f', email: 'fam@example.com', role: 'FAMILY' } };
  const html = await render();
  expect(html).toContain('data-testid="claim-page-wrong-role"');
  expect(html).toContain('Sign out and create an operator account');
  expect(html).toContain('Sign in with an operator account');
  expect(html).not.toContain('data-testid="claim-page-register"');
  // Server HTML: both buttons are disabled until React hydrates (a tap before that would do nothing).
  for (const id of ['claim-page-switch-register', 'claim-page-switch-login']) {
    expect(html).toMatch(new RegExp(`<button[^>]*disabled=""[^>]*data-testid="${id}"|<button[^>]*data-testid="${id}"[^>]*disabled=""`));
  }
});

it('signed in as OPERATOR: the claim button', async () => {
  session.current = { user: { id: 'u-o', email: 'op@example.com', role: 'OPERATOR' } };
  const html = await render();
  expect(html).toContain('data-testid="claim-page-operator"');
  // The one-click claim button is disabled in the server HTML too (enabled once hydrated).
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="listing-claim-button"/);
  expect(html).not.toContain('claim-page-wrong-role');
});
