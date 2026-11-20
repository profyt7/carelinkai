/**
 * @jest-environment jsdom
 *
 * Buttons that act only through onClick are disabled until React hydrates them, then enabled.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
import { SwitchToOperator } from '@/components/homes/SwitchToOperator';

it('the switch buttons are enabled once mounted on the client', () => {
  render(<SwitchToOperator registerHref="/auth/register?role=OPERATOR&claimIntent=x" loginHref="/auth/login" />);
  expect((screen.getByTestId('claim-page-switch-register') as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByTestId('claim-page-switch-login') as HTMLButtonElement).disabled).toBe(false);
});
