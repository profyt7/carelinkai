# NAV_ROUTE_MAPPING — OL-206 role navigation

Every href in the pre-OL-206 `navItems` array (`src/components/layout/DashboardLayout.tsx` @ `24537cee`,
frozen in `src/config/navigation/__fixtures__/legacy-nav-items.ts`), where it was, who saw it, and where it lives now.

- **Source of truth:** `src/config/navigation/` (`getNavForRole(role, { paidFeatures, marketplaceEnabled })`).
- **Enforced by:** `__tests__/navigation-role-parity.unit.test.ts`. The set of `{href, role}` pairs reachable
  from the old array equals the set from `getNavForRole` for all 8 roles, under all four paid-feature ×
  marketplace-flag combinations. The same test pins each role's 4 bottom-bar destinations to the old ones.
- **e2e:** `e2e/role-navigation.spec.ts` signs in as each role, opens `/dashboard` and checks the tone,
  the top-level labels, every href below, and the 390px bar.
- **Regenerate the table:** `npx tsx scripts/nav-route-mapping.ts`.

"Roles today" is who could see the link; "(paid: X)" links still hide while that paid feature is off, and
"(marketplace flag)" links hide when `NEXT_PUBLIC_MARKETPLACE_ENABLED=false`, exactly as before.

## Notes

1. **Admin group = 20 items, not 23.** The old Settings section held exactly 20 `/admin/*` links. They're all
   in the Admin group, in the same order. Affiliate Dashboard (AFFILIATE + ADMIN before) is appended to the
   group, so ADMIN loses nothing.
2. **One added link: ADMIN `/admin/caregivers`.** The old layout's `getComputedHref` rewrote every item named
   "Caregivers". So the admin "Caregivers" link (config `/admin/caregivers`) actually pointed at
   `/operator/caregivers`. The Admin group now links the admin page it names. ADMIN still has
   `/operator/caregivers` under Communities. This is the only `{href, role}` pair that differs, and the
   parity test declares it explicitly.
3. **STAFF "Caregivers" stays `/marketplace?tab=caregivers`.** That's the href the same rewrite gave STAFF.
   It is kept as a separate STAFF-only item, so STAFF's destinations don't change.
4. **Carried-over items → "More".** Every non-professional shell ends with a "More" group (id `more`,
   collapsed by default; `defaultCollapsed`). It holds the links the role reaches today but that aren't in its
   headline list: Search Homes, Saved Homes, Marketplace, Family, Calendar, Help, plus a few role links
   (FAMILY Rides / Background Checks; CAREGIVER My Points / Residents / My Hires / Billing / Learn; PROVIDER /
   AFFILIATE Learn). Hrefs and roleRestrictions are unchanged, so nobody loses a destination. The professional
   shell has no More group: Saved Homes and AI Match sit under Communities, and Family sits next to
   Residents.
5. **Group collapse state.** In the sidebar every group starts collapsed; the group holding the active
   route opens on load. A manual expand/collapse is saved in `localStorage['carelinkai-nav-collapsed']`
   (keyed by group id) and wins over both defaults on later visits. Group ids are the group names, so
   "Operations" keeps its old saved state; old keys ("Listings", ...) are left in place. The icon-rail
   flyouts are unchanged. The phone drawer opens every group expanded except More.
6. **Bottom bar.** Each item keeps `showInMobileBar`. `mobileOrder` reproduces the old single-array order, so
   every role keeps the same 4 tabs (+ More). The labels follow the new names (e.g. FAMILY "Home" for
   `/dashboard`). It now shows below 768px (md), matching the shell; before, the cut-off was 640px.

## Table

| Href | Label today | Section today | Roles today | New shell › group › label | Roles after |
|---|---|---|---|---|---|
| `/dashboard` | Dashboard | (top level) | FAMILY | family (light) › (top level) › Home | FAMILY |
| `/dashboard` | Dashboard | (top level) | OPERATOR, STAFF, ADMIN | professional (navy) › (top level) › Dashboard | OPERATOR, STAFF, ADMIN |
| `/dashboard` | Dashboard | (top level) | CAREGIVER | caregiver (light) › (top level) › Overview | CAREGIVER |
| `/dashboard` | Dashboard | (top level) | DISCHARGE_PLANNER | dischargePlanner (navy) › (top level) › Overview | DISCHARGE_PLANNER |
| `/dashboard` | Dashboard | (top level) | PROVIDER | provider (light) › (top level) › Overview | PROVIDER |
| `/dashboard` | Dashboard | (top level) | AFFILIATE | affiliate (light) › (top level) › Overview | AFFILIATE |
| `/search` | Search Homes | Listings | FAMILY | family (light) › (top level) › Find Care | FAMILY |
| `/search` | Search Homes | Listings | OPERATOR, STAFF, ADMIN | professional (navy) › Communities › Search Homes | OPERATOR, STAFF, ADMIN |
| `/search` | Search Homes | Listings | CAREGIVER | caregiver (light) › More › Search Homes | CAREGIVER |
| `/search` | Search Homes | Listings | DISCHARGE_PLANNER | dischargePlanner (navy) › More › Search Homes | DISCHARGE_PLANNER |
| `/search` | Search Homes | Listings | PROVIDER | provider (light) › More › Search Homes | PROVIDER |
| `/search` | Search Homes | Listings | AFFILIATE | affiliate (light) › More › Search Homes | AFFILIATE |
| `/marketplace` | Marketplace | Listings | FAMILY (marketplace flag) | family (light) › Hire a Caregiver › Marketplace | FAMILY |
| `/marketplace` | Marketplace | Listings | OPERATOR, STAFF, ADMIN (marketplace flag) | professional (navy) › Staffing › Marketplace | OPERATOR, STAFF, ADMIN |
| `/marketplace` | Marketplace | Listings | CAREGIVER (marketplace flag) | caregiver (light) › (top level) › Find Work | CAREGIVER |
| `/marketplace` | Marketplace | Listings | DISCHARGE_PLANNER (marketplace flag) | dischargePlanner (navy) › More › Marketplace | DISCHARGE_PLANNER |
| `/marketplace` | Marketplace | Listings | PROVIDER (marketplace flag) | provider (light) › More › Marketplace | PROVIDER |
| `/marketplace` | Marketplace | Listings | AFFILIATE (marketplace flag) | affiliate (light) › More › Marketplace | AFFILIATE |
| `/caregiver/applications` | My Applications | Listings | CAREGIVER | caregiver (light) › (top level) › My Applications | CAREGIVER |
| `/favorites` | My Saved | Listings | FAMILY | family (light) › (top level) › Saved Homes | FAMILY |
| `/favorites` | My Saved | Listings | OPERATOR, STAFF, ADMIN | professional (navy) › Communities › Saved Homes | OPERATOR, STAFF, ADMIN |
| `/favorites` | My Saved | Listings | CAREGIVER | caregiver (light) › More › Saved Homes | CAREGIVER |
| `/favorites` | My Saved | Listings | DISCHARGE_PLANNER | dischargePlanner (navy) › More › Saved Homes | DISCHARGE_PLANNER |
| `/favorites` | My Saved | Listings | PROVIDER | provider (light) › More › Saved Homes | PROVIDER |
| `/favorites` | My Saved | Listings | AFFILIATE | affiliate (light) › More › Saved Homes | AFFILIATE |
| `/marketplace/listings/new` | Post a Job | Listings | FAMILY | family (light) › Hire a Caregiver › Post a Job | FAMILY |
| `/marketplace/listings/new` | Post a Job | Listings | OPERATOR, STAFF, ADMIN | professional (navy) › Staffing › Post a Job | OPERATOR, STAFF, ADMIN |
| `/marketplace?tab=jobs&postedByMe=true` | My Jobs | Listings | FAMILY | family (light) › Hire a Caregiver › My Jobs | FAMILY |
| `/marketplace?tab=jobs&postedByMe=true` | My Jobs | Listings | OPERATOR, STAFF, ADMIN | professional (navy) › Staffing › My Jobs | OPERATOR, STAFF, ADMIN |
| `/marketplace/hires` | My Hires | Listings | FAMILY | family (light) › Hire a Caregiver › My Hires | FAMILY |
| `/marketplace/hires` | My Hires | Listings | OPERATOR, STAFF, ADMIN | professional (navy) › Staffing › My Hires | OPERATOR, STAFF, ADMIN |
| `/marketplace/hires` | My Hires | Listings | CAREGIVER | caregiver (light) › More › My Hires | CAREGIVER |
| `/operator/caregivers` | Caregivers | Listings | OPERATOR, ADMIN | professional (navy) › Communities › Caregivers | OPERATOR, ADMIN |
| `/marketplace?tab=caregivers` (config: `/operator/caregivers`) | Caregivers | Listings | STAFF | professional (navy) › Communities › Caregivers | STAFF |
| `/operator/reviews` | Caregiver Reviews | Listings | OPERATOR, STAFF, ADMIN | professional (navy) › Communities › Caregiver Reviews | OPERATOR, STAFF, ADMIN |
| `/operator` | Operator | Listings | OPERATOR, STAFF, ADMIN | professional (navy) › Communities › Operator | OPERATOR, STAFF, ADMIN |
| `/operator/leads` | Leads | Leads & Inquiries | OPERATOR, STAFF, ADMIN | professional (navy) › Inquiries & Tours › Leads | OPERATOR, STAFF, ADMIN |
| `/operator/inquiries` | My Inquiries | Leads & Inquiries | FAMILY | family (light) › (top level) › My Inquiries | FAMILY |
| `/operator/inquiries` | Home Inquiries | Leads & Inquiries | OPERATOR, STAFF, ADMIN | professional (navy) › Inquiries & Tours › Home Inquiries | OPERATOR, STAFF, ADMIN |
| `/operator/tours` | Tour Requests | Leads & Inquiries | OPERATOR, STAFF, ADMIN | professional (navy) › Inquiries & Tours › Tour Requests | OPERATOR, STAFF, ADMIN |
| `/dashboard/tours` | My Tours | Leads & Inquiries | FAMILY | family (light) › (top level) › Tours | FAMILY |
| `/operator/inquiries/pipeline` | Pipeline Dashboard | Leads & Inquiries | OPERATOR, STAFF, ADMIN | professional (navy) › Inquiries & Tours › Pipeline Dashboard | OPERATOR, STAFF, ADMIN |
| `/dashboard/find-care` | AI Match | AI Tools | FAMILY | family (light) › (top level) › AI Match | FAMILY |
| `/dashboard/find-care` | AI Match | AI Tools | OPERATOR, ADMIN | professional (navy) › Communities › AI Match | OPERATOR, ADMIN |
| `/discharge-planner` | Discharge Planner | AI Tools | DISCHARGE_PLANNER | dischargePlanner (navy) › (top level) › Find Placement | DISCHARGE_PLANNER |
| `/discharge-planner/concierge` | Concierge | AI Tools | DISCHARGE_PLANNER | dischargePlanner (navy) › (top level) › Care Concierge | DISCHARGE_PLANNER |
| `/rides` | My Rides | (top level) | FAMILY | family (light) › More › Rides | FAMILY |
| `/rides` | My Rides | (top level) | PROVIDER | provider (light) › (top level) › Rides | PROVIDER |
| `/background-checks` | Background Checks | (top level) | FAMILY (paid: BACKGROUND_CHECKS) | family (light) › More › Background Checks | FAMILY |
| `/background-checks` | Background Checks | (top level) | OPERATOR, ADMIN (paid: BACKGROUND_CHECKS) | professional (navy) › Operations › Background Checks | OPERATOR, ADMIN |
| `/operator/residents` | Residents | Residents & Family | OPERATOR, STAFF, ADMIN | professional (navy) › (top level) › Residents | OPERATOR, STAFF, ADMIN |
| `/operator/residents` | Residents | Residents & Family | CAREGIVER | caregiver (light) › More › Residents | CAREGIVER |
| `/family` | Family | Residents & Family | FAMILY | family (light) › More › Family | FAMILY |
| `/family` | Family | Residents & Family | OPERATOR, STAFF, ADMIN | professional (navy) › (top level) › Family | OPERATOR, STAFF, ADMIN |
| `/family` | Family | Residents & Family | CAREGIVER | caregiver (light) › More › Family | CAREGIVER |
| `/family` | Family | Residents & Family | DISCHARGE_PLANNER | dischargePlanner (navy) › More › Family | DISCHARGE_PLANNER |
| `/family` | Family | Residents & Family | PROVIDER | provider (light) › More › Family | PROVIDER |
| `/family` | Family | Residents & Family | AFFILIATE | affiliate (light) › More › Family | AFFILIATE |
| `/messages` | Messages | Residents & Family | FAMILY | family (light) › (top level) › Messages | FAMILY |
| `/messages` | Messages | Residents & Family | OPERATOR, STAFF, ADMIN | professional (navy) › (top level) › Messages | OPERATOR, STAFF, ADMIN |
| `/messages` | Messages | Residents & Family | CAREGIVER | caregiver (light) › (top level) › Messages | CAREGIVER |
| `/messages` | Messages | Residents & Family | DISCHARGE_PLANNER | dischargePlanner (navy) › (top level) › Messages | DISCHARGE_PLANNER |
| `/messages` | Messages | Residents & Family | PROVIDER | provider (light) › (top level) › Messages | PROVIDER |
| `/messages` | Messages | Residents & Family | AFFILIATE | affiliate (light) › (top level) › Messages | AFFILIATE |
| `/calendar` | Calendar | Operations | FAMILY | family (light) › More › Calendar | FAMILY |
| `/calendar` | Calendar | Operations | OPERATOR, STAFF, ADMIN | professional (navy) › Operations › Calendar | OPERATOR, STAFF, ADMIN |
| `/calendar` | Calendar | Operations | CAREGIVER | caregiver (light) › More › Calendar | CAREGIVER |
| `/calendar` | Calendar | Operations | DISCHARGE_PLANNER | dischargePlanner (navy) › More › Calendar | DISCHARGE_PLANNER |
| `/calendar` | Calendar | Operations | PROVIDER | provider (light) › More › Calendar | PROVIDER |
| `/calendar` | Calendar | Operations | AFFILIATE | affiliate (light) › More › Calendar | AFFILIATE |
| `/shifts` | Shifts | Operations | CAREGIVER | caregiver (light) › (top level) › Shifts | CAREGIVER |
| `/operator/shifts` | Shifts | Operations | OPERATOR, STAFF, ADMIN | professional (navy) › Staffing › Shifts | OPERATOR, STAFF, ADMIN |
| `/caregiver/points` | My Points | Operations | CAREGIVER | caregiver (light) › More › My Points | CAREGIVER |
| `/operator/oncall` | On-Call AI | Operations | OPERATOR, STAFF, ADMIN | professional (navy) › Staffing › On-Call AI | OPERATOR, STAFF, ADMIN |
| `/operator/documents` | Documents | Operations | OPERATOR, STAFF, ADMIN | professional (navy) › Operations › Documents | OPERATOR, STAFF, ADMIN |
| `/operator/compliance` | Compliance | Operations | OPERATOR, STAFF, ADMIN | professional (navy) › Operations › Compliance | OPERATOR, STAFF, ADMIN |
| `/operator/compliance-kits` | Compliance Kits | Operations | OPERATOR, ADMIN (paid: COMPLIANCE_KITS) | professional (navy) › Operations › Compliance Kits | OPERATOR, ADMIN |
| `/settings/payouts` | Finances | Operations | CAREGIVER | caregiver (light) › (top level) › Earnings | CAREGIVER |
| `/settings/payouts/operator` | Finances | Operations | OPERATOR, STAFF, ADMIN | professional (navy) › Operations › Finances | OPERATOR, STAFF, ADMIN |
| `/reports` | Reports | (top level) | OPERATOR, ADMIN | professional (navy) › Reports & Insights › Reports | OPERATOR, ADMIN |
| `/operator/analytics` | Analytics | (top level) | OPERATOR, ADMIN | professional (navy) › Reports & Insights › Analytics | OPERATOR, ADMIN |
| `/operator/billing` | Billing | (top level) | OPERATOR, ADMIN (paid: OPERATOR_PLANS) | professional (navy) › Operations › Billing | OPERATOR, ADMIN |
| `/settings/provider/billing` | Listing & Billing | (top level) | PROVIDER (paid: PROVIDER_LISTING) | provider (light) › (top level) › Billing | PROVIDER |
| `/settings/provider/credentials` | Credentials | (top level) | PROVIDER | provider (light) › (top level) › Credentials | PROVIDER |
| `/settings/billing` | Pro Membership | (top level) | CAREGIVER (paid: CAREGIVER_PRO) | caregiver (light) › More › Billing | CAREGIVER |
| `/affiliate/dashboard` | Affiliate Dashboard | (top level) | ADMIN | admin (navy) › Admin › Affiliate Dashboard | ADMIN |
| `/affiliate/dashboard` | Affiliate Dashboard | (top level) | AFFILIATE | affiliate (light) › (top level) › Affiliate Dashboard | AFFILIATE |
| `/learn` | Education Hub | (top level) | FAMILY | family (light) › (top level) › Care Resources | FAMILY |
| `/learn` | Education Hub | (top level) | OPERATOR, STAFF, ADMIN | professional (navy) › (top level) › Learn | OPERATOR, STAFF, ADMIN |
| `/learn` | Education Hub | (top level) | CAREGIVER | caregiver (light) › More › Learn | CAREGIVER |
| `/learn` | Education Hub | (top level) | DISCHARGE_PLANNER | dischargePlanner (navy) › (top level) › Learn | DISCHARGE_PLANNER |
| `/learn` | Education Hub | (top level) | PROVIDER | provider (light) › More › Learn | PROVIDER |
| `/learn` | Education Hub | (top level) | AFFILIATE | affiliate (light) › More › Learn | AFFILIATE |
| `/settings` | Settings | Settings | FAMILY | family (light) › (top level) › Account | FAMILY |
| `/settings` | Settings | Settings | OPERATOR, STAFF, ADMIN | professional (navy) › (top level) › Settings | OPERATOR, STAFF, ADMIN |
| `/settings` | Settings | Settings | CAREGIVER | caregiver (light) › (top level) › Settings | CAREGIVER |
| `/settings` | Settings | Settings | DISCHARGE_PLANNER | dischargePlanner (navy) › (top level) › Settings | DISCHARGE_PLANNER |
| `/settings` | Settings | Settings | PROVIDER | provider (light) › (top level) › Settings | PROVIDER |
| `/settings` | Settings | Settings | AFFILIATE | affiliate (light) › (top level) › Settings | AFFILIATE |
| `/admin/users` | User Management | Settings | ADMIN | admin (navy) › Admin › User Management | ADMIN |
| `/admin/operators` | Operators | Settings | ADMIN | admin (navy) › Admin › Operators | ADMIN |
| `/operator/caregivers` (config: `/admin/caregivers`) | Caregivers | Settings | ADMIN | professional (navy) › Communities › Caregivers | ADMIN |
| `/admin/homes` | Homes | Settings | ADMIN | admin (navy) › Admin › Homes | ADMIN |
| `/admin/inquiries` | Inquiries | Settings | ADMIN | admin (navy) › Admin › Inquiries | ADMIN |
| `/admin/affiliates` | Affiliates | Settings | ADMIN | admin (navy) › Admin › Affiliates | ADMIN |
| `/admin/discharge-planners` | Discharge Planners | Settings | ADMIN | admin (navy) › Admin › Discharge Planners | ADMIN |
| `/admin/concierge` | Concierge Queue | Settings | ADMIN | admin (navy) › Admin › Concierge Queue | ADMIN |
| `/admin/concierge/metrics` | Concierge Metrics | Settings | ADMIN | admin (navy) › Admin › Concierge Metrics | ADMIN |
| `/admin/checkout-preflight` | Checkout Preflight | Settings | ADMIN | admin (navy) › Admin › Checkout Preflight | ADMIN |
| `/admin/dp-leads` | DP Leads | Settings | ADMIN | admin (navy) › Admin › DP Leads | ADMIN |
| `/admin/availability-pings` | Availability Pings | Settings | ADMIN | admin (navy) › Admin › Availability Pings | ADMIN |
| `/admin/call-qa` | Call QA | Settings | ADMIN | admin (navy) › Admin › Call QA | ADMIN |
| `/admin/inbound-leads` | Inbound Leads | Settings | ADMIN | admin (navy) › Admin › Inbound Leads | ADMIN |
| `/admin/analytics` | Analytics | Settings | ADMIN | admin (navy) › Admin › Analytics | ADMIN |
| `/admin/audit-logs` | Audit Logs | Settings | ADMIN | admin (navy) › Admin › Audit Logs | ADMIN |
| `/admin/phi-access` | ePHI Access Log | Settings | ADMIN | admin (navy) › Admin › ePHI Access Log | ADMIN |
| `/admin/exports` | Data Exports | Settings | ADMIN | admin (navy) › Admin › Data Exports | ADMIN |
| `/admin/system-health` | System Health | Settings | ADMIN | admin (navy) › Admin › System Health | ADMIN |
| `/admin/tools` | Admin Tools | Settings | ADMIN | admin (navy) › Admin › Admin Tools | ADMIN |
| `/help` | Help | Settings | FAMILY | family (light) › More › Help | FAMILY |
| `/help` | Help | Settings | OPERATOR, STAFF, ADMIN | professional (navy) › (top level) › Help | OPERATOR, STAFF, ADMIN |
| `/help` | Help | Settings | CAREGIVER | caregiver (light) › More › Help | CAREGIVER |
| `/help` | Help | Settings | DISCHARGE_PLANNER | dischargePlanner (navy) › More › Help | DISCHARGE_PLANNER |
| `/help` | Help | Settings | PROVIDER | provider (light) › More › Help | PROVIDER |
| `/help` | Help | Settings | AFFILIATE | affiliate (light) › More › Help | AFFILIATE |
