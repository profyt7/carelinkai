import { FiCreditCard, FiHome, FiShield } from 'react-icons/fi';
import { calendar, family, help, learn, marketplace, messages, moreGroup, rides, savedHomes, searchHomes, settings } from './shared';
import type { NavItem } from './types';

/** OL-206 — PROVIDER (light shell). */
export const PROVIDER_NAV: NavItem[] = [
  { id: 'dashboard', name: 'Overview', icon: FiHome, href: '/dashboard', showInMobileBar: true, mobileOrder: 1 },
  rides,
  { id: 'credentials', name: 'Credentials', icon: FiShield, href: '/settings/provider/credentials', roleRestriction: ['PROVIDER'] },
  { id: 'billing', name: 'Billing', icon: FiCreditCard, href: '/settings/provider/billing', roleRestriction: ['PROVIDER'], paidFeature: 'PROVIDER_LISTING' },
  messages,
  settings,
  moreGroup([searchHomes, savedHomes, marketplace, family, calendar, learn, help]),
];
