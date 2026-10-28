/**
 * OL-112: the demo/seed ACCOUNT identity convention, in one place.
 * Used by scripts/backfill-demo-flags.ts to stamp `isDemo` and by tests.
 *
 * Matches:
 *   - demo.*@carelinkai.test        (docs/DEMO_ACCOUNTS.md tutorial accounts)
 *   - *@test.carelinkai.com         (e2e harness operators)
 *   - *+seed@carelinkai.com         (runDemoSeed operator/caregiver accounts)
 *   - family.seed*@carelinkai.com   (runDemoSeed families)
 */
export const DEMO_EMAIL_RE =
  /(@carelinkai\.test|@test\.carelinkai\.com|\+seed@carelinkai\.com)$|^family\.seed[^@]*@carelinkai\.com$/i;

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  return !!email && DEMO_EMAIL_RE.test(email);
}

/**
 * The one password every seeded demo / test account gets, read from
 * DEMO_ACCOUNT_PASSWORD at seed time. No fallback: the repo is public, so a
 * literal default would be a published login. Throws when unset or short.
 */
export function demoAccountPassword(): string {
  const pw = process.env['DEMO_ACCOUNT_PASSWORD'];
  if (!pw || pw.length < 12) {
    throw new Error('DEMO_ACCOUNT_PASSWORD must be set (12+ characters) to seed demo accounts');
  }
  return pw;
}
