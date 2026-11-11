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
  // Found in prod (2026-11-11 dry-run); created by old code in the archive repo:
  'caregiver@carelinkai.com', // marketplace demo seed (b6ccd939, 2025-09) — "Sarah Johnson"
  'family.demo1@carelinkai.com', // e2e staging family default (fa9c36f7, 2025-12) via /api/dev/upsert-family
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
export function planDemoEmailRenames(
  rows: RenameCandidate[],
  existing: ReadonlySet<string>,
  exclude: ReadonlySet<string> = new Set(),
  /** --map: explicit new address for a login (e.g. a real ADMIN moving to an inbox the owner controls). */
  overrides: ReadonlyMap<string, string> = new Map(),
): RenamePlanRow[] {
  const claimed = new Set<string>();
  return rows.map((r) => {
    const email = r.email.trim().toLowerCase();
    const mapped = overrides.get(email);
    const to = mapped ?? renamedDemoEmail(email);
    if (mapped && renamedDemoEmail(email)) {
      if (exclude.has(email)) return { ...r, to, action: 'skip', why: 'excluded (--exclude)' };
      if (existing.has(mapped) || claimed.has(mapped)) return { ...r, to, action: 'skip', why: 'target address already exists' };
      claimed.add(mapped);
      return { ...r, to, action: 'rename', why: 'mapped (--map)' };
    }
    const known = r.isDemo || DEMO_EMAIL_RE.test(email) || (LEGACY_SEED_LOGINS as readonly string[]).includes(email);
    if (!to) return { ...r, to, action: 'skip', why: 'not on carelinkai.com' };
    if (exclude.has(email)) return { ...r, to, action: 'skip', why: 'excluded (--exclude)' };
    if (!known) return { ...r, to, action: 'skip', why: 'not a known seed/demo account — left for review' };
    if (existing.has(to) || claimed.has(to)) return { ...r, to, action: 'skip', why: 'target address already exists' };
    claimed.add(to);
    return { ...r, to, action: 'rename', why: r.isDemo ? 'isDemo' : DEMO_EMAIL_RE.test(email) ? 'demo email pattern' : 'fixed seed login' };
  });
}

/** Parse --map=old=new[,old2=new2]. Throws on a malformed pair or a target on carelinkai.com. */
export function parseRenameMap(arg: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (arg ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [from, to, extra] = pair.split('=').map((s) => s.trim().toLowerCase());
    if (!from || !to || extra !== undefined || !from.includes('@') || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      throw new Error(`--map: expected old@domain=new@domain, got "${pair}"`);
    }
    if (isLegacyCarelinkaiDomain(to)) throw new Error(`--map: target ${to} is on carelinkai.com (not our domain)`);
    map.set(from, to);
  }
  return map;
}
