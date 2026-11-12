/**
 * Client side of the PHI step-up (two-factor-routes.ts): a PHI API answers 403 with
 * `code: TWO_FACTOR_STEP_UP_REQUIRED` for an OPERATOR / DISCHARGE_PLANNER without 2FA.
 * Call this on a failed response; it sends them to /auth/setup-2fa and back to the current page.
 */
import { TWO_FACTOR_STEP_UP_CODE, twoFactorStepUpUrl } from '@/lib/auth/two-factor-routes';

export async function isStepUpResponse(res: Response): Promise<boolean> {
  if (res.status !== 403 || res.bodyUsed) return false; // call before reading the body
  const body = await res.clone().json().catch(() => null);
  return body?.code === TWO_FACTOR_STEP_UP_CODE || body?.error === TWO_FACTOR_STEP_UP_CODE;
}

/** True (and navigating) when `res` is the step-up 403; false otherwise. */
export async function redirectIfStepUp(res: Response): Promise<boolean> {
  if (!(await isStepUpResponse(res))) return false;
  if (typeof window !== 'undefined') {
    window.location.assign(twoFactorStepUpUrl(window.location.pathname, window.location.search));
  }
  return true;
}
