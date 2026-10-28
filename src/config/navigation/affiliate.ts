import { FiHome, FiLink } from 'react-icons/fi';
import { calendar, family, help, learn, marketplace, messages, moreGroup, savedHomes, searchHomes, settings } from './shared';
import type { NavItem } from './types';

export const affiliateDashboard: NavItem = { id: 'affiliate-dashboard', name: 'Affiliate Dashboard', icon: FiLink, href: '/affiliate/dashboard', roleRestriction: ['AFFILIATE', 'ADMIN'] };

/** OL-206 — AFFILIATE (light shell). */
export const AFFILIATE_NAV: NavItem[] = [
  { id: 'dashboard', name: 'Overview', icon: FiHome, href: '/dashboard', showInMobileBar: true, mobileOrder: 1 },
  affiliateDashboard,
  messages,
  settings,
  moreGroup([searchHomes, savedHomes, marketplace, family, calendar, learn, help]),
];
