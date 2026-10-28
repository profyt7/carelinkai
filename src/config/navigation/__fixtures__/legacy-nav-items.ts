/**
 * OL-206 — frozen copy of the navItems array DashboardLayout rendered before
 * OL-206 (main @ 24537cee), icons stripped. Do not edit: the parity test
 * compares today's per-role navigation against exactly this.
 */
export interface LegacyNavItem {
  name: string;
  href?: string;
  showInMobileBar?: boolean;
  roleRestriction?: string[];
  children?: LegacyNavItem[];
  highlight?: boolean;
  paidFeature?: string;
}

export const LEGACY_NAV_ITEMS: LegacyNavItem[] = [
  // 1. Dashboard (standalone)
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    showInMobileBar: true 
  },
  
  // 2. Listings (collapsible)
  {
    name: "Listings",
    children: [
      { name: "Search Homes", href: "/search", showInMobileBar: false },
      { name: "Marketplace", href: "/marketplace", showInMobileBar: true },
      { name: "My Applications", href: "/caregiver/applications", showInMobileBar: false, roleRestriction: ["CAREGIVER"] },
      { name: "My Saved", href: "/favorites", showInMobileBar: false },
      { name: "Post a Job", href: "/marketplace/listings/new", showInMobileBar: false, roleRestriction: ["FAMILY", "OPERATOR", "ADMIN", "STAFF"] },
      { name: "My Jobs", href: "/marketplace?tab=jobs&postedByMe=true", showInMobileBar: false, roleRestriction: ["FAMILY", "OPERATOR", "ADMIN", "STAFF"] },
      { name: "My Hires", href: "/marketplace/hires", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF", "FAMILY", "CAREGIVER"] },
      { name: "Caregivers", href: "/operator/caregivers", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "Caregiver Reviews", href: "/operator/reviews", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "Operator", href: "/operator", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
    ]
  },
  
  // 3. Leads & Inquiries (collapsible)
  {
    name: "Leads & Inquiries",
    roleRestriction: ["OPERATOR", "ADMIN", "STAFF", "FAMILY"],
    children: [
      { name: "Leads", href: "/operator/leads", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "My Inquiries", href: "/operator/inquiries", showInMobileBar: false, roleRestriction: ["FAMILY"] },
      { name: "Home Inquiries", href: "/operator/inquiries", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "Tour Requests", href: "/operator/tours", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "My Tours", href: "/dashboard/tours", showInMobileBar: true, roleRestriction: ["FAMILY"] },
      { name: "Pipeline Dashboard", href: "/operator/inquiries/pipeline", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
    ]
  },
  
  // 4. AI Tools (collapsible)
  {
    name: "AI Tools",
    roleRestriction: ["FAMILY", "OPERATOR", "ADMIN", "DISCHARGE_PLANNER"],
    children: [
      { name: "AI Match", href: "/dashboard/find-care", showInMobileBar: true, roleRestriction: ["FAMILY", "OPERATOR", "ADMIN"] },
      { name: "Discharge Planner", href: "/discharge-planner", showInMobileBar: true, roleRestriction: ["DISCHARGE_PLANNER"] },
      { name: "Concierge", href: "/discharge-planner/concierge", showInMobileBar: false, roleRestriction: ["DISCHARGE_PLANNER"] },
    ]
  },
  
  // 4c. My Rides (FAMILY + PROVIDER transport)
  {
    name: "My Rides",
    href: "/rides",
    showInMobileBar: false,
    roleRestriction: ["FAMILY", "PROVIDER"],
  },

  // 4d. Background Checks (FAMILY + OPERATOR)
  {
    name: "Background Checks",
    href: "/background-checks",
    showInMobileBar: false,
    roleRestriction: ["FAMILY", "OPERATOR", "ADMIN"],
    paidFeature: "BACKGROUND_CHECKS",
  },

  // 5. Residents & Family (collapsible)
  {
    name: "Residents & Family",
    children: [
      { name: "Residents", href: "/operator/residents", showInMobileBar: true, roleRestriction: ["OPERATOR", "ADMIN", "CAREGIVER", "STAFF"] },
      { name: "Family", href: "/family", showInMobileBar: true },
      { name: "Messages", href: "/messages", showInMobileBar: true },
    ]
  },
  
  // 6. Operations (collapsible)
  {
    name: "Operations",
    children: [
      { name: "Calendar", href: "/calendar", showInMobileBar: true },
      { name: "Shifts", href: "/shifts", showInMobileBar: true, roleRestriction: ["CAREGIVER"] },
      { name: "Shifts", href: "/operator/shifts", showInMobileBar: true, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "My Points", href: "/caregiver/points", showInMobileBar: false, roleRestriction: ["CAREGIVER"] },
      { name: "On-Call AI", href: "/operator/oncall", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "Documents", href: "/operator/documents", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "Compliance", href: "/operator/compliance", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
      { name: "Compliance Kits", href: "/operator/compliance-kits", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN"], paidFeature: "COMPLIANCE_KITS" },
      { name: "Finances", href: "/settings/payouts", showInMobileBar: true, roleRestriction: ["CAREGIVER"] },
      { name: "Finances", href: "/settings/payouts/operator", showInMobileBar: true, roleRestriction: ["OPERATOR", "ADMIN", "STAFF"] },
    ]
  },

  // 7. Reports (standalone)
  {
    name: "Reports",
    href: "/reports",
    showInMobileBar: false,
    roleRestriction: ["OPERATOR", "ADMIN"]
  },

  // 7b. Analytics (operator-specific)
  {
    name: "Analytics",
    href: "/operator/analytics",
    showInMobileBar: false,
    roleRestriction: ["OPERATOR", "ADMIN"],
  },

  // 8. Billing (standalone — operator subscription management)
  {
    name: "Billing",
    href: "/operator/billing",
    showInMobileBar: false,
    roleRestriction: ["OPERATOR", "ADMIN"],
    paidFeature: "OPERATOR_PLANS",
  },

  // 8a. (removed) Discharge Planner Billing — DP access is FREE (ratified 2026-06-27);
  // no subscription, so no billing nav for discharge planners.

  // 8b-i. Provider Listing Billing
  {
    name: "Listing & Billing",
    href: "/settings/provider/billing",
    showInMobileBar: false,
    roleRestriction: ["PROVIDER"],
    paidFeature: "PROVIDER_LISTING",
  },

  // 8b-iii. Provider Credentials
  {
    name: "Credentials",
    href: "/settings/provider/credentials",
    showInMobileBar: false,
    roleRestriction: ["PROVIDER"],
  },

  // 8b-ii. Caregiver Pro Membership
  {
    name: "Pro Membership",
    href: "/settings/billing",
    showInMobileBar: false,
    roleRestriction: ["CAREGIVER"],
    paidFeature: "CAREGIVER_PRO",
  },

  // 8b. Affiliate Dashboard (affiliate-only)
  {
    name: "Affiliate Dashboard",
    href: "/affiliate/dashboard",
    showInMobileBar: false,
    roleRestriction: ["AFFILIATE", "ADMIN"],
  },

  // 8c. Education Hub (all roles)
  {
    name: "Education Hub",
    href: "/learn",
    showInMobileBar: false,
    roleRestriction: ["FAMILY", "CAREGIVER", "OPERATOR", "ADMIN", "STAFF", "AFFILIATE", "DISCHARGE_PLANNER", "PROVIDER"],
  },

  // 9. Settings (collapsible)
  {
    name: "Settings",
    children: [
      { name: "Settings", href: "/settings", showInMobileBar: false },
      { name: "User Management", href: "/admin/users", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Operators", href: "/admin/operators", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Caregivers", href: "/admin/caregivers", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Homes", href: "/admin/homes", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Inquiries", href: "/admin/inquiries", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Affiliates", href: "/admin/affiliates", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Discharge Planners", href: "/admin/discharge-planners", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Concierge Queue", href: "/admin/concierge", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Concierge Metrics", href: "/admin/concierge/metrics", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Checkout Preflight", href: "/admin/checkout-preflight", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "DP Leads", href: "/admin/dp-leads", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Availability Pings", href: "/admin/availability-pings", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Call QA", href: "/admin/call-qa", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Inbound Leads", href: "/admin/inbound-leads", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Analytics", href: "/admin/analytics", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Audit Logs", href: "/admin/audit-logs", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "ePHI Access Log", href: "/admin/phi-access", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Data Exports", href: "/admin/exports", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "System Health", href: "/admin/system-health", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Admin Tools", href: "/admin/tools", showInMobileBar: false, roleRestriction: ["ADMIN"] },
      { name: "Help", href: "/help", showInMobileBar: false },
    ]
  },
];
