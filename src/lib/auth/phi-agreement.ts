/**
 * BAA/DPA acceptance as a PHI gate (edge- and client-safe: no Node APIs, no Prisma).
 *
 * An OPERATOR who has only claimed or edited a listing never touches PHI, so onboarding no
 * longer asks for the BAA/DPA. Acceptance is required at the same point as the 2FA step-up
 * (two-factor-routes.ts): the first PHI route (isPhiApiPath / isPhiPagePath).
 *   - The session token carries `baaAcceptanceRequired` (session-guard.ts, refreshed on every
 *     jwt callback), true for an OPERATOR without the current BAA + DPA.
 *   - src/middleware.ts answers PHI APIs 403 { code: BAA_ACCEPTANCE_REQUIRED } and sends PHI
 *     pages to /operator/acceptance?callbackUrl=… ; route handlers repeat the rule
 *     (auth-utils requirePhiAccess / phiStepUpResponse).
 * The 2FA step-up is checked first; an operator may need both.
 */
export const BAA_ACCEPTANCE_REQUIRED_CODE = 'BAA_ACCEPTANCE_REQUIRED';
export const OPERATOR_ACCEPTANCE_PATH = '/operator/acceptance';

/** Where to send an operator who must accept the BAA/DPA, remembering where they were going. */
export function operatorAcceptanceUrl(pathname: string, search: string): string {
  return `${OPERATOR_ACCEPTANCE_PATH}?callbackUrl=${encodeURIComponent(`${pathname}${search || ''}`)}`;
}

/** Same-site relative paths only (never the acceptance page itself); otherwise the dashboard. */
export function safeAcceptanceCallback(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || raw.startsWith(OPERATOR_ACCEPTANCE_PATH)) {
    return '/operator';
  }
  return raw;
}

export function baaAcceptanceResponseBody() {
  return { error: BAA_ACCEPTANCE_REQUIRED_CODE, code: BAA_ACCEPTANCE_REQUIRED_CODE, acceptanceUrl: OPERATOR_ACCEPTANCE_PATH };
}
