/**
 * @jest-environment jsdom
 *
 * A claim-only operator who finishes onboarding lands on the dashboard: the operator gate no
 * longer sends them to /operator/acceptance (the BAA/DPA is asked for at the first PHI route,
 * see baa-at-phi-step-up.test.ts). The acceptance page refreshes the session and returns them
 * to the PHI page that sent them there.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const push = jest.fn();
const path = { current: '/operator' };
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => path.current }));
const update = jest.fn(async () => ({}));
jest.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'authenticated', data: { user: { id: 'u-op', role: 'OPERATOR', baaAcceptanceRequired: true } }, update }),
}));

import { AcceptanceGate } from '@/components/operator/AcceptanceGate';
import OperatorAcceptancePage from '@/app/operator/acceptance/page';

const calls: string[] = [];
const onboardingComplete = { current: true };
beforeEach(() => {
  push.mockClear();
  update.mockClear();
  calls.length = 0;
  (global as any).fetch = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url === '/api/operator/onboarding/status') return { ok: true, json: async () => ({ completed: onboardingComplete.current }) };
    if (url === '/api/operator/acceptance') return { ok: true, json: async () => ({ success: true, current: false }) };
    return { ok: true, json: async () => ({}) };
  });
});

describe('operator gate (onboarding only)', () => {
  it('claim-only operator with onboarding complete reaches the dashboard without the acceptance page', async () => {
    onboardingComplete.current = true;
    path.current = '/operator';
    render(<AcceptanceGate><h1>Operator dashboard</h1></AcceptanceGate>);
    expect(await screen.findByText('Operator dashboard')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(calls).toContain('GET /api/operator/onboarding/status');
    expect(calls.some((c) => c.includes('/api/operator/acceptance'))).toBe(false); // no acceptance check at all
  });

  it('onboarding not finished → onboarding (unchanged)', async () => {
    onboardingComplete.current = false;
    render(<AcceptanceGate><h1>Operator dashboard</h1></AcceptanceGate>);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/operator/onboarding/1'));
    expect(push).not.toHaveBeenCalledWith('/operator/acceptance');
  });
});

describe('acceptance page (reached from a PHI page)', () => {
  it('keeps the draft notice; after accepting, refreshes the session and returns to the PHI page', async () => {
    window.history.pushState({}, '', '/operator/acceptance?callbackUrl=%2Foperator%2Fresidents%2Fr1');
    render(<OperatorAcceptancePage />);
    expect(screen.getAllByText(/DRAFT — NOT LEGAL TEXT/).length).toBeGreaterThan(0);
    expect(screen.getByText(/draft templates pending attorney review/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/agree to the Business Associate Agreement/i));
    fireEvent.click(screen.getByText(/agree to the Data Processing Agreement/i));
    const submit = screen.getAllByRole('button').find((b) => !(b as HTMLButtonElement).disabled && /accept|continue/i.test(b.textContent || ''))!;
    fireEvent.click(submit);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/operator/residents/r1'));
    expect(calls).toContain('POST /api/operator/acceptance');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('an off-site callback falls back to the dashboard', async () => {
    window.history.pushState({}, '', '/operator/acceptance?callbackUrl=https%3A%2F%2Fevil.example');
    render(<OperatorAcceptancePage />);
    fireEvent.click(screen.getByText(/agree to the Business Associate Agreement/i));
    fireEvent.click(screen.getByText(/agree to the Data Processing Agreement/i));
    const submit = screen.getAllByRole('button').find((b) => !(b as HTMLButtonElement).disabled && /accept|continue/i.test(b.textContent || ''))!;
    fireEvent.click(submit);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/operator'));
  });
});
