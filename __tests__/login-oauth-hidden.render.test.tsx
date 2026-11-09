/**
 * @jest-environment jsdom
 *
 * Google / Apple sign-in is not configured (credentials provider only), so the
 * login page must not show buttons that lead nowhere. The buttons live on in
 * SocialSignIn behind NEXT_PUBLIC_OAUTH_SIGNIN_ENABLED.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/auth/login/page';

let flag = false;
jest.mock('@/lib/auth-ui/oauth', () => ({ get OAUTH_SIGNIN_ENABLED() { return flag; } }));
jest.mock('next-auth/react', () => ({ signIn: jest.fn() }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('/auth/login OAuth buttons', () => {
  it('are hidden when the flag is off (the default)', async () => {
    flag = false;
    render(<LoginPage />);
    expect(await screen.findByRole('button', { name: /^sign in$/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /sign in with google/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /sign in with apple/i })).toBeNull();
    expect(screen.queryByText(/or continue with/i)).toBeNull();
  });

  it('render again when the flag is on', async () => {
    flag = true;
    render(<LoginPage />);
    expect(await screen.findByRole('button', { name: /sign in with google/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeTruthy();
  });
});

describe('OAUTH_SIGNIN_ENABLED', () => {
  const OLD = process.env;
  afterEach(() => { process.env = OLD; });
  const read = (v?: string) => {
    process.env = { ...OLD } as NodeJS.ProcessEnv;
    if (v === undefined) delete process.env.NEXT_PUBLIC_OAUTH_SIGNIN_ENABLED;
    else process.env.NEXT_PUBLIC_OAUTH_SIGNIN_ENABLED = v;
    let out: boolean | undefined;
    jest.isolateModules(() => { out = jest.requireActual('@/lib/auth-ui/oauth').OAUTH_SIGNIN_ENABLED; });
    return out;
  };
  it('is on only for the exact string "true"', () => {
    expect(read(undefined)).toBe(false);
    expect(read('')).toBe(false);
    expect(read('1')).toBe(false);
    expect(read('TRUE')).toBe(false);
    expect(read('true')).toBe(true);
  });
});
