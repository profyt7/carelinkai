/**
 * Edge- and client-safe (imported by src/middleware.ts and client pages — no Node
 * APIs, no Prisma).
 * Two levels (see session-guard.ts):
 *   - `twoFactorSetupRequired` (ADMIN, STAFF without 2FA): sent to TWO_FACTOR_SETUP_PATH for every
 *     page and refused every API except /api/auth/*.
 *   - `twoFactorStepUpRequired` (OPERATOR, DISCHARGE_PLANNER without 2FA): may sign in, claim and edit
 *     listings, manage openings/photos and read/reply to inquiries; only PHI routes (isPhiApiPath /
 *     isPhiPagePath below) are refused (403 TWO_FACTOR_STEP_UP_REQUIRED) or sent to setup.
 */
export const TWO_FACTOR_SETUP_PATH = '/auth/setup-2fa';

/** Roles that may not use the app at all without an authenticator app enrolled. */
export const TWO_FACTOR_REQUIRED_ROLES = ['ADMIN', 'STAFF'] as const;

/** Roles that need 2FA only before PHI (residents, documents, care notes, patient cases). */
export const TWO_FACTOR_STEP_UP_ROLES = ['OPERATOR', 'DISCHARGE_PLANNER'] as const;

/** 403 body `error`/`code` for a PHI request from a step-up role without 2FA; the UI sends them to setup. */
export const TWO_FACTOR_STEP_UP_CODE = 'TWO_FACTOR_STEP_UP_REQUIRED';

export function roleRequiresTwoFactor(role: unknown): boolean {
  return (TWO_FACTOR_REQUIRED_ROLES as readonly string[]).includes(String(role));
}

export function roleNeedsTwoFactorForPhi(role: unknown): boolean {
  return (TWO_FACTOR_STEP_UP_ROLES as readonly string[]).includes(String(role));
}

/** Once enrolled, these roles keep 2FA on (no Disable): hard-gated and PHI step-up roles alike, as before. */
export function roleMayNotDisableTwoFactor(role: unknown): boolean {
  return roleRequiresTwoFactor(role) || roleNeedsTwoFactorForPhi(role);
}

function underAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** API routes that return or change PHI. Everything under each prefix. */
const PHI_API_PREFIXES = [
  '/api/residents', // residents, assessments, incidents, care notes, contacts, compliance, documents, timeline
  '/api/operator/residents',
  '/api/documents', // resident documents (upload, search, extraction)
  '/api/family', // family/resident records
  '/api/reports', // resident / census reports
  '/api/calendar', // care appointments carry residentId
  '/api/billing/payments', // resident billing
  '/api/rides', // rides carry resident names / addresses
  '/api/operator/ask', // AI answers over resident data
  '/api/discharge-planner/search', // patient case (natural-language description)
  '/api/discharge-planner/placement-request', // patient case submit
  '/api/discharge-planner/requests',
  '/api/discharge-planner/history',
  '/api/discharge-planner/concierge',
  '/api/discharge-planner/dashboard', // lists the DP's cases
] as const;

/** PHI API routes nested under otherwise non-PHI areas. */
const PHI_API_PATTERNS: readonly RegExp[] = [
  /^\/api\/(operator\/)?caregivers\/[^/]+\/assignments(\/|$)/, // caregiver ↔ resident assignments
  /^\/api\/operator\/inquiries\/[^/]+\/convert(\/|$)/, // converting an inquiry creates a resident
];

export function isPhiApiPath(pathname: string): boolean {
  return underAny(pathname, PHI_API_PREFIXES) || PHI_API_PATTERNS.some((re) => re.test(pathname));
}

/** Pages that show PHI: a step-up user is sent to setup first, then back. */
const PHI_PAGE_PREFIXES = [
  '/operator/residents',
  '/operator/documents',
  '/residents',
  '/family',
  '/reports',
  '/calendar',
  '/rides',
  '/discharge-planner/search',
  '/discharge-planner/requests',
  '/discharge-planner/history',
  '/discharge-planner/concierge',
] as const;

export function isPhiPagePath(pathname: string): boolean {
  // The DP home (/discharge-planner) is their case dashboard; its sub-pages billing/analytics are not PHI.
  return pathname === '/discharge-planner' || underAny(pathname, PHI_PAGE_PREFIXES);
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

/** Setup URL for a PHI step-up started from a non-PHI page (a widget's 403): `reason=phi` keeps setup from skipping. */
export function twoFactorStepUpUrl(pathname: string, search: string): string {
  return `${twoFactorSetupUrl(pathname, search)}&reason=phi`;
}

/** Only same-site relative paths; anything else (or the setup page itself) goes to the dashboard. */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || raw.startsWith(TWO_FACTOR_SETUP_PATH)) {
    return '/dashboard';
  }
  return raw;
}
