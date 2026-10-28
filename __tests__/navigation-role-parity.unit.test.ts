/**
 * OL-206 — role navigation parity. The set of {href, role} pairs a user could
 * reach from the old all-roles DashboardLayout menu must equal the set
 * getNavForRole exposes, for all 8 roles, under every paid-feature / marketplace
 * switch combination. The old side replays the old layout's rules exactly
 * (role filter, marketplace flag, paid features, and its getComputedHref
 * rewrite of "Caregivers").
 */
import { flattenNav, getMobileTabIds, getNavForRole, getToneForRole, NAV_ROLES } from '@/config/navigation';
import { LEGACY_NAV_ITEMS, type LegacyNavItem } from '@/config/navigation/__fixtures__/legacy-nav-items';

const PAID = ['BACKGROUND_CHECKS', 'COMPLIANCE_KITS', 'OPERATOR_PLANS', 'PROVIDER_LISTING', 'CAREGIVER_PRO'] as const;

type Opts = { paid: boolean; marketplace: boolean };
const COMBOS: Opts[] = [
  { paid: true, marketplace: true },
  { paid: false, marketplace: true },
  { paid: true, marketplace: false },
  { paid: false, marketplace: false },
];

function legacyVisible(item: LegacyNavItem, role: string, o: Opts) {
  if (item.roleRestriction?.length && !item.roleRestriction.map((r) => r.toUpperCase()).includes(role)) return false;
  if (item.name === 'Marketplace' && !o.marketplace) return false;
  if (item.paidFeature && !o.paid) return false;
  return true;
}

// Old getComputedHref.
function legacyHref(item: LegacyNavItem, role: string) {
  if (item.name === 'Caregivers') {
    if (role === 'OPERATOR' || role === 'ADMIN') return '/operator/caregivers';
    if (role === 'CAREGIVER') return '/settings/profile';
    return '/marketplace?tab=caregivers';
  }
  return item.href || '';
}

function legacyLinks(role: string, o: Opts): LegacyNavItem[] {
  const out: LegacyNavItem[] = [];
  for (const item of LEGACY_NAV_ITEMS) {
    if (item.children) out.push(...item.children.filter((c) => legacyVisible(c, role, o)));
    else if (legacyVisible(item, role, o)) out.push(item);
  }
  return out;
}

const legacyPairs = (role: string, o: Opts) => new Set(legacyLinks(role, o).map((i) => `${role} ${legacyHref(i, role)}`));

function legacyMobileHrefs(role: string, o: Opts) {
  const bar: LegacyNavItem[] = [];
  for (const item of LEGACY_NAV_ITEMS) {
    for (const i of item.children ?? [item]) {
      // Old mobile check: paid → role (returns early) → marketplace.
      if (!i.showInMobileBar) continue;
      if (i.paidFeature && !o.paid) continue;
      if (i.roleRestriction?.length) {
        if (!i.roleRestriction.includes(role)) continue;
      } else if (i.name === 'Marketplace' && !o.marketplace) continue;
      bar.push(i);
    }
  }
  return bar.slice(0, 4).map((i) => i.href);
}

const navOpts = (o: Opts) => ({
  paidFeatures: Object.fromEntries(PAID.map((k) => [k, o.paid])),
  marketplaceEnabled: o.marketplace,
});
const newPairs = (role: string, o: Opts) => new Set(flattenNav(getNavForRole(role, navOpts(o))).map((i) => `${role} ${i.href}`));

/**
 * Declared differences, each one a link the old menu showed under the wrong
 * href. ADMIN's "Caregivers" admin item (/admin/caregivers) was rewritten to
 * /operator/caregivers by getComputedHref; the Admin group now links the admin
 * page it names. ADMIN keeps /operator/caregivers under Communities.
 */
const ADDED = new Set(['ADMIN /admin/caregivers']);

describe('OL-206 role navigation parity', () => {
  it('covers all 8 roles', () => {
    expect([...NAV_ROLES].sort()).toEqual(['ADMIN', 'AFFILIATE', 'CAREGIVER', 'DISCHARGE_PLANNER', 'FAMILY', 'OPERATOR', 'PROVIDER', 'STAFF']);
  });

  for (const o of COMBOS) {
    describe(`paid=${o.paid} marketplace=${o.marketplace}`, () => {
      for (const role of NAV_ROLES) {
        it(`${role}: same {href, role} pairs as the old menu`, () => {
          const before = legacyPairs(role, o);
          const after = newPairs(role, o);
          const lost = [...before].filter((p) => !after.has(p));
          const added = [...after].filter((p) => !before.has(p) && !ADDED.has(p));
          expect(lost).toEqual([]);
          expect(added).toEqual([]);
        });

        it(`${role}: same 4 bottom-bar destinations`, () => {
          const items = flattenNav(getNavForRole(role, navOpts(o)));
          const hrefs = getMobileTabIds(role, navOpts(o)).map((id) => items.find((i) => i.id === id)?.href);
          expect(hrefs).toEqual(legacyMobileHrefs(role, o));
        });
      }
    });
  }

  it('every visible group has children and ids are unique per role', () => {
    for (const role of NAV_ROLES) {
      const tree = getNavForRole(role, navOpts(COMBOS[0]));
      const walk = (items: typeof tree): string[] => items.flatMap((i) => [i.id, ...(i.children ? walk(i.children) : [])]);
      const ids = walk(tree);
      expect(new Set(ids).size).toBe(ids.length);
      for (const g of tree.filter((i) => i.children)) expect(g.children!.length).toBeGreaterThan(0);
    }
  });

  it('ADMIN has an Admin group with every /admin/* item from the old Settings section, in order', () => {
    const oldAdmin = LEGACY_NAV_ITEMS.find((i) => i.name === 'Settings')!.children!.filter((c) => c.href?.startsWith('/admin/')).map((c) => c.href);
    const group = getNavForRole('ADMIN', navOpts(COMBOS[0])).find((i) => i.id === 'Admin')!;
    const hrefs = group.children!.map((c) => c.href).filter((h) => h?.startsWith('/admin/'));
    expect(oldAdmin).toHaveLength(20);
    expect(hrefs).toEqual(oldAdmin);
    expect(getNavForRole('OPERATOR', navOpts(COMBOS[0])).some((i) => i.id === 'Admin')).toBe(false);
  });

  it('tone by role', () => {
    expect(NAV_ROLES.map((r) => [r, getToneForRole(r)])).toEqual([
      ['FAMILY', 'light'], ['OPERATOR', 'navy'], ['STAFF', 'navy'], ['ADMIN', 'navy'],
      ['CAREGIVER', 'light'], ['DISCHARGE_PLANNER', 'navy'], ['PROVIDER', 'light'], ['AFFILIATE', 'light'],
    ]);
  });
});
