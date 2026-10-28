import { FiHome } from 'react-icons/fi';
import { Stethoscope } from 'lucide-react';
import { calendar, family, help, learn, marketplace, messages, moreGroup, savedHomes, searchHomes, settings } from './shared';
import type { NavItem } from './types';

/** OL-206 — DISCHARGE_PLANNER (navy shell). */
export const DISCHARGE_PLANNER_NAV: NavItem[] = [
  { id: 'dashboard', name: 'Overview', icon: FiHome, href: '/dashboard', showInMobileBar: true, mobileOrder: 1 },
  { id: 'find-placement', name: 'Find Placement', shortLabel: 'Placement', icon: Stethoscope, href: '/discharge-planner', showInMobileBar: true, mobileOrder: 5, roleRestriction: ['DISCHARGE_PLANNER'] },
  { id: 'concierge', name: 'Care Concierge', icon: Stethoscope, href: '/discharge-planner/concierge', roleRestriction: ['DISCHARGE_PLANNER'] },
  messages,
  learn,
  settings,
  moreGroup([searchHomes, savedHomes, marketplace, family, calendar, help]),
];
