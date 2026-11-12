/**
 * @jest-environment jsdom
 *
 * Register page opened from a claim landing ("Create your free account"): the email is prefilled
 * with the claim link's recipient and locked (read-only). Without a claim token it is editable.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { signClaimToken } from '@/lib/claim-token';

const params = { current: new URLSearchParams() };
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), useSearchParams: () => params.current }));
jest.mock('next/image', () => ({ __esModule: true, default: (p: any) => <span data-alt={p.alt} /> }));
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('@/lib/animations', () => ({ prefersReducedMotion: () => true }));

import RegisterPage from '@/app/auth/register/page';

beforeEach(() => {
  (global as any).fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
});

it('claim link: email prefilled with the recipient and read-only', async () => {
  const token = signClaimToken({ operatorEmail: 'KFuller@Arden-Courts.com', homeId: 'h1', clevelandFounder: true, iat: 1, exp: 9e9 }, 's');
  params.current = new URLSearchParams({ role: 'OPERATOR', claimToken: token });
  render(<RegisterPage />);
  const email = (await screen.findByLabelText('Email Address')) as HTMLInputElement;
  expect(email.value).toBe('kfuller@arden-courts.com');
  expect(email.readOnly).toBe(true);
  expect(screen.getByTestId('email-locked').textContent).toMatch(/sent to this address/);
});

it('no claim token: email is empty and editable', async () => {
  params.current = new URLSearchParams({ role: 'OPERATOR' });
  render(<RegisterPage />);
  const email = (await screen.findByLabelText('Email Address')) as HTMLInputElement;
  expect(email.value).toBe('');
  expect(email.readOnly).toBe(false);
  expect(screen.queryByTestId('email-locked')).toBeNull();
});
