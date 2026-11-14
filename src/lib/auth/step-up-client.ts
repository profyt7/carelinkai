/**
 * Client side of the PHI step-up (two-factor-routes.ts): a PHI API answers 403 with
 * `code: TWO_FACTOR_STEP_UP_REQUIRED` for an OPERATOR / DISCHARGE_PLANNER without 2FA.
 * Call this on a failed response; it sends them to /auth/setup-2fa and back to the current page.
 */
import { TWO_FACTOR_STEP_UP_CODE, twoFactorStepUpUrl } from '@/lib/auth/two-factor-routes';
import { BAA_ACCEPTANCE_REQUIRED_CODE, operatorAcceptanceUrl } from '@/lib/auth/phi-agreement';

export async function isStepUpResponse(res: Response): Promise<boolean> {
  if (res.status !== 403 || res.bodyUsed) return false; // call before reading the body
  const body = await res.clone().json().catch(() => null);
  return body?.code === TWO_FACTOR_STEP_UP_CODE || body?.error === TWO_FACTOR_STEP_UP_CODE;
}

/** The PHI 403 for an OPERATOR who has not accepted the current BAA/DPA (phi-agreement.ts). */
export async function isBaaRequiredResponse(res: Response): Promise<boolean> {
  if (res.status !== 403 || res.bodyUsed) return false;
  const body = await res.clone().json().catch(() => null);
  return body?.code === BAA_ACCEPTANCE_REQUIRED_CODE || body?.error === BAA_ACCEPTANCE_REQUIRED_CODE;
}

/**
 * True (and navigating) when `res` is a PHI-gate 403: 2FA step-up → /auth/setup-2fa, BAA/DPA →
 * /operator/acceptance, each returning to the current page. False otherwise.
 */
export async function redirectIfStepUp(res: Response): Promise<boolean> {
  const stepUp = await isStepUpResponse(res);
  const baa = !stepUp && (await isBaaRequiredResponse(res));
  if (!stepUp && !baa) return false;
  if (typeof window !== 'undefined') {
    const { pathname, search } = window.location;
    window.location.assign(stepUp ? twoFactorStepUpUrl(pathname, search) : operatorAcceptanceUrl(pathname, search));
  }
  return true;
}
