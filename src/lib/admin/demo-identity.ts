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
