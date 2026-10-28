import { FiBook, FiBriefcase, FiCalendar, FiCheckCircle, FiHeart, FiHelpCircle, FiMoreHorizontal, FiSearch, FiSettings, FiShield, FiUsers, FiZap } from 'react-icons/fi';
import { MessageSquare } from 'lucide-react';
import type { NavItem } from './types';

/** OL-206 — items every shell carries. Only "Settings" itself; the admin pages live in admin.ts. */
export const messages: NavItem = { id: 'messages', name: 'Messages', icon: MessageSquare, href: '/messages', showInMobileBar: true, mobileOrder: 8 };
export const calendar: NavItem = { id: 'calendar', name: 'Calendar', icon: FiCalendar, href: '/calendar', showInMobileBar: true, mobileOrder: 9 };
export const learn: NavItem = {
  id: 'learn',
  name: 'Learn',
  icon: FiBook,
  href: '/learn',
  roleRestriction: ['FAMILY', 'CAREGIVER', 'OPERATOR', 'ADMIN', 'STAFF', 'AFFILIATE', 'DISCHARGE_PLANNER', 'PROVIDER'],
};
export const help: NavItem = { id: 'help', name: 'Help', icon: FiHelpCircle, href: '/help' };
export const settings: NavItem = { id: 'settings', name: 'Settings', icon: FiSettings, href: '/settings' };

// Unrestricted items every role reaches today; shells that don't feature them keep them under these names.
export const searchHomes: NavItem = { id: 'search', name: 'Search Homes', icon: FiSearch, href: '/search' };
export const savedHomes: NavItem = { id: 'favorites', name: 'Saved Homes', icon: FiHeart, href: '/favorites' };
export const marketplace: NavItem = { id: 'marketplace', name: 'Marketplace', icon: FiUsers, href: '/marketplace', showInMobileBar: true, mobileOrder: 2 };
export const family: NavItem = { id: 'family', name: 'Family', icon: FiUsers, href: '/family', showInMobileBar: true, mobileOrder: 7 };

// Marketplace hiring items (family "Hire a Caregiver", professional "Staffing", caregiver "My Hires").
export const postJob: NavItem = { id: 'post-job', name: 'Post a Job', icon: FiBriefcase, href: '/marketplace/listings/new', roleRestriction: ['FAMILY', 'OPERATOR', 'ADMIN', 'STAFF'] };
export const myJobs: NavItem = { id: 'my-jobs', name: 'My Jobs', icon: FiBriefcase, href: '/marketplace?tab=jobs&postedByMe=true', roleRestriction: ['FAMILY', 'OPERATOR', 'ADMIN', 'STAFF'] };
export const myHires: NavItem = { id: 'my-hires', name: 'My Hires', icon: FiCheckCircle, href: '/marketplace/hires', roleRestriction: ['OPERATOR', 'ADMIN', 'STAFF', 'FAMILY', 'CAREGIVER'] };

export const aiMatch: NavItem = { id: 'ai-match', name: 'AI Match', icon: FiZap, href: '/dashboard/find-care', showInMobileBar: true, mobileOrder: 4, roleRestriction: ['FAMILY', 'OPERATOR', 'ADMIN'] };
export const backgroundChecks: NavItem = {
  id: 'background-checks',
  name: 'Background Checks',
  icon: FiShield,
  href: '/background-checks',
  roleRestriction: ['FAMILY', 'OPERATOR', 'ADMIN'],
  paidFeature: 'BACKGROUND_CHECKS',
};
export const residents: NavItem = { id: 'residents', name: 'Residents', icon: FiUsers, href: '/operator/residents', showInMobileBar: true, mobileOrder: 6, roleRestriction: ['OPERATOR', 'ADMIN', 'CAREGIVER', 'STAFF'] };
export const rides: NavItem = { id: 'rides', name: 'Rides', icon: FiCalendar, href: '/rides', roleRestriction: ['FAMILY', 'PROVIDER'] };

/** Last group of a non-professional shell: the links the role reaches but the shell doesn't feature. Collapsed in the drawer too. */
export const moreGroup = (children: NavItem[]): NavItem => ({ id: 'more', name: 'More', icon: FiMoreHorizontal, defaultCollapsed: true, drawerDefaultCollapsed: true, children });

export const SHARED: NavItem[] = [messages, calendar, learn, help, settings];
