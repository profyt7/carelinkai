import { FiCalendar, FiClipboard, FiCreditCard, FiDollarSign, FiHome, FiUsers, FiZap } from 'react-icons/fi';
import { calendar, family, help, learn, marketplace, messages, moreGroup, myHires, residents, savedHomes, searchHomes, settings } from './shared';
import type { NavItem } from './types';

/** OL-206 — CAREGIVER (light shell). */
export const CAREGIVER_NAV: NavItem[] = [
  { id: 'dashboard', name: 'Overview', icon: FiHome, href: '/dashboard', showInMobileBar: true, mobileOrder: 1 },
  { ...marketplace, name: 'Find Work', icon: FiUsers },
  { id: 'applications', name: 'My Applications', icon: FiClipboard, href: '/caregiver/applications', roleRestriction: ['CAREGIVER'] },
  { id: 'shifts', name: 'Shifts', icon: FiCalendar, href: '/shifts', showInMobileBar: true, mobileOrder: 10, roleRestriction: ['CAREGIVER'] },
  { id: 'earnings', name: 'Earnings', icon: FiDollarSign, href: '/settings/payouts', showInMobileBar: true, mobileOrder: 11, roleRestriction: ['CAREGIVER'] },
  messages,
  settings,
  moreGroup([
    { id: 'points', name: 'My Points', icon: FiZap, href: '/caregiver/points', roleRestriction: ['CAREGIVER'] },
    residents,
    myHires,
    { id: 'billing', name: 'Billing', icon: FiCreditCard, href: '/settings/billing', roleRestriction: ['CAREGIVER'], paidFeature: 'CAREGIVER_PRO' },
    searchHomes,
    savedHomes,
    family,
    calendar,
    learn,
    help,
  ]),
];
