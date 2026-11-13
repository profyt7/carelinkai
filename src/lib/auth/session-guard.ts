/**
 * Server-side session revocation + 2FA enforcement (security package §3, P1).
 *
 * Sessions are NextAuth JWTs: before this, nothing in a token could be withdrawn
 * before its 30-day expiry — not by deactivating the user, changing their role,
 * resetting their password or "log out other devices". Now every jwt callback
 * re-reads the user (one primary-key lookup, replacing the old profile-image
 * query) and:
 *   - revokes the token when the user is gone, is not ACTIVE, or its `sv`
 *     (session version) no longer matches User.sessionVersion;
 *   - refreshes role / name / image from the database (a demotion is immediate);
 *   - sets `twoFactorSetupRequired` for ADMIN / STAFF without 2FA; middleware then sends
 *     every page to /auth/setup-2fa and refuses every API except /api/auth/*;
 *   - sets `twoFactorStepUpRequired` for OPERATOR / DISCHARGE_PLANNER without 2FA; only
 *     PHI routes are refused / sent to setup (two-factor-routes.ts isPhiApiPath/isPhiPagePath);
 *   - sets `baaAcceptanceRequired` for an OPERATOR without the current BAA + DPA; the same PHI
 *     routes are refused / sent to /operator/acceptance (phi-agreement.ts).
 *
 * Revocation throws SessionRevokedError: NextAuth then clears the session cookie
 * and getServerSession() returns null (so routes 401 and pages redirect to login).
 * A database error does NOT revoke (fail open on outages, keep the prior claims).
 */
import { isEnrolled } from '@/lib/two-factor/secure';
import { acceptanceIsCurrent, type OperatorAcceptanceFields } from '@/lib/legal-versions';

export { TWO_FACTOR_REQUIRED_ROLES, TWO_FACTOR_STEP_UP_ROLES, roleRequiresTwoFactor, roleNeedsTwoFactorForPhi, twoFactorEnforced } from './two-factor-routes';
import { roleNeedsTwoFactorForPhi, roleRequiresTwoFactor, twoFactorEnforced } from './two-factor-routes';

export class SessionRevokedError extends Error {
  constructor(public reason: 'missing' | 'inactive' | 'version') {
    super(`SESSION_REVOKED:${reason}`);
    this.name = 'SessionRevokedError';
  }
}

export type GuardUser = {
  status: string;
  role: string;
  sessionVersion: number;
  twoFactorEnabled: boolean | null;
  twoFactorSecret: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: unknown;
  /** Only read for OPERATOR (BAA/DPA acceptance). */
  operator?: OperatorAcceptanceFields | null;
};

export const GUARD_USER_SELECT = {
  status: true,
  role: true,
  sessionVersion: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  operator: { select: { baaTemplateVersion: true, baaAcceptedAt: true, dpaTemplateVersion: true, dpaAcceptedAt: true } },
} as const;

function imageUrl(img: unknown): string | null {
  if (img && typeof img === 'object') {
    const d = img as { medium?: string; thumbnail?: string; original?: string };
    return d.medium || d.thumbnail || d.original || null;
  }
  return typeof img === 'string' ? img : null;
}

/**
 * Apply the database view of the user to a token. Throws SessionRevokedError when
 * the token must stop working. `token.sv` must already be set (at sign-in); a token
 * issued before this change has none and is treated as version 0, which is every
 * user's starting version — so existing sessions survive the deploy.
 */
export function applyUserToToken<T extends Record<string, unknown>>(
  token: T,
  db: GuardUser | null,
  env: NodeJS.ProcessEnv = process.env,
): T {
  if (!db) throw new SessionRevokedError('missing');
  if (db.status !== 'ACTIVE') throw new SessionRevokedError('inactive');
  const sv = typeof token.sv === 'number' ? token.sv : 0;
  if (sv !== db.sessionVersion) throw new SessionRevokedError('version');

  const t = token as Record<string, unknown>;
  t.sv = db.sessionVersion;
  t.role = db.role;
  t.firstName = db.firstName;
  t.lastName = db.lastName;
  t.name = `${db.firstName ?? ''} ${db.lastName ?? ''}`.trim();
  t.profileImageUrl = imageUrl(db.profileImageUrl);
  const enrolled = isEnrolled(db);
  t.twoFactorEnabled = enrolled;
  t.twoFactorSetupRequired = twoFactorEnforced(env) && roleRequiresTwoFactor(db.role) && !enrolled;
  t.twoFactorStepUpRequired = twoFactorEnforced(env) && roleNeedsTwoFactorForPhi(db.role) && !enrolled;
  t.baaAcceptanceRequired = db.role === 'OPERATOR' && !acceptanceIsCurrent(db.operator);
  return token;
}

export { TWO_FACTOR_SETUP_PATH, apiAllowedDuringTwoFactorSetup } from './two-factor-routes';
