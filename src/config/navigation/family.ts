import { FiBriefcase, FiCalendar, FiFileText, FiHome, FiSearch } from 'react-icons/fi';
import {
  aiMatch, backgroundChecks, calendar, family, help, learn, marketplace, messages, moreGroup, myHires, myJobs, postJob, rides, savedHomes, settings,
} from './shared';
import type { NavItem } from './types';

/** OL-206 — FAMILY (light shell). */
export const FAMILY_NAV: NavItem[] = [
  { id: 'dashboard', name: 'Home', icon: FiHome, href: '/dashboard', showInMobileBar: true, mobileOrder: 1 },
  { id: 'search', name: 'Find Care', icon: FiSearch, href: '/search' },
  aiMatch,
  savedHomes,
  { id: 'my-inquiries', name: 'My Inquiries', icon: FiFileText, href: '/operator/inquiries', roleRestriction: ['FAMILY'] },
  { id: 'tours', name: 'Tours', icon: FiCalendar, href: '/dashboard/tours', showInMobileBar: true, mobileOrder: 3, roleRestriction: ['FAMILY'] },
  { id: 'Hire a Caregiver', name: 'Hire a Caregiver', icon: FiBriefcase, defaultCollapsed: true, children: [marketplace, postJob, myJobs, myHires] },
  messages,
  { ...learn, name: 'Care Resources', shortLabel: 'Resources' },
  { ...settings, name: 'Account' },
  moreGroup([rides, backgroundChecks, family, calendar, help]),
];
