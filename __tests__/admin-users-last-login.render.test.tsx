/**
 * @jest-environment jsdom
 *
 * /admin/users showed "Last Login: Never" for everyone: /api/admin/users returns
 * `lastLoginAt` (written by authorize on every sign-in) but the page rendered
 * `user.lastLogin`, which never exists.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import AdminUsersPage from '@/app/admin/users/page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const SIGNED_IN = '2026-11-08T15:30:00.000Z';
beforeEach(() => {
  (global as any).fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      users: [
        { id: 'u1', email: 'seen@example.test', firstName: 'Seen', lastName: 'User', role: 'FAMILY', status: 'ACTIVE', createdAt: '2026-10-01T00:00:00.000Z', lastLoginAt: SIGNED_IN },
        { id: 'u2', email: 'never@example.test', firstName: 'Never', lastName: 'User', role: 'FAMILY', status: 'ACTIVE', createdAt: '2026-10-01T00:00:00.000Z', lastLoginAt: null },
      ],
      totalCount: 2, totalPages: 1, currentPage: 1,
    }),
  }));
});

it('shows lastLoginAt from the API, and "Never" only when it is null', async () => {
  render(<AdminUsersPage />);
  const seenRow = (await screen.findByText('seen@example.test')).closest('tr')!;
  const neverRow = screen.getByText('never@example.test').closest('tr')!;
  expect(within(seenRow).getByText(new Date(SIGNED_IN).toLocaleDateString())).toBeTruthy();
  expect(within(seenRow).queryByText('Never')).toBeNull();
  expect(within(neverRow).getByText('Never')).toBeTruthy();
});
