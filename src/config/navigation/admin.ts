import { FiBarChart2, FiFileText, FiHome, FiShield, FiTool, FiUsers } from 'react-icons/fi';
import { Stethoscope } from 'lucide-react';
import { affiliateDashboard } from './affiliate';
import type { NavItem } from './types';

const ADMIN = ['ADMIN'];
const a = (id: string, name: string, icon: NavItem['icon'], href: string): NavItem => ({ id: `admin-${id}`, name, icon, href, roleRestriction: ADMIN });

/**
 * OL-206 — ADMIN = PROFESSIONAL_NAV + this "Admin" group: every /admin/* item
 * that used to sit under Settings, in the same order. Affiliate Dashboard is
 * the one other item ADMIN had (AFFILIATE + ADMIN), so it rides at the end.
 */
export const ADMIN_NAV: NavItem[] = [
  {
    id: 'Admin',
    name: 'Admin',
    icon: FiTool,
    roleRestriction: ADMIN,
    defaultCollapsed: true,
    children: [
      a('users', 'User Management', FiUsers, '/admin/users'),
      a('operators', 'Operators', FiHome, '/admin/operators'),
      a('caregivers', 'Caregivers', FiUsers, '/admin/caregivers'),
      a('homes', 'Homes', FiHome, '/admin/homes'),
      a('home-claims', 'Listing Claims', FiHome, '/admin/home-claims'),
      a('inquiries', 'Inquiries', FiFileText, '/admin/inquiries'),
      a('affiliates', 'Affiliates', FiUsers, '/admin/affiliates'),
      a('discharge-planners', 'Discharge Planners', FiFileText, '/admin/discharge-planners'),
      a('concierge', 'Concierge Queue', Stethoscope, '/admin/concierge'),
      a('concierge-metrics', 'Concierge Metrics', FiBarChart2, '/admin/concierge/metrics'),
      a('checkout-preflight', 'Checkout Preflight', FiBarChart2, '/admin/checkout-preflight'),
      a('dp-leads', 'DP Leads', Stethoscope, '/admin/dp-leads'),
      a('availability-pings', 'Availability Pings', FiHome, '/admin/availability-pings'),
      a('call-qa', 'Call QA', FiHome, '/admin/call-qa'),
      a('inbound-leads', 'Inbound Leads', Stethoscope, '/admin/inbound-leads'),
      a('analytics', 'Analytics', FiBarChart2, '/admin/analytics'),
      a('funnel', 'Conversion Funnel', FiBarChart2, '/admin/analytics/funnel'),
      a('audit-logs', 'Audit Logs', FiFileText, '/admin/audit-logs'),
      a('phi-access', 'ePHI Access Log', FiShield, '/admin/phi-access'),
      a('exports', 'Data Exports', FiFileText, '/admin/exports'),
      a('system-health', 'System Health', FiBarChart2, '/admin/system-health'),
      a('tools', 'Admin Tools', FiTool, '/admin/tools'),
      affiliateDashboard,
    ],
  },
];
