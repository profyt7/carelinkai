/**
 * OL-206 — regenerates the table in context/NAV_ROUTE_MAPPING.md from the
 * frozen pre-OL-206 nav (src/config/navigation/__fixtures__/legacy-nav-items.ts) and today's
 * src/config/navigation. Prints markdown to stdout.
 *
 *   npx tsx scripts/nav-route-mapping.ts
 */
import { getNavForRole, getShellForRole, NAV_ROLES, type NavItem } from '../src/config/navigation';
import { LEGACY_NAV_ITEMS, type LegacyNavItem } from '../src/config/navigation/__fixtures__/legacy-nav-items';

const ALL_ON = {
  paidFeatures: { BACKGROUND_CHECKS: true, COMPLIANCE_KITS: true, OPERATOR_PLANS: true, PROVIDER_LISTING: true, CAREGIVER_PRO: true },
  marketplaceEnabled: true,
};
const SHELL_LABEL: Record<string, string> = {
  family: 'family (light)',
  professional: 'professional (navy)',
  caregiver: 'caregiver (light)',
  dischargePlanner: 'dischargePlanner (navy)',
  provider: 'provider (light)',
  affiliate: 'affiliate (light)',
};

function legacyHref(item: LegacyNavItem, role: string) {
  if (item.name === 'Caregivers') {
    if (role === 'OPERATOR' || role === 'ADMIN') return '/operator/caregivers';
    if (role === 'CAREGIVER') return '/settings/profile';
    return '/marketplace?tab=caregivers';
  }
  return item.href || '';
}

/** Where `href` sits in `role`'s new nav: "shell › group › label". */
function locate(role: string, href: string): string | null {
  const walk = (items: NavItem[], group?: string): string | null => {
    for (const i of items) {
      if (i.children) {
        const hit = walk(i.children, i.name);
        if (hit) return hit;
      } else if (i.href === href) {
        const shell = role === 'ADMIN' && group === 'Admin' ? 'admin (navy)' : SHELL_LABEL[getShellForRole(role)];
        return [shell, group ?? '(top level)', i.name].join(' › ');
      }
    }
    return null;
  };
  return walk(getNavForRole(role, ALL_ON));
}

const rows: string[] = [];
const esc = (s: string) => s.replace(/\|/g, '\\|');
for (const parent of LEGACY_NAV_ITEMS) {
  for (const item of parent.children ?? [parent]) {
    const section = parent.children ? parent.name : '(top level)';
    const rolesBefore = NAV_ROLES.filter((r) => !item.roleRestriction?.length || item.roleRestriction.includes(r));
    // Group roles by (href they actually got, new location).
    const byDest = new Map<string, string[]>();
    for (const r of rolesBefore) {
      const href = legacyHref(item, r);
      const where = locate(r, href) ?? 'MISSING';
      const key = `${href}\u0000${where}`;
      byDest.set(key, [...(byDest.get(key) ?? []), r]);
    }
    const flags = [item.paidFeature && `paid: ${item.paidFeature}`, item.name === 'Marketplace' && 'marketplace flag'].filter(Boolean).join(', ');
    for (const [key, roles] of byDest) {
      const [href, where] = key.split('\u0000');
      rows.push(
        `| \`${esc(href)}\`${href !== item.href ? ` (config: \`${esc(item.href ?? '')}\`)` : ''} | ${esc(item.name)} | ${esc(section)} | ${roles.join(', ')}${flags ? ` (${flags})` : ''} | ${esc(where)} | ${roles.join(', ')} |`,
      );
    }
  }
}

console.log('| Href | Label today | Section today | Roles today | New shell › group › label | Roles after |');
console.log('|---|---|---|---|---|---|');
console.log(rows.join('\n'));
