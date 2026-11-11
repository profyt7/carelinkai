/**
 * Mapping for the one-off rename of legacy seed/demo logins off carelinkai.com (not our domain) onto the
 * reserved .test domains the seeds now use (PR "never email .test / carelinkai.com"). Pure — no DB access.
 * Same rules as the seed change, so each account keeps its demo classification:
 *   *+seed@carelinkai.com, family.seed*@carelinkai.com -> @carelinkai.test       (demo)
 *   *@test.carelinkai.com                              -> @test.carelinkai.test  (demo, e2e harness)
 *   other *@carelinkai.com                             -> @seed.carelinkai.test  (not demo)
 */
import { DEMO_EMAIL_RE } from './demo-identity';

/** Fixed logins the seed scripts / setup.sh created on carelinkai.com (same list as rotate-demo-passwords). */
export const LEGACY_SEED_LOGINS = [
  'admin@carelinkai.com',
  'operator@carelinkai.com',
  'family@carelinkai.com',
  'family2@carelinkai.com',
  'demo.discharge@carelinkai.com',
  'discharge.planner@carelinkai.com',
  'admin.test@carelinkai.com',
  'operator.test@carelinkai.com',
  'caregiver.test@carelinkai.com',
  'family.test@carelinkai.com',
] as const;

/** True for an address on carelinkai.com or one of its subdomains (never getcarelinkai.com). */
export function isLegacyCarelinkaiDomain(email: string): boolean {
  const e = email.trim().toLowerCase();
  const d = e.slice(e.lastIndexOf('@') + 1);
  return e.includes('@') && (d === 'carelinkai.com' || d.endsWith('.carelinkai.com'));
}

/** The .test address for a legacy carelinkai.com login, or null if it is not on that domain. */
export function renamedDemoEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!isLegacyCarelinkaiDomain(e)) return null;
  const at = e.lastIndexOf('@');
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === 'test.carelinkai.com') return `${local}@test.carelinkai.test`;
  if (domain !== 'carelinkai.com') return `${local}@${domain.replace(/carelinkai\.com$/, 'carelinkai.test')}`;
  if (local.endsWith('+seed') || /^family\.seed[^@]*$/.test(local)) return `${local}@carelinkai.test`;
  return `${local}@seed.carelinkai.test`;
}

export type RenameCandidate = { id: string; email: string; role: string; isDemo: boolean; lastLoginAt: Date | null };
export type RenamePlanRow = RenameCandidate & { to: string | null; action: 'rename' | 'skip'; why: string };

/**
 * Decide each row. Renamed: a carelinkai.com login that is a known seed/demo account (isDemo, DEMO_EMAIL_RE or a
 * fixed seed login). Skipped (listed, never touched): any other carelinkai.com user, an --exclude'd address, or a
 * target address that already exists.
 */
export function planDemoEmailRenames(rows: RenameCandidate[], existing: ReadonlySet<string>, exclude: ReadonlySet<string> = new Set()): RenamePlanRow[] {
  const claimed = new Set<string>();
  return rows.map((r) => {
    const email = r.email.trim().toLowerCase();
    const to = renamedDemoEmail(email);
    const known = r.isDemo || DEMO_EMAIL_RE.test(email) || (LEGACY_SEED_LOGINS as readonly string[]).includes(email);
    if (!to) return { ...r, to, action: 'skip', why: 'not on carelinkai.com' };
    if (exclude.has(email)) return { ...r, to, action: 'skip', why: 'excluded (--exclude)' };
    if (!known) return { ...r, to, action: 'skip', why: 'not a known seed/demo account — left for review' };
    if (existing.has(to) || claimed.has(to)) return { ...r, to, action: 'skip', why: 'target address already exists' };
    claimed.add(to);
    return { ...r, to, action: 'rename', why: r.isDemo ? 'isDemo' : DEMO_EMAIL_RE.test(email) ? 'demo email pattern' : 'fixed seed login' };
  });
}
