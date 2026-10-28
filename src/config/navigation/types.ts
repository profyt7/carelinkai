import type { ComponentType } from 'react';
import type { PaidFeatureKey } from '@/lib/billing/paid-features';

/**
 * OL-206 — one navigation item. Same fields the old DashboardLayout navItems
 * array used (name, icon, href, showInMobileBar, roleRestriction, children,
 * highlight, paidFeature) plus a stable `id` (React key, active state, and the
 * collapsed-group key in localStorage['carelinkai-nav-collapsed']).
 */
export interface NavItem {
  id: string;
  name: string;
  /** Bottom-bar label when `name` is too long for a phone tab. */
  shortLabel?: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  href?: string;
  showInMobileBar?: boolean;
  /**
   * Bottom-bar priority among the items with showInMobileBar. Mirrors the old
   * single array's order so each role keeps the same 4 tabs (lower first).
   */
  mobileOrder?: number;
  /** Visible only to these roles. Omitted = every role on this shell. */
  roleRestriction?: string[];
  /** Collapsible group. */
  children?: NavItem[];
  /** Sidebar: group starts collapsed unless it holds the active route (a saved toggle wins). */
  defaultCollapsed?: boolean;
  /** Phone drawer: group starts collapsed (only "More"; other groups open expanded there). */
  drawerDefaultCollapsed?: boolean;
  /** Highlighted/upsell style. */
  highlight?: boolean;
  /** OL-186: hidden while this paid feature is switched off. */
  paidFeature?: PaidFeatureKey;
}

export type NavShell = 'family' | 'professional' | 'caregiver' | 'dischargePlanner' | 'provider' | 'affiliate';
