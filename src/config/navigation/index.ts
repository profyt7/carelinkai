import type { PaidFeatureKey } from '@/lib/billing/paid-features';
import type { OperatorCapability } from '@/lib/operator/capabilities';
import { ADMIN_NAV } from './admin';
import { AFFILIATE_NAV } from './affiliate';
import { CAREGIVER_NAV } from './caregiver';
import { DISCHARGE_PLANNER_NAV } from './dischargePlanner';
import { FAMILY_NAV } from './family';
import { PROFESSIONAL_NAV } from './professional';
import { PROVIDER_NAV } from './provider';
import type { NavItem, NavShell } from './types';

export type { NavItem, NavShell } from './types';

/**
 * OL-206 — role → navigation. One role, one nav. getNavForRole applies
 * roleRestriction, paidFeature, operator capabilities and the marketplace flag, so the sidebar only
 * ever receives items the user can see (same rules the old DashboardLayout
 * applied inline).
 */

export const NAV_ROLES = ['FAMILY', 'OPERATOR', 'STAFF', 'ADMIN', 'CAREGIVER', 'DISCHARGE_PLANNER', 'PROVIDER', 'AFFILIATE'] as const;

const NAVY_ROLES = new Set(['OPERATOR', 'STAFF', 'ADMIN', 'DISCHARGE_PLANNER']);

export function getToneForRole(role: string | null | undefined): 'navy' | 'light' {
  return NAVY_ROLES.has(String(role || '').toUpperCase()) ? 'navy' : 'light';
}

export function getShellForRole(role: string | null | undefined): NavShell {
  switch (String(role || '').toUpperCase()) {
    case 'OPERATOR':
    case 'STAFF':
    case 'ADMIN':
      return 'professional';
    case 'CAREGIVER':
      return 'caregiver';
    case 'DISCHARGE_PLANNER':
      return 'dischargePlanner';
    case 'PROVIDER':
      return 'provider';
    case 'AFFILIATE':
      return 'affiliate';
    default:
      return 'family';
  }
}

const SHELLS: Record<NavShell, NavItem[]> = {
  family: FAMILY_NAV,
  professional: PROFESSIONAL_NAV,
  caregiver: CAREGIVER_NAV,
  dischargePlanner: DISCHARGE_PLANNER_NAV,
  provider: PROVIDER_NAV,
  affiliate: AFFILIATE_NAV,
};

/** Unfiltered tree for a role: its shell, plus the Admin group for ADMIN (before Messages). */
export function getNavTreeForRole(role: string | null | undefined): NavItem[] {
  const tree = SHELLS[getShellForRole(role)];
  if (String(role || '').toUpperCase() !== 'ADMIN') return tree;
  const at = tree.findIndex((i) => i.id === 'messages');
  return [...tree.slice(0, at), ...ADMIN_NAV, ...tree.slice(at)];
}

export type NavVisibilityOptions = {
  /** Paid-feature switches: a lookup (usePaidFeatures().isEnabled) or a map. Missing = off. */
  paidFeatures?: ((key: PaidFeatureKey) => boolean) | Partial<Record<PaidFeatureKey, boolean>>;
  /** NEXT_PUBLIC_MARKETPLACE_ENABLED !== 'false'. Hides /marketplace itself, as before. */
  marketplaceEnabled?: boolean;
  /** OL-241 operator capabilities (useOperatorCapabilities().has, or a map). Missing = hidden. */
  capabilities?: ((key: OperatorCapability) => boolean) | Partial<Record<OperatorCapability, boolean>>;
};

function isVisible(item: NavItem, role: string, opts: NavVisibilityOptions): boolean {
  if (item.roleRestriction?.length && !item.roleRestriction.map((r) => r.toUpperCase()).includes(role)) return false;
  if (item.href === '/marketplace' && opts.marketplaceEnabled === false) return false;
  if (item.paidFeature) {
    const pf = opts.paidFeatures;
    const on = typeof pf === 'function' ? pf(item.paidFeature) : pf?.[item.paidFeature] === true;
    if (!on) return false;
  }
  if (item.capability) {
    const c = opts.capabilities;
    const on = typeof c === 'function' ? c(item.capability) : c?.[item.capability] === true;
    if (!on) return false;
  }
  return true;
}

function filterTree(items: NavItem[], role: string, opts: NavVisibilityOptions): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (!isVisible(item, role, opts)) continue;
    if (item.children) {
      const children = filterTree(item.children, role, opts);
      if (children.length === 0) continue; // never render an empty group
      out.push({ ...item, children });
    } else {
      out.push(item);
    }
  }
  return out;
}

export function getNavForRole(role: string | null | undefined, opts: NavVisibilityOptions = {}): NavItem[] {
  const r = String(role || '').toUpperCase();
  return filterTree(getNavTreeForRole(r), r, opts);
}

/** Depth-first list of every leaf (linkable) item. */
export function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => (i.children ? flattenNav(i.children) : [i]));
}

/** Bottom-bar ids: visible showInMobileBar items by mobileOrder, first 4 (the shell adds "More"). */
export function getMobileTabIds(role: string | null | undefined, opts: NavVisibilityOptions = {}): string[] {
  return flattenNav(getNavForRole(role, opts))
    .filter((i) => i.showInMobileBar)
    .map((item, idx) => ({ item, idx }))
    .sort((x, y) => (x.item.mobileOrder ?? Infinity) - (y.item.mobileOrder ?? Infinity) || x.idx - y.idx)
    .slice(0, 4)
    .map(({ item }) => item.id);
}

/** Same rule as the old isPathActive: exact match or a path segment below it. */
export function isPathActive(pathname: string | null | undefined, href: string | undefined): boolean {
  if (!href || !pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The visible leaf whose href best matches the path (longest match wins). */
export function getActiveNavId(items: NavItem[], pathname: string | null | undefined): string {
  let best: NavItem | undefined;
  for (const i of flattenNav(items)) {
    if (isPathActive(pathname, i.href) && (!best || (i.href?.length ?? 0) > (best.href?.length ?? 0))) best = i;
  }
  return best?.id ?? '';
}
