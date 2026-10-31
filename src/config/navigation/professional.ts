import { FiBarChart2, FiCalendar, FiClipboard, FiDollarSign, FiFileText, FiFolder, FiHome, FiPieChart, FiShield, FiStar, FiUsers, FiZap } from 'react-icons/fi';
import {
  aiMatch, backgroundChecks, calendar, family, help, learn, marketplace, messages, myHires, myJobs, postJob, residents, savedHomes, searchHomes, settings,
} from './shared';
import type { NavItem } from './types';

const OPS = ['OPERATOR', 'ADMIN', 'STAFF'];

/**
 * OL-206 — OPERATOR and STAFF (navy shell); ADMIN gets this plus admin.ts.
 * Every roleRestriction is the one the old array had, so STAFF still sees no
 * Billing / Reports / Analytics / Compliance Kits / Background Checks / AI Match.
 * Groups start collapsed (the one holding the active route opens); group ids
 * double as the collapsed-state key ("Operations" keeps its old saved state).
 */
export const PROFESSIONAL_NAV: NavItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: FiHome, href: '/dashboard', showInMobileBar: true, mobileOrder: 1 },
  {
    id: 'Communities',
    name: 'Communities',
    defaultCollapsed: true,
    icon: FiClipboard,
    children: [
      { id: 'operator', name: 'Operator', icon: FiHome, href: '/operator', roleRestriction: OPS },
      searchHomes,
      { id: 'caregivers', name: 'Caregivers', icon: FiUsers, href: '/operator/caregivers', roleRestriction: ['OPERATOR', 'ADMIN'] },
      // The old layout rewrote "Caregivers" to the marketplace caregiver tab for STAFF; kept as-is.
      { id: 'caregivers-staff', name: 'Caregivers', icon: FiUsers, href: '/marketplace?tab=caregivers', roleRestriction: ['STAFF'] },
      { id: 'caregiver-reviews', name: 'Caregiver Reviews', icon: FiStar, href: '/operator/reviews', roleRestriction: OPS },
      savedHomes,
      aiMatch,
    ],
  },
  {
    id: 'Inquiries & Tours',
    name: 'Inquiries & Tours',
    defaultCollapsed: true,
    shortLabel: 'Inquiries',
    icon: FiFileText,
    children: [
      { id: 'leads', name: 'Leads', icon: FiUsers, href: '/operator/leads', roleRestriction: OPS },
      { id: 'home-inquiries', name: 'Home Inquiries', icon: FiFileText, href: '/operator/inquiries', roleRestriction: OPS },
      { id: 'tour-requests', name: 'Tour Requests', icon: FiCalendar, href: '/operator/tours', roleRestriction: OPS },
      { id: 'pipeline', name: 'Pipeline Dashboard', icon: FiBarChart2, href: '/operator/inquiries/pipeline', roleRestriction: OPS },
    ],
  },
  residents,
  family,
  {
    id: 'Staffing',
    name: 'Staffing',
    defaultCollapsed: true,
    icon: FiCalendar,
    children: [
      marketplace,
      postJob,
      myJobs,
      myHires,
      { id: 'shifts', name: 'Shifts', icon: FiCalendar, href: '/operator/shifts', showInMobileBar: true, mobileOrder: 10, roleRestriction: OPS },
      // OL-241: only when the start route would accept it (Professional plan) and SMS sending is configured.
      { id: 'oncall', name: 'On-Call AI', icon: FiZap, href: '/operator/oncall', roleRestriction: OPS, capability: 'ONCALL' },
    ],
  },
  {
    id: 'Operations',
    name: 'Operations',
    defaultCollapsed: true,
    icon: FiShield,
    children: [
      calendar,
      { id: 'documents', name: 'Documents', icon: FiFolder, href: '/operator/documents', roleRestriction: OPS },
      { id: 'compliance', name: 'Compliance', icon: FiClipboard, href: '/operator/compliance', roleRestriction: OPS },
      { id: 'compliance-kits', name: 'Compliance Kits', icon: FiFolder, href: '/operator/compliance-kits', roleRestriction: ['OPERATOR', 'ADMIN'], paidFeature: 'COMPLIANCE_KITS' },
      { id: 'finances', name: 'Finances', icon: FiDollarSign, href: '/settings/payouts/operator', showInMobileBar: true, mobileOrder: 11, roleRestriction: OPS },
      { id: 'billing', name: 'Billing', icon: FiDollarSign, href: '/operator/billing', roleRestriction: ['OPERATOR', 'ADMIN'], paidFeature: 'OPERATOR_PLANS' },
      backgroundChecks,
    ],
  },
  {
    id: 'Reports & Insights',
    name: 'Reports & Insights',
    defaultCollapsed: true,
    icon: FiBarChart2,
    children: [
      { id: 'reports', name: 'Reports', icon: FiBarChart2, href: '/reports', roleRestriction: ['OPERATOR', 'ADMIN'] },
      { id: 'analytics', name: 'Analytics', icon: FiPieChart, href: '/operator/analytics', roleRestriction: ['OPERATOR', 'ADMIN'] },
    ],
  },
  messages,
  learn,
  help,
  settings,
];
