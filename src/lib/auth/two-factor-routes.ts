/**
 * Edge- and client-safe (imported by src/middleware.ts and client pages — no Node
 * APIs, no Prisma).
 * A user whose token carries `twoFactorSetupRequired` (see session-guard.ts) is
 * sent to TWO_FACTOR_SETUP_PATH for every page and refused every API except these.
 */
export const TWO_FACTOR_SETUP_PATH = '/auth/setup-2fa';

/** Roles that may not use the app without an authenticator app enrolled. */
export const TWO_FACTOR_REQUIRED_ROLES = ['ADMIN', 'STAFF', 'OPERATOR', 'DISCHARGE_PLANNER'] as const;

export function roleRequiresTwoFactor(role: unknown): boolean {
  return (TWO_FACTOR_REQUIRED_ROLES as readonly string[]).includes(String(role));
}

/**
 * On by default. `TWO_FACTOR_ENFORCEMENT=off` disables the requirement (the e2e
 * workflow sets it: its seeded admin/operator accounts have no authenticator).
 * Server-side only: in the browser the variable is not defined, which reads as on.
 */
export function twoFactorEnforced(env: NodeJS.ProcessEnv = process.env): boolean {
  return ((env && env.TWO_FACTOR_ENFORCEMENT) || '').trim().toLowerCase() !== 'off';
}

/** Session, CSRF, sign-out and the 2FA setup endpoints all live under /api/auth. */
export function apiAllowedDuringTwoFactorSetup(pathname: string): boolean {
  return pathname === '/api/auth' || pathname.startsWith('/api/auth/');
}

/** Where to send a user who must set up 2FA, remembering where they were going. */
export function twoFactorSetupUrl(pathname: string, search: string): string {
  const back = `${pathname}${search || ''}`;
  return `${TWO_FACTOR_SETUP_PATH}?callbackUrl=${encodeURIComponent(back)}`;
}

/** Only same-site relative paths; anything else (or the setup page itself) goes to the dashboard. */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || raw.startsWith(TWO_FACTOR_SETUP_PATH)) {
    return '/dashboard';
  }
  return raw;
}
